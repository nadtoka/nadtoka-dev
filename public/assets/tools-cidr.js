(() => {
  "use strict";

  const dict = {
    en: {
      back: "Back",
      language: "Language",
      title: "CIDR Calculator",
      subtitle: "IPv4 subnet breakdown (offline).",
      calc: "Calculate",
      copy: "Copy",
      note: "Usable hosts exclude network and broadcast (except /31 and /32 have special rules).",
      copied: "Copied.",
      errPrefix: "Error: ",
      fields: {
        input: "Input",
        network: "Network",
        netmask: "Netmask",
        wildcard: "Wildcard",
        broadcast: "Broadcast",
        first: "First usable",
        last: "Last usable",
        total: "Total addresses",
        usable: "Usable hosts",
      },
    },
    uk: {
      back: "Назад",
      language: "Мова",
      title: "CIDR калькулятор",
      subtitle: "Розбір IPv4 підмережі (офлайн).",
      calc: "Порахувати",
      copy: "Копіювати",
      note: "Usable hosts не включає network і broadcast (окрім /31 та /32 — там особливі правила).",
      copied: "Скопійовано.",
      errPrefix: "Помилка: ",
      fields: {
        input: "Ввід",
        network: "Мережа",
        netmask: "Маска",
        wildcard: "Wildcard",
        broadcast: "Broadcast",
        first: "Перший usable",
        last: "Останній usable",
        total: "Всього адрес",
        usable: "Usable hosts",
      },
    },
  };

  const $ = (id) => document.getElementById(id);
  const $cidr = $("cidr");
  const $calc = $("calc");
  const $copy = $("copy");
  const $out = $("out");
  const $error = $("error");
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

  function msgErr(s) {
    $error.textContent = s ? t("errPrefix") + s : "";
  }

  function ipToInt(ip) {
    const parts = ip.split(".").map((x) => Number(x));
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      throw new Error("invalid IPv4");
    }
    // >>>0 keeps unsigned 32-bit
    return (((parts[0] << 24) >>> 0) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }

  function intToIp(n) {
    return [
      (n >>> 24) & 255,
      (n >>> 16) & 255,
      (n >>> 8) & 255,
      n & 255
    ].join(".");
  }

  function maskFromPrefix(prefix) {
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error("invalid prefix");
    if (prefix === 0) return 0 >>> 0;
    return (0xFFFFFFFF << (32 - prefix)) >>> 0;
  }

  function calcCidr(cidrStr) {
    const m = cidrStr.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
    if (!m) throw new Error("expected format x.x.x.x/NN");
    const ip = m[1];
    const prefix = Number(m[2]);

    const ipInt = ipToInt(ip);
    const mask = maskFromPrefix(prefix);
    const wildcard = (~mask) >>> 0;

    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | wildcard) >>> 0;

    const total = prefix === 32 ? 1 : (2 ** (32 - prefix));
    let usable;
    let firstUsable;
    let lastUsable;

    if (prefix === 32) {
      usable = 1;
      firstUsable = network;
      lastUsable = network;
    } else if (prefix === 31) {
      // RFC 3021: two usable addresses, no broadcast/network semantics in point-to-point
      usable = 2;
      firstUsable = network;
      lastUsable = broadcast;
    } else {
      usable = Math.max(total - 2, 0);
      firstUsable = (network + 1) >>> 0;
      lastUsable = (broadcast - 1) >>> 0;
    }

    return {
      input: `${intToIp(ipInt)}/${prefix}`,
      network: intToIp(network),
      netmask: intToIp(mask),
      wildcard: intToIp(wildcard),
      broadcast: intToIp(broadcast),
      first: intToIp(firstUsable),
      last: intToIp(lastUsable),
      total,
      usable,
    };
  }

  function render(res) {
    const f = dict[lang].fields || dict.en.fields;
    const lines = [
      `${f.input}: ${res.input}`,
      `${f.network}: ${res.network}/${res.input.split("/")[1]}`,
      `${f.netmask}: ${res.netmask}`,
      `${f.wildcard}: ${res.wildcard}`,
      `${f.broadcast}: ${res.broadcast}`,
      `${f.first}: ${res.first}`,
      `${f.last}: ${res.last}`,
      `${f.total}: ${res.total}`,
      `${f.usable}: ${res.usable}`,
    ];
    $out.textContent = lines.join("\n");
  }

  async function copyOut() {
    const val = $out.textContent || "";
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      $error.textContent = t("copied");
      setTimeout(() => ($error.textContent = ""), 1800);
    } catch {
      // no hard fail
    }
  }

  function run() {
    msgErr("");
    try {
      const res = calcCidr($cidr.value);
      render(res);
    } catch (e) {
      $out.textContent = "";
      msgErr(e && e.message ? e.message : String(e));
    }
  }

  function init() {
    applyI18n();

    $calc.addEventListener("click", run);
    $copy.addEventListener("click", copyOut);

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

    $cidr.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") run();
    });

    run();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
