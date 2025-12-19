export async function onRequest({ request }: { request: Request }) {
  const h = request.headers;
  const pick = (name: string) => h.get(name) ?? undefined;

  // Expose only a SAFE subset (no cookies, no auth, no raw IP)
  const cf = {
    ray: pick("cf-ray"),
    colo: pick("cf-colo"),
    country: pick("cf-ipcountry"),
    visitor: pick("cf-visitor"),
  };

  const browser = {
    userAgent: pick("user-agent"),
    acceptLanguage: pick("accept-language"),
    acceptEncoding: pick("accept-encoding"),
    // Client hints (may be absent)
    secChUa: pick("sec-ch-ua"),
    secChUaMobile: pick("sec-ch-ua-mobile"),
    secChUaPlatform: pick("sec-ch-ua-platform"),
    dnt: pick("dnt"),
  };

  const url = new URL(request.url);

  const payload = {
    time: new Date().toISOString(),
    path: url.pathname,
    cf,
    browser,
    note: "Read-only debug snapshot. No storage, no tracking.",
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
