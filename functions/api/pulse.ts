type ProviderStatus = {
  name: string;
  summary: string;
  updated: string | null;
  status: "ok" | "warn" | "down" | "unknown";
};
type MarketQuote = { symbol: string; price: number; change: number; changesPercentage: number };

const ttlSeconds = 300;

export async function onRequest({ request, env }: { request: Request; env: { FMP_API_KEY?: string } }) {
  const url = new URL(request.url);
  const isFresh = url.searchParams.get("fresh") === "1";
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  const cached = isFresh ? null : await cache.match(cacheKey);
  if (cached) return cached;

  const providers: ProviderStatus[] = [];
  const errors: string[] = [];

  const aws = await fetchAws().catch((err) => {
    errors.push(err.message || "AWS fetch failed");
    return withStatus("AWS", "Latest bulletin unavailable", null, "unknown");
  });
  if (aws) providers.push(aws);

  const google = await fetchGoogle().catch((err) => {
    errors.push(err.message || "Google Cloud fetch failed");
    return withStatus("Google Cloud", "Latest bulletin unavailable", null, "unknown");
  });
  if (google) providers.push(google);

  const azure = await fetchAzure().catch((err) => {
    errors.push(err.message || "Azure fetch failed");
    return withStatus("Azure", "Latest bulletin unavailable", null, "unknown");
  });
  if (azure) providers.push(azure);

  const [markets, marketNote] = await fetchMarkets(env.FMP_API_KEY).catch((err) => {
    errors.push(err.message || "Market fetch failed");
    return [null, undefined] as const;
  });

  const payload: {
    time: string;
    providers: ProviderStatus[];
    markets: MarketQuote[] | null;
    cache: { ttlSeconds: number };
    note?: string;
  } = {
    time: new Date().toISOString(),
    providers,
    markets,
    cache: { ttlSeconds },
  };

  if (marketNote) payload.note = marketNote;
  if (errors.length) payload.note = payload.note ? `${payload.note} | ${errors.join("; ")}` : errors.join("; ");

  const response = new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": isFresh ? "no-store" : `public, max-age=${ttlSeconds}`,
    },
  });

  const allUnavailable =
    providers.length > 0 && providers.every((p) => (p.summary || "").toLowerCase().includes("unavailable"));

  if (!isFresh && !allUnavailable) await cache.put(cacheKey, response.clone());
  return response;
}

async function fetchAzure(): Promise<ProviderStatus> {
  const url = "https://azurestatuscdn.azureedge.net/en-us/status/feed/";
  const { ok, status, text } = await fetchText(url);

  if (!ok) throw new Error(`Azure status HTTP ${status}`);

  let parsed: ReturnType<typeof parseRssLatest>;
  try {
    parsed = parseRssLatest(text);
  } catch (err) {
    throw new Error(`Azure parse failed: ${(err as Error)?.message || "unknown"}`);
  }

  if (!parsed) return withStatus("Azure", "No recent incidents", null, "ok");

  const summary = normalizeTitle(parsed.title) || "No recent incidents";
  const updated = parsed.updated?.trim() || null;
  return withStatus("Azure", summary, updated, deriveStatus(summary));
}

async function fetchAws(): Promise<ProviderStatus> {
  const url = "https://status.aws.amazon.com/rss/all.rss";
  const { ok, status, text } = await fetchText(url);

  if (!ok) throw new Error(`AWS status HTTP ${status}`);

  let parsed: ReturnType<typeof parseRssLatest>;
  try {
    parsed = parseRssLatest(text);
  } catch (err) {
    throw new Error(`AWS parse failed: ${(err as Error)?.message || "unknown"}`);
  }

  if (!parsed) return withStatus("AWS", "No recent incidents", null, "ok");

  const summary = normalizeTitle(parsed.title) || "No recent incidents";
  const updated = parsed.updated?.trim() || null;
  return withStatus("AWS", summary, updated, deriveStatus(summary));
}

