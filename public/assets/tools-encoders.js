(() => {
  "use strict";

  const dict = {
    en: {
      back: "Back",
      language: "Language",
      title: "Encoders",
      subtitle: "Everything runs locally in your browser.",
      run: "Run",
      swap: "Swap",
      copy: "Copy output",
      clear: "Clear",
      copied: "Copied.",
      err: "Error: ",
    },
    uk: {
      back: "Назад",
      language: "Мова",
      title: "Кодування/декодування",
      subtitle: "Усе працює локально у вашому браузері.",
      run: "Запустити",
      swap: "Поміняти місцями",
      copy: "Копіювати результат",
      clear: "Очистити",
      copied: "Скопійовано.",
      err: "Помилка: ",
    },
  };

  const $ = (id) => document.getElementById(id);
  const $mode = $("mode");
  const $in = $("in");
  const $out = $("out");
  const $msg = $("msg");
  const $run = $("run");
  const $swap = $("swap");
  const $copy = $("copyOut");
  const $clear = $("clear");
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

  function msg(text) {
    $msg.textContent = text || "";
    clearTimeout(msg._t);
    msg._t = setTimeout(() => ($msg.textContent = ""), 2200);
  }

  // Base64 helpers (UTF-8 safe)
  function b64EncodeUtf8(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  }
  function b64DecodeUtf8(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array([...bin].map((c) => c.charCodeAt(0)));
    return new TextDecoder().decode(bytes);
  }

  function toBase64Url(b64) {
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  function fromBase64Url(b64url) {
    let s = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = s.length % 4;
    if (pad) s += "=".repeat(4 - pad);
    return s;
  }

  function run() {
    const input = $in.value || "";
    const mode = $mode.value;

    try {
      let out = "";
      switch (mode) {
        case "b64enc":
          out = b64EncodeUtf8(input);
          break;
        case "b64dec":
          out = b64DecodeUtf8(input.trim());
          break;
        case "b64urlenc":
          out = toBase64Url(b64EncodeUtf8(input));
          break;
        case "b64urldec":
          out = b64DecodeUtf8(fromBase64Url(input.trim()));
          break;
        case "urlenc":
          out = encodeURIComponent(input);
          break;
        case "urldec":
          out = decodeURIComponent(input);
          break;
        case "jsonpretty":
          out = JSON.stringify(JSON.parse(input), null, 2);
          break;
        case "jsonmin":
          out = JSON.stringify(JSON.parse(input));
          break;
        default:
          out = input;
      }
      $out.value = out;
    } catch (e) {
      $out.value = "";
      msg(t("err") + (e && e.message ? e.message : String(e)));
    }
  }

  async function copyOut() {
    const val = $out.value || "";
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      msg(t("copied"));
    } catch {
      $out.focus();
      $out.select();
      try {
        document.execCommand("copy");
        msg(t("copied"));
      } catch {
        msg(t("err") + "copy failed");
      }
    }
  }

  function swap() {
    const a = $in.value;
    $in.value = $out.value;
    $out.value = a;
  }

  function clear() {
    $in.value = "";
    $out.value = "";
  }

  function init() {
    applyI18n();

    $run.addEventListener("click", run);
    $swap.addEventListener("click", swap);
    $copy.addEventListener("click", copyOut);
    $clear.addEventListener("click", clear);

    $langUk.addEventListener("click", () => {
      lang = "uk";
      localStorage.setItem("tools_lang", "uk");
      applyI18n();
      msg("");
    });
    $langEn.addEventListener("click", () => {
      lang = "en";
      localStorage.setItem("tools_lang", "en");
      applyI18n();
      msg("");
    });

    // QoL: Ctrl+Enter runs
    document.addEventListener("keydown", (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") run();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
