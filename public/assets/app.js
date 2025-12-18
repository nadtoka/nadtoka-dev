(function () {
  const $ = (id) => document.getElementById(id);

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
})();

