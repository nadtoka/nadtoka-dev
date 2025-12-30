export async function onRequest({ request }: { request: Request }) {
  const h = request.headers;
  const pick = (name: string) => h.get(name) ?? undefined;

  const url = new URL(request.url);
  const full = url.searchParams.get("full") === "1";

  const cfRay = pick("cf-ray");
  // Cloudflare colo is often present as the suffix of cf-ray: "<id>-<COLO>"
  const coloFromRay = cfRay?.split("-").pop();

  // Expose only a SAFE subset (no cookies, no auth, no raw IP)
  const cfCompact = {
    country: pick("cf-ipcountry"),
    // Prefer derived COLO; optional header fallback if it ever exists in this environment
    colo: coloFromRay ?? pick("cf-colo"),
  };

  const cfFull = {
    ...cfCompact,
    ray: cfRay,
    visitor: pick("cf-visitor"),
  };

  const browserCompact = {
    userAgent: pick("user-agent"),
    acceptLanguage: pick("accept-language"),
  };

  const browserFull = {
    ...browserCompact,
    acceptEncoding: pick("accept-encoding"),
    // Client hints (may be absent)
    secChUa: pick("sec-ch-ua"),
    secChUaMobile: pick("sec-ch-ua-mobile"),
    secChUaPlatform: pick("sec-ch-ua-platform"),
    dnt: pick("dnt"),
  };

  const payloadCompact = {
    time: new Date().toISOString(),
    path: url.pathname,
    cf: cfCompact,
    browser: browserCompact,
  };

  const payloadFull = {
    time: new Date().toISOString(),
    path: url.pathname,
    cf: cfFull,
    browser: browserFull,
    note: "Read-only debug snapshot. No storage, no tracking.",
  };

  const payload = full ? payloadFull : payloadCompact;

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