async function fetchGoogle(): Promise<ProviderStatus> {
  const url = "https://status.cloud.google.com/";
  const res = await fetch(url, { cf: { cacheEverything: false } });
  if (!res.ok) throw new Error(`Google Cloud status HTTP ${res.status}`);
  const html = await res.text();

  if (html.includes("No broad severe incidents")) {
    return withStatus("Google Cloud", "No broad severe incidents", null, "ok");
  }

  const summary = "Active incidents reported (see status dashboard)";
  return withStatus("Google Cloud", summary, new Date().toISOString(), deriveStatus(summary));
}

async function fetchMarkets(apiKey?: string): Promise<[MarketQuote[] | null, string?]> {
  const apiKeyTrimmed = apiKey?.trim();
  if (!apiKeyTrimmed) return [null, "Quotes disabled: set FMP_API_KEY in Cloudflare Pages environment variables."];

  const symbols = ["AMZN", "GOOGL", "MSFT"] as const;
  const urls = symbols.map((symbol) => `https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=${apiKeyTrimmed}`);

  const responses = await Promise.all(urls.map((url) => fetch(url)));
  responses.forEach((res, idx) => {
    if (!res.ok) throw new Error(`Markets HTTP ${res.status} for ${symbols[idx]}`);
  });

  const markets = await Promise.all(
    responses.map(async (res, idx) => {
      const data = await res.json();
      const entry = Array.isArray(data) ? data[0] : data;
      return {
        symbol: symbols[idx],
        price: Number(entry?.price) || 0,
        change: Number(entry?.change) || 0,
        changesPercentage: Number(entry?.changesPercentage) || 0,
      } satisfies MarketQuote;
    })
  );

  return [markets];
}

function normalizeTitle(title?: string | null): string {
  if (!title) return "";
  return title.replace(/\s+/g, " ").trim();
}

async function fetchText(url: string): Promise<{ ok: boolean; status: number; contentType: string; text: string }> {
  const res = await fetch(url);
  const contentType = res.headers.get("content-type")?.toLowerCase() || "";
  const text = await res.text();
  return { ok: res.ok, status: res.status, contentType, text };
}

function withStatus(
  name: ProviderStatus["name"],
  summary: ProviderStatus["summary"],
  updated: ProviderStatus["updated"],
  status: ProviderStatus["status"]
): ProviderStatus {
  return { name, summary, updated, status };
}

function deriveStatus(summary: string): ProviderStatus["status"] {
  const lowered = summary.toLowerCase();
  if (/(outage|service disruption|major)/i.test(lowered)) return "down";
  if (/(investigating|degraded|elevated error|partial)/i.test(lowered)) return "warn";
  if (/no broad severe incidents|operational|no recent incidents/i.test(lowered)) return "ok";
  return "unknown";
}

function firstMatch(re: RegExp, s: string): string | null {
  const m = s.match(re);
  return m ? m[1].trim() : null;
}

function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function parseRssLatest(xml: string): { title: string | null; updated: string | null } | null {
  const item = firstMatch(/<item\b[^>]*>([\s\S]*?)<\/item>/i, xml);
  if (item) {
    let title =
      firstMatch(/<title\b[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/title>/i, item) ??
      firstMatch(/<title\b[^>]*>([\s\S]*?)<\/title>/i, item);
    if (title) title = stripCdata(title);
    const pubDate = firstMatch(/<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i, item);
    return { title: title ?? null, updated: pubDate };
  }

  const entry = firstMatch(/<entry\b[^>]*>([\s\S]*?)<\/entry>/i, xml);
  if (entry) {
    const title = firstMatch(/<title\b[^>]*>([\s\S]*?)<\/title>/i, entry);
    const updated =
      firstMatch(/<updated\b[^>]*>([\s\S]*?)<\/updated>/i, entry) ??
      firstMatch(/<published\b[^>]*>([\s\S]*?)<\/published>/i, entry);
    return { title: title?.trim() ?? null, updated };
  }

  return null;
}
