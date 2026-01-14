(() => {
  "use strict";

  const dict = {
    en: {
      back: "Back",
      language: "Language",
      title: "HTTP Helper",
      subtitle: "Status meaning + practical retry hints and backoff calculator.",
      statusBlock: "Status code helper",
      lookup: "Lookup",
      clear: "Clear",
      statusNote: "Tip: for 429/503 check Retry-After header if provided, otherwise use backoff with jitter.",
      backoffBlock: "Retry / backoff calculator",
      baseDelay: "Base delay (ms)",
      factor: "Factor",
      maxDelay: "Max delay (ms)",
      attempts: "Attempts",
      jitter: "Add jitter",
      fullJitter: "Full jitter (recommended)",
      calculate: "Calculate",
      copyPlan: "Copy plan",
      reset: "Reset",
      backoffNote: "Full jitter: sleep = random(0, base * factor^n) capped by max.",
      copied: "Copied.",
      invalidCode: "Enter a valid HTTP status code (100–599).",
      statusUnknown: "Unknown / not in cheat sheet.",
      fields: {
        meaning: "Meaning",
        retry: "Retry guidance",
        typical: "Typical causes",
      },
    },
    uk: {
      back: "Назад",
      language: "Мова",
      title: "HTTP помічник",
      subtitle: "Значення статусів + практичні поради щодо retry і калькулятор backoff.",
      statusBlock: "Підказка по статус-кодах",
      lookup: "Знайти",
      clear: "Очистити",
      statusNote: "Порада: для 429/503 перевір Retry-After, а якщо його нема — використовуй backoff з jitter.",
      backoffBlock: "Калькулятор retry / backoff",
      baseDelay: "Базова затримка (мс)",
      factor: "Множник",
      maxDelay: "Макс. затримка (мс)",
      attempts: "Спроб",
      jitter: "Додати jitter",
      fullJitter: "Full jitter (рекомендовано)",
      calculate: "Порахувати",
      copyPlan: "Копіювати план",
      reset: "Скинути",
      backoffNote: "Full jitter: sleep = random(0, base * factor^n) з лімітом max.",
      copied: "Скопійовано.",
      invalidCode: "Введи коректний HTTP статус (100–599).",
      statusUnknown: "Невідомо / нема в шпаргалці.",
      fields: {
        meaning: "Значення",
        retry: "Поради по retry",
        typical: "Типові причини",
      },
    },
  };

  const statuses = {
    200: {
      meaning_en: "OK",
      meaning_uk: "OK",
      typical_en: "Request succeeded.",
      typical_uk: "Запит успішний.",
      retry_en: "No retry needed.",
      retry_uk: "Retry не потрібен.",
    },
    301: {
      meaning_en: "Moved Permanently",
      meaning_uk: "Переміщено назавжди",
      typical_en: "Permanent redirect (often http→https or canonical host).",
      typical_uk: "Постійний редірект (часто http→https або canonical host).",
      retry_en: "Follow redirect; fix client URL if unexpected.",
      retry_uk: "Йди за редіректом; якщо неочікувано — виправ URL.",
    },
    302: {
      meaning_en: "Found",
      meaning_uk: "Found",
      typical_en: "Temporary redirect.",
      typical_uk: "Тимчасовий редірект.",
      retry_en: "Follow redirect; avoid retry storms.",
      retry_uk: "Йди за редіректом; не роби retry-шторм.",
    },
    400: {
      meaning_en: "Bad Request",
      meaning_uk: "Bad Request",
      typical_en: "Invalid payload, headers, or query parameters.",
      typical_uk: "Некоректний payload/headers/query.",
      retry_en: "Do NOT retry unchanged. Fix request.",
      retry_uk: "Не ретраїти без змін. Виправ запит.",
    },
    401: {
      meaning_en: "Unauthorized",
      meaning_uk: "Unauthorized",
      typical_en: "Missing/invalid auth token.",
      typical_uk: "Немає/некоректний токен.",
      retry_en: "Refresh credentials/token, then retry.",
      retry_uk: "Онови креденшали/токен і тоді ретраї.",
    },
    403: {
      meaning_en: "Forbidden",
      meaning_uk: "Forbidden",
      typical_en: "Auth OK but not allowed (RBAC/ACL/WAF).",
      typical_uk: "Доступ заборонено (RBAC/ACL/WAF).",
      retry_en: "Usually no retry; fix permissions/policy.",
      retry_uk: "Зазвичай без retry; виправ доступ/політику.",
    },
    404: {
      meaning_en: "Not Found",
      meaning_uk: "Not Found",
      typical_en: "Wrong path, resource does not exist.",
      typical_uk: "Невірний шлях або ресурс відсутній.",
      retry_en: "No retry unless eventual consistency is expected.",
      retry_uk: "Без retry, хіба що очікується eventual consistency.",
    },
    409: {
      meaning_en: "Conflict",
      meaning_uk: "Conflict",
      typical_en: "Version conflict, already exists, state mismatch.",
      typical_uk: "Конфлікт версії/стану, вже існує.",
      retry_en: "Retry only if operation is safe/idempotent and conflict is transient.",
      retry_uk: "Ретраї лише якщо safe/idempotent і конфлікт тимчасовий.",
    },
    412: {
      meaning_en: "Precondition Failed",
      meaning_uk: "Precondition Failed",
      typical_en: "ETag / If-Match / If-None-Match mismatch.",
      typical_uk: "ETag / If-Match умови не виконані.",
      retry_en: "Refetch resource, update preconditions, retry.",
      retry_uk: "Перечитай ресурс, онови умови, ретраї.",
    },
    413: {
      meaning_en: "Payload Too Large",
      meaning_uk: "Payload Too Large",
      typical_en: "Request body exceeds limits (proxy/app).",
      typical_uk: "Тіло запиту завелике (proxy/app).",
      retry_en: "No retry; reduce payload or raise limit.",
      retry_uk: "Без retry; зменш payload або підніми ліміт.",
    },
    415: {
      meaning_en: "Unsupported Media Type",
      meaning_uk: "Unsupported Media Type",
      typical_en: "Wrong Content-Type or encoding.",
      typical_uk: "Невірний Content-Type/кодування.",
      retry_en: "Fix Content-Type; no retry unchanged.",
      retry_uk: "Виправ Content-Type; без retry без змін.",
    },
    422: {
      meaning_en: "Unprocessable Entity",
      meaning_uk: "Unprocessable Entity",
      typical_en: "Validation failed (semantic errors).",
      typical_uk: "Валідація не пройшла (семантичні помилки).",
      retry_en: "No retry; fix data.",
      retry_uk: "Без retry; виправ дані.",
    },
    429: {
      meaning_en: "Too Many Requests",
      meaning_uk: "Забагато запитів",
      typical_en: "Rate limit exceeded.",
      typical_uk: "Перевищено rate limit.",
      retry_en: "Check Retry-After; use exponential backoff with jitter.",
      retry_uk: "Перевір Retry-After; використовуй exponential backoff + jitter.",
    },
    500: {
      meaning_en: "Internal Server Error",
      meaning_uk: "Внутрішня помилка сервера",
      typical_en: "Unhandled error in service.",
      typical_uk: "Необроблена помилка в сервісі.",
      retry_en: "Retry only if idempotent; use backoff; alert if persistent.",
      retry_uk: "Ретраї тільки якщо idempotent; backoff; алерт якщо довго.",
    },
    502: {
      meaning_en: "Bad Gateway",
      meaning_uk: "Bad Gateway",
      typical_en: "Proxy/upstream failure (nginx, LB).",
      typical_uk: "Проблема між проксі та апстрімом (nginx, LB).",
      retry_en: "Often transient; safe to retry with backoff.",
      retry_uk: "Часто тимчасово; ретраї з backoff.",
    },
    503: {
      meaning_en: "Service Unavailable",
      meaning_uk: "Сервіс недоступний",
      typical_en: "Overload, maintenance, no healthy upstreams.",
      typical_uk: "Перевантаження, maintenance, нема healthy upstreams.",
      retry_en: "Check Retry-After; retry with backoff + jitter.",
      retry_uk: "Перевір Retry-After; ретраї з backoff + jitter.",
    },
    504: {
      meaning_en: "Gateway Timeout",
      meaning_uk: "Gateway Timeout",
      typical_en: "Upstream timeout (slow backend).",
      typical_uk: "Таймаут до апстріма (повільний бекенд).",
      retry_en: "Retry with backoff; also investigate latency/timeouts.",
      retry_uk: "Ретраї з backoff; паралельно розбирай latency/timeouts.",
    },
  };

  const $ = (id) => document.getElementById(id);

  const $code = $("code");
  const $lookup = $("lookup");
  const $clearCode = $("clearCode");
  const $statusOut = $("statusOut");
  const $msg = $("msg");

  const $base = $("base");
  const $factor = $("factor");
  const $max = $("max");
  const $attempts = $("attempts");
  const $jitter = $("jitter");
  const $fullJitter = $("fullJitter");
  const $calc = $("calc");
  const $copyPlan = $("copyPlan");
  const $reset = $("reset");
  const $plan = $("plan");

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

  function clamp(n, lo, hi) {
    if (!Number.isFinite(n)) return lo;
    return Math.min(hi, Math.max(lo, n));
  }

  function lookupStatus() {
    const raw = ($code.value || "").trim();
    const code = Number(raw);

    if (!Number.isInteger(code) || code < 100 || code > 599) {
      $statusOut.textContent = "";
      toast(t("invalidCode"));
      return;
    }

    const entry = statuses[code];
    const f = dict[lang].fields || dict.en.fields;

    if (!entry) {
      $statusOut.textContent = `${code}\n${t("statusUnknown")}`;
      return;
    }

    const meaning = lang === "uk" ? entry.meaning_uk : entry.meaning_en;
    const typical = lang === "uk" ? entry.typical_uk : entry.typical_en;
    const retry = lang === "uk" ? entry.retry_uk : entry.retry_en;

    $statusOut.textContent =
      `${code} — ${meaning}\n\n` +
      `${f.typical}: ${typical}\n` +
      `${f.retry}: ${retry}\n`;
  }

  function randInt(maxExclusive) {
    if (maxExclusive <= 0) return 0;
    const uint32Max = 0xFFFFFFFF;
    const limit = uint32Max - (uint32Max % maxExclusive);
    const buf = new Uint32Array(1);
    while (true) {
      crypto.getRandomValues(buf);
      const x = buf[0];
      if (x < limit) return x % maxExclusive;
    }
  }

  function calcBackoff() {
    const base = clamp(Number($base.value), 0, 10_000_000);
    const factor = clamp(Number($factor.value), 1, 100);
    const maxDelay = clamp(Number($max.value), 0, 10_000_000);
    const attempts = clamp(Number($attempts.value), 1, 100);

    const addJitter = !!$jitter.checked;
    const full = !!$fullJitter.checked;

    const lines = [];
    let sum = 0;

    for (let i = 0; i < attempts; i++) {
      const raw = base * Math.pow(factor, i);
      const capped = maxDelay ? Math.min(raw, maxDelay) : raw;

      let sleep = capped;
      if (addJitter) {
        if (full) {
          // full jitter: random between 0..capped
          sleep = randInt(Math.floor(capped + 1));
        } else {
          // equal jitter: capped/2 + random(0..capped/2)
          const half = capped / 2;
          sleep = half + randInt(Math.floor(half + 1));
        }
      }

      sleep = Math.max(0, Math.floor(sleep));
      sum += sleep;

      lines.push(
        `#${String(i + 1).padStart(2, "0")}: ${sleep} ms (${(sleep / 1000).toFixed(3)} s)`
      );
    }

    lines.push("");
    lines.push(`Total sleep: ${sum} ms (${(sum / 1000).toFixed(3)} s)`);

    $plan.textContent = lines.join("\n");
  }

  async function copyPlan() {
    const val = $plan.textContent || "";
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      toast(t("copied"));
    } catch {
      toast(t("copied"));
    }
  }

  function reset() {
    $base.value = 500;
    $factor.value = 2;
    $max.value = 30000;
    $attempts.value = 8;
    $jitter.checked = true;
    $fullJitter.checked = true;
    calcBackoff();
  }

  function init() {
    applyI18n();

    $lookup.addEventListener("click", lookupStatus);
    $clearCode.addEventListener("click", () => {
      $code.value = "";
      $statusOut.textContent = "";
      toast("");
    });

    $code.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") lookupStatus();
    });

    $calc.addEventListener("click", calcBackoff);
    $copyPlan.addEventListener("click", copyPlan);
    $reset.addEventListener("click", reset);

    [$base, $factor, $max, $attempts, $jitter, $fullJitter].forEach((x) => {
      x.addEventListener("change", calcBackoff);
      x.addEventListener("input", calcBackoff);
    });

    $langUk.addEventListener("click", () => {
      lang = "uk";
      localStorage.setItem("tools_lang", "uk");
      applyI18n();
      lookupStatus();
      calcBackoff();
    });
    $langEn.addEventListener("click", () => {
      lang = "en";
      localStorage.setItem("tools_lang", "en");
      applyI18n();
      lookupStatus();
      calcBackoff();
    });

    // Init
    calcBackoff();
    $statusOut.textContent = "";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
