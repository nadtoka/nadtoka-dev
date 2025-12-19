type ProviderStatus = { name: string; summary: string; updated: string | null };
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

  const azure = await fetchAzure().catch((err) => {
    errors.push(err.message || "Azure fetch failed");
    return { name: "Azure", summary: "Latest bulletin unavailable", updated: null };
  });
  if (azure) providers.push(azure);

  const google = await fetchGoogle().catch((err) => {
    errors.push(err.message || "Google Cloud fetch failed");
    return { name: "Google Cloud", summary: "Latest incident unavailable", updated: null };
  });
  if (google) providers.push(google);

  const aws = await fetchAws().catch((err) => {
    errors.push(err.message || "AWS fetch failed");
    return { name: "AWS", summary: "Latest bulletin unavailable", updated: null };
  });
  if (aws) providers.push(aws);

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
      "cache-control": `public, max-age=${ttlSeconds}`,
    },
  });

  const allUnavailable =
    providers.length > 0 && providers.every((p) => (p.summary || "").toLowerCase().includes("unavailable"));

  if (!isFresh && !allUnavailable) await cache.put(cacheKey, response.clone());
  return response;
}

async function fetchAzure(): Promise<ProviderStatus> {
  const url = "https://azurestatuscdn.azureedge.net/en-us/status/feed/";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Azure status HTTP ${res.status}`);
  const xml = await res.text();
  const item = extractFirstRssItem(xml);
  const summary = item?.title?.replace(/\s+/g, " ").trim();
  return {
    name: "Azure",
    summary: summary || "Latest bulletin unavailable",
    updated: item?.pubDate || null,
  };
}

async function fetchAws(): Promise<ProviderStatus> {
  const url = "https://status.aws.amazon.com/rss/all.rss";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`AWS status HTTP ${res.status}`);
  const xml = await res.text();
  const item = extractFirstRssItem(xml);
  const summary = item?.title?.replace(/\s+/g, " ").trim();
  return {
    name: "AWS",
    summary: summary || "Latest bulletin unavailable",
    updated: item?.pubDate || null,
  };
}

async function fetchGoogle(): Promise<ProviderStatus> {
  const url = "https://status.cloud.google.com/";
  const res = await fetch(url, { cf: { cacheEverything: false } });
  if (!res.ok) throw new Error(`Google Cloud status HTTP ${res.status}`);
  const html = await res.text();

  if (html.includes("No broad severe incidents")) {
    return { name: "Google Cloud", summary: "No broad severe incidents", updated: null };
  }

  return {
    name: "Google Cloud",
    summary: "Active incidents reported (see status dashboard)",
    updated: new Date().toISOString(),
  };
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

function extractFirstRssItem(xmlText: string): { title?: string; pubDate?: string } | null {
  const itemMatch = xmlText.match(/<item[^>]*>([\s\S]*?)<\/item>/i);
  if (!itemMatch) return null;

  const itemContent = itemMatch[1];

  const titleMatch = itemContent.match(
    /<title[^>]*>\s*(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))\s*<\/title>/i
  );
  const pubDateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

  const title = titleMatch ? (titleMatch[1] ?? titleMatch[2])?.trim() : undefined;
  const pubDate = pubDateMatch ? pubDateMatch[1]?.trim() : undefined;

  return title || pubDate ? { title, pubDate } : null;
}
