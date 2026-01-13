(() => {
  "use strict";

  const dict = {
    en: {
      back: "Back",
      language: "Language",
      title: "Password Generator",
      subtitle: "Crypto-secure randomness (Web Crypto). Generated locally in your browser.",
      resultLabel: "Generated password",
      copy: "Copy",
      generate: "Generate",
      length: "Length",
      lower: "Lowercase (a-z)",
      upper: "Uppercase (A-Z)",
      digits: "Digits (0-9)",
      symbols: "Symbols",
      noAmb: "Exclude ambiguous (O/0, l/1, I)",
      noSim: "Exclude similar ({}[]()/\\`~,;:.)",
      note: "Tip: use 16–24 chars for strong passwords. Prefer a password manager.",
      copied: "Copied to clipboard.",
      failedCopy: "Copy failed. Select and copy manually.",
      pickOne: "Select at least one character set.",
    },
    uk: {
      back: "Назад",
      language: "Мова",
      title: "Генератор паролів",
      subtitle: "Криптостійкий рандом (Web Crypto). Генерується локально у вашому браузері.",
      resultLabel: "Згенерований пароль",
      copy: "Копіювати",
      generate: "Згенерувати",
      length: "Довжина",
      lower: "Малі літери (a-z)",
      upper: "Великі літери (A-Z)",
      digits: "Цифри (0-9)",
      symbols: "Символи",
      noAmb: "Прибрати неоднозначні (O/0, l/1, I)",
      noSim: "Прибрати схожі ({}[]()/\\`~,;:.)",
      note: "Порада: 16–24 символи — хороший мінімум. Краще користуватись менеджером паролів.",
      copied: "Скопійовано в буфер обміну.",
      failedCopy: "Не вдалось скопіювати. Виділіть і скопіюйте вручну.",
      pickOne: "Оберіть хоча б один набір символів.",
    },
  };

  const el = (id) => document.getElementById(id);

  const $out = el("pw-output");
  const $toast = el("toast");
  const $gen = el("gen-btn");
  const $copy = el("copy-btn");
  const $len = el("len");
  const $lenVal = el("len-val");

  const $lower = el("lower");
  const $upper = el("upper");
  const $digits = el("digits");
  const $symbols = el("symbols");
  const $noAmb = el("no-amb");
  const $noSim = el("no-sim");

  const $langUk = el("lang-uk");
  const $langEn = el("lang-en");

  const baseSets = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    symbols: "!@#$%^&*_-+=|?~:;,.<>",
  };

  const ambiguous = new Set(["O", "0", "I", "l", "1"]);
  const similar = new Set(["{", "}", "[", "]", "(", ")", "/", "\\", "`", "~", ",", ";", ":", "."]);

  function getLang() {
    const saved = localStorage.getItem("pw_lang");
    if (saved === "uk" || saved === "en") return saved;
    const nav = (navigator.language || "en").toLowerCase();
    return nav.startsWith("uk") ? "uk" : "en";
  }

  let lang = getLang();

  function t(key) {
    return (dict[lang] && dict[lang][key]) || dict.en[key] || key;
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      node.textContent = t(key);
    });

    if (lang === "uk") {
      $langUk.classList.add("active-lang");
      $langEn.classList.remove("active-lang");
    } else {
      $langEn.classList.add("active-lang");
      $langUk.classList.remove("active-lang");
    }
  }

  function toast(msg) {
    $toast.textContent = msg;
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => ($toast.textContent = ""), 2200);
  }

  function randInt(maxExclusive) {
    if (maxExclusive <= 0) throw new Error("maxExclusive must be > 0");
    const uint32Max = 0xFFFFFFFF;
    const limit = uint32Max - (uint32Max % maxExclusive);
    const buf = new Uint32Array(1);
    while (true) {
      crypto.getRandomValues(buf);
      const x = buf[0];
      if (x < limit) return x % maxExclusive;
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildSet(str) {
    let chars = [...str];

    if ($noAmb.checked) chars = chars.filter((c) => !ambiguous.has(c));
    if ($noSim.checked) chars = chars.filter((c) => !similar.has(c));

    return [...new Set(chars)].join("");
  }

  function generatePassword() {
    const len = Number($len.value);

    const sets = [];
    if ($lower.checked) sets.push(buildSet(baseSets.lower));
    if ($upper.checked) sets.push(buildSet(baseSets.upper));
    if ($digits.checked) sets.push(buildSet(baseSets.digits));
    if ($symbols.checked) sets.push(buildSet(baseSets.symbols));

    const active = sets.filter((s) => s.length > 0);

    if (active.length === 0) {
      toast(t("pickOne"));
      return "";
    }

    const all = active.join("");
    if (!all.length) {
      toast(t("pickOne"));
      return "";
    }

    const result = [];
    for (const s of active) {
      result.push(s[randInt(s.length)]);
    }

    while (result.length < len) {
      result.push(all[randInt(all.length)]);
    }

    shuffle(result);
    return result.join("").slice(0, len);
  }

  function regen() {
    const pw = generatePassword();
    if (pw) $out.value = pw;
  }

  async function copy() {
    const val = $out.value || "";
    if (!val) return;

    try {
      await navigator.clipboard.writeText(val);
      toast(t("copied"));
    } catch {
      $out.focus();
      $out.select();
      try {
        document.execCommand("copy");
        toast(t("copied"));
      } catch {
        toast(t("failedCopy"));
      }
    }
  }

  function init() {
    const style = document.createElement("style");
    style.textContent = `
      .active-lang { outline: 2px solid rgba(255,255,255,.28); }
      input[type="range"] { width: 240px; }
      @media (max-width: 520px) { input[type="range"] { width: 100%; } }
    `;
    document.head.appendChild(style);

    applyI18n();

    $len.addEventListener("input", () => {
      $lenVal.textContent = String($len.value);
    });

    $gen.addEventListener("click", regen);
    $copy.addEventListener("click", copy);

    [$lower, $upper, $digits, $symbols, $noAmb, $noSim].forEach((x) =>
      x.addEventListener("change", regen)
    );
    $len.addEventListener("change", regen);

    $langUk.addEventListener("click", () => {
      lang = "uk";
      localStorage.setItem("pw_lang", "uk");
      applyI18n();
    });

    $langEn.addEventListener("click", () => {
      lang = "en";
      localStorage.setItem("pw_lang", "en");
      applyI18n();
    });

    regen();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
