(function () {
  const $ = (id) => document.getElementById(id);
  let diagExpanded = false;

  // Year
  const year = $("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Toast helper
  const toast = $("toast");
  let toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("toast--show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("toast--show"), 1800);
  }

  // Theme toggle (system default unless user chooses)
  const themeToggle = $("themeToggle");
  const themeIcon = $("themeIcon");
  const storageKey = "theme";

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function getEffectiveTheme() {
    const forced = document.documentElement.dataset.theme;
    return forced || getSystemTheme();
  }

  function setTheme(theme) {
    // theme: "dark" | "light" | "" (system)
    if (theme) {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem(storageKey, theme);
    } else {
      delete document.documentElement.dataset.theme;
      localStorage.removeItem(storageKey);
    }

    const effective = getEffectiveTheme();
    if (themeIcon) themeIcon.textContent = effective === "dark" ? "☾" : "☀";
  }

  // Init theme
  const saved = localStorage.getItem(storageKey);
  if (saved === "dark" || saved === "light") setTheme(saved);
  else setTheme(""); // system

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = getEffectiveTheme();
      const savedNow = localStorage.getItem(storageKey);

      // UX: system -> opposite -> system
      if (!savedNow) {
        setTheme(current === "dark" ? "light" : "dark");
        showToast("Theme locked");
      } else {
        setTheme("");
        showToast("Theme: system");
      }
    });
  }

  // Copy email
  const copyBtn = $("copyEmail");
  const emailLink = $("emailLink");

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      return false;
    }
  }

  if (copyBtn && emailLink) {
    copyBtn.addEventListener("click", async () => {
      const email = emailLink.textContent.trim();
      const ok = await copyText(email);
      showToast(ok ? "Email copied" : "Copy failed (browser blocked)");
    });
  }
  // Visitor diagnostics
  const diagOut = $("diagOut");
  const pulseOut = $("pulseOut");
  const diagPanel = diagOut?.closest(".diag");
  const pulsePanel = pulseOut?.closest(".diag");

  function shortUA(ua) {
    if (!ua) return "-";
    // Викидаємо дужки з OS/деталями, щоб не роздувало
    const cleaned = String(ua).replace(/\([^)]*\)\s*/g, "");
    return cleaned.length > 80 ? cleaned.slice(0, 80) + "…" : cleaned;
  }

  function renderDiagCompact(parsed) {
    const cf = parsed?.cf || {};
    const br = parsed?.browser || {};
    const lines = [];
    lines.push(`time: ${parsed?.time || "-"}`);
    lines.push(`country: ${cf.country || "-"}`);
    lines.push(`colo: ${cf.colo || "-"}`);
    lines.push(`lang: ${br.acceptLanguage || "-"}`);
    lines.push(`ua: ${shortUA(br.userAgent)}`);
    return lines.join("\n");
  }

  async function loadDiagnostics() {
    if (!diagOut) return;
    const endpoint = diagExpanded ? "/api/whoami?full=1" : "/api/whoami";
    diagOut.textContent = `Loading ${endpoint} ...\n`;
    try {
      const r = await fetch(endpoint, { headers: { Accept: "application/json" } });
      const body = await r.text();

      if (!r.ok) {
        diagOut.textContent = `HTTP ${r.status} ${r.statusText}\n\n${body}`;
        return;
      }

      try {
        const parsed = JSON.parse(body);
        if (diagExpanded) {
          // expanded: show full JSON (includes ray + note)
          diagOut.textContent = JSON.stringify(parsed, null, 2);
        } else {
          // compact: hide ray + note
          diagOut.textContent = renderDiagCompact(parsed);
        }
      } catch (_) {
        // якщо раптом не JSON
        diagOut.textContent = body;
      }
    } catch (_) {
      diagOut.textContent =
        "Failed to load diagnostics. Cloudflare Pages Functions may be unavailable, the path may be wrong, or the network request was blocked.";
    }
  }

  function toggleDiagnostics() {
    diagExpanded = !diagExpanded;
    loadDiagnostics();
  }

  // Ops pulse
  async function loadPulse() {
    if (!pulseOut) return;
    pulseOut.textContent = "Loading /api/pulse ...\n";
    try {
      const r = await fetch("/api/pulse", { headers: { Accept: "application/json" } });
      const body = await r.text();
      if (!r.ok) {
        pulseOut.textContent = `HTTP ${r.status} ${r.statusText}\n\n${body}`;
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch (_) {
        pulseOut.textContent = body;
        return;
      }

      const lines = [];
      lines.push("Provider updates");
      const providers = Array.isArray(parsed.providers) ? parsed.providers : [];
      if (providers.length === 0) lines.push("- Unavailable");
      else {
        const providerOrder = ["AWS", "Google Cloud", "Azure"];
        const iconForStatus = (status) => {
          switch (status) {
            case "ok":
              return "✅";
            case "warn":
              return "⚠️";
            case "down":
              return "❌";
            default:
              return "⬜";
          }
        };
        const ordered = providerOrder
          .map((name) => providers.find((p) => p?.name === name))
          .filter(Boolean);
        const remainder = providers.filter((p) => !providerOrder.includes(p?.name));
        for (const p of [...ordered, ...remainder]) {
          const summary = p?.summary || "Unavailable";
          const updated =
            typeof p?.updated === "string" && p.updated.trim() ? ` (${p.updated})` : "";
          const icon = iconForStatus(p?.status);
          lines.push(`- ${icon} ${p?.name || "Provider"}: ${summary}${updated}`);
        }
      }

      const markets = Array.isArray(parsed.markets) ? parsed.markets : null;
      lines.push("");
      if (!markets) {
        lines.push("Market: disabled (missing API key)");
      } else {
        lines.push("Market (USD)");
        for (const m of markets) {
          const price = typeof m?.price === "number" ? m.price.toFixed(2) : "n/a";
          const change = typeof m?.change === "number" ? m.change.toFixed(2) : "n/a";
          const pct =
            typeof m?.changesPercentage === "number" ? m.changesPercentage.toFixed(2) : "n/a";
          lines.push(`- ${m?.symbol || "TICKER"}: ${price} (${change} / ${pct}%)`);
        }
      }

      lines.push("");
      if (parsed.note) lines.push(parsed.note);
      if (parsed.cache?.ttlSeconds)
        lines.push(`Cache TTL: ${parsed.cache.ttlSeconds}s (server)`);
      lines.push(`Updated: ${parsed.time || "Unknown"}`);

      pulseOut.textContent = lines.join("\n");
    } catch (_) {
      pulseOut.textContent = "Ops pulse temporarily unavailable.";
    }
  }

  loadPulse();
  if (pulseOut && pulsePanel) pulsePanel.addEventListener("click", loadPulse);

  loadDiagnostics();
  if (diagOut && diagPanel) diagPanel.addEventListener("click", toggleDiagnostics);

  // Avatar fallback handling
  const avatar = document.querySelector(".avatar[data-initials]");
  if (avatar) {
    const img = avatar.querySelector(".avatar__img");
    const markLoaded = () => avatar.classList.add("is-loaded");
    if (img) {
      if (img.complete && img.naturalWidth) markLoaded();
      else img.addEventListener("load", markLoaded, { once: true });
      img.addEventListener("error", () => avatar.classList.remove("is-loaded"));
    }
  }
})();
