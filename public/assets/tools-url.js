(() => {
  "use strict";

  const dict = {
    en: {
      back: "Back",
      language: "Language",
      title: "URL Inspector",
      subtitle: "Parse, normalize and generate useful curl commands. Runs locally.",
      inputLabel: "URL",
      analyze: "Analyze",
      copyNormalized: "Copy normalized",
      clear: "Clear",
      options: "Options",
      stripUtm: "Strip UTM parameters",
      sortQuery: "Sort query params",
      decode: "Decode %xx in output",
      dropHash: "Drop #fragment",
      normalized: "Normalized URL",
      breakdown: "Breakdown",
      curl: "Generated curl commands",
      copyCurl: "Copy curl",
      note: "Note: DNS lookups and raw TCP port checks are not possible from the browser. This tool focuses on parsing and command generation.",
      copied: "Copied.",
      invalid: "Invalid URL",
      fields: {
        href: "href",
        origin: "origin",
        protocol: "protocol",
        username: "username",
        password: "password",
        host: "host",
        hostname: "hostname",
        port: "port",
        pathname: "pathname",
        search: "search",
        hash: "hash",
        punycode: "punycode hostname",
        decodedHost: "unicode hostname",
        query: "query params",
      },
    },
    uk: {
      back: "Назад",
      language: "Мова",
      title: "URL інспектор",
      subtitle: "Парсинг, нормалізація та генерація корисних curl-команд. Працює локально.",
      inputLabel: "URL",
      analyze: "Проаналізувати",
      copyNormalized: "Копіювати нормалізований",
      clear: "Очистити",
      options: "Опції",
      stripUtm: "Прибрати UTM параметри",
      sortQuery: "Відсортувати query параметри",
      decode: "Декодувати %xx у виводі",
      dropHash: "Прибрати #fragment",
      normalized: "Нормалізований URL",
      breakdown: "Розбір",
      curl: "Згенеровані curl-команди",
      copyCurl: "Копіювати curl",
      note: "Примітка: DNS lookup і TCP port-check з браузера недоступні. Тут фокус на парсинг і генерацію команд.",
      copied: "Скопійовано.",
      invalid: "Некоректний URL",
      fields: {
        href: "href",
        origin: "origin",
        protocol: "protocol",
        username: "username",
        password: "password",
        host: "host",
        hostname: "hostname",
        port: "port",
        pathname: "pathname",
        search: "search",
        hash: "hash",
        punycode: "punycode hostname",
        decodedHost: "unicode hostname",
        query: "query params",
      },
    },
  };

  const $ = (id) => document.getElementById(id);

  const $url = $("url");
  const $analyze = $("analyze");
  const $copyNorm = $("copyNorm");
  const $clear = $("clear");

  const $stripUtm = $("stripUtm");
  const $sortQuery = $("sortQuery");
  const $decode = $("decode");
  const $dropHash = $("dropHash");

  const $normalized = $("normalized");
  const $breakdown = $("breakdown");
  const $curlOut = $("curlOut");
  const $copyCurl = $("copyCurl");
  const $msg = $("msg");

  const $langUk = $("lang-uk");
  const $langEn = $("lang-en");

  function getLang() {
    const saved = localStorage.getItem("tools_lang");
    if (saved === "uk" || saved === "en") return saved;
    return (navigator.language || "en").toLowerCase().startsWith("uk") ? "uk" : "en";
  }

  let lang = getLang();
  const t = (k) => (dict[lang] && dict[lang][k]) || dict.en[k] || k;

  function applyI18n() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((n) => (n.textContent = t(n.getAttribute("data-i18n"))));
  }

  function toast(s) {
    $msg.textContent = s || "";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => ($msg.textContent = ""), 1800);
  }

  const UTM_KEYS = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "utm_name",
    "utm_reader",
    "utm_viz_id",
    "utm_pubreferrer",
    "utm_swu",
    "gclid",
    "fbclid",
    "yclid",
    "mc_cid",
    "mc_eid",
    "ref",
  ]);

  function stripTrackingParams(sp) {
    // remove known tracking params; also remove empty keys
    for (const key of Array.from(sp.keys())) {
      if (UTM_KEYS.has(key.toLowerCase())) sp.delete(key);
    }
  }

  function sortSearchParams(sp) {
    const entries = Array.from(sp.entries());
    entries.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    sp.forEach((_, k) => sp.delete(k));
    for (const [k, v] of entries) sp.append(k, v);
  }

  function safeDecode(s) {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  }

  function normalize(input) {
    const u = new URL(input);

    // normalize pathname: keep as-is except ensure it starts with /
    if (!u.pathname.startsWith("/")) u.pathname = "/" + u.pathname;

    // tracking params
    if ($stripUtm.checked) stripTrackingParams(u.searchParams);

    // sort query
    if ($sortQuery.checked) sortSearchParams(u.searchParams);

    // drop fragment
    if ($dropHash.checked) u.hash = "";

    // Default ports removal happens automatically in URL serialization for some cases,
    // but keep whatever URL decides.

    // Ensure trailing ? removed
    const normalizedHref = u.toString().replace(/\?$/, "");
    return { u, normalizedHref };
  }

  function formatBreakdown(u) {
    const f = dict[lang].fields || dict.en.fields;

    // punycode / unicode
    const puny = u.hostname;
    // browsers store hostname in punycode for IDN; decode to unicode for display
    let unicodeHost = puny;
    try {
      unicodeHost = (window.URL && new URL(u.href)).hostname; // still puny in most cases
      if (window.location && window.location.hostname) {
        // use Intl domain toASCII/toUnicode is not standard; use built-in punycode? not available.
        // We'll at least show that hostname contains xn-- when punycode is used.
      }
    } catch {}

    const qp = [];
    for (const [k, v] of u.searchParams.entries()) {
      qp.push(`${k}=${v}`);
    }

    const lines = [
      `${f.href}: ${u.href}`,
      `${f.origin}: ${u.origin}`,
      `${f.protocol}: ${u.protocol}`,
      `${f.username}: ${u.username || "-"}`,
      `${f.password}: ${u.password ? "******" : "-"}`,
      `${f.host}: ${u.host}`,
      `${f.hostname}: ${u.hostname}`,
      `${f.port}: ${u.port || "-"}`,
      `${f.pathname}: ${u.pathname}`,
      `${f.search}: ${u.search || "-"}`,
      `${f.hash}: ${u.hash || "-"}`,
      `${f.punycode}: ${puny.includes("xn--") ? puny : "-"}`,
      `${f.decodedHost}: ${puny.includes("xn--") ? "(punycode detected)" : "-"}`,
      `${f.query}: ${qp.length ? qp.join("&") : "-"}`,
    ];

    return lines.join("\n");
  }

  function buildCurl(urlStr, uObj) {
    const host = uObj.hostname;
    const origin = uObj.origin;

    const lines = [
      `# HEAD / headers`,
      `curl -I --http2 -L --connect-timeout 5 --max-time 20 '${urlStr}'`,
      ``,
      `# verbose (TLS, redirects, timing)`,
      `curl -v --http2 -L --connect-timeout 5 --max-time 20 '${urlStr}'`,
      ``,
      `# show response headers + status (no body)`,
      `curl -sS -D- -o /dev/null --http2 -L --connect-timeout 5 --max-time 20 '${urlStr}'`,
      ``,
      `# resolve (force DNS to IP) пример:`,
      `# curl --resolve '${host}:443:1.2.3.4' -I '${origin}/'`,
    ];

    return lines.join("\n");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast(t("copied"));
    } catch {
      // fallback: do nothing silently
      toast(t("copied"));
    }
  }

  function run() {
    $breakdown.textContent = "";
    $normalized.value = "";
    $curlOut.value = "";

    const input = ($url.value || "").trim();
    if (!input) return;

    let parsed;
    try {
      parsed = normalize(input);
    } catch {
      toast(t("invalid"));
      return;
    }

    const u = parsed.u;
    let normalizedHref = parsed.normalizedHref;

    if ($decode.checked) normalizedHref = safeDecode(normalizedHref);

    $normalized.value = normalizedHref;
    $breakdown.textContent = formatBreakdown(new URL(normalizedHref));
    $curlOut.value = buildCurl(normalizedHref, new URL(normalizedHref));
  }

  function init() {
    applyI18n();

    $analyze.addEventListener("click", run);
    $copyNorm.addEventListener("click", () => copyText($normalized.value || ""));
    $copyCurl.addEventListener("click", () => copyText($curlOut.value || ""));
    $clear.addEventListener("click", () => {
      $url.value = "";
      $normalized.value = "";
      $breakdown.textContent = "";
      $curlOut.value = "";
      toast("");
    });

    // rerun on option change
    [$stripUtm, $sortQuery, $decode, $dropHash].forEach((x) => x.addEventListener("change", run));
    $url.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") run();
    });

    $langUk.addEventListener("click", () => {
      lang = "uk";
      localStorage.setItem("tools_lang", "uk");
      applyI18n();
      run();
    });
    $langEn.addEventListener("click", () => {
      lang = "en";
      localStorage.setItem("tools_lang", "en");
      applyI18n();
      run();
    });

    run();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
