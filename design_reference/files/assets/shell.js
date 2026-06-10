/* Shared app-shell behaviour: mobile sidebar toggle + language (translate + dir + persist) */
(function () {
  // auto-load the content translator (covers text without data-i18n)
  if (!document.querySelector('script[data-i18n-auto]')) {
    var s = document.createElement('script'); s.src = 'assets/i18n-auto.js'; s.setAttribute('data-i18n-auto', '1');
    document.head.appendChild(s);
  }
  const LS = "taseerak_applang";
  function ready(fn) { document.readyState !== "loading" ? fn() : document.addEventListener("DOMContentLoaded", fn); }

  function applyLang(lang) {
    const dict = (window.APP_I18N && window.APP_I18N[lang]) || null;
    const dir = dict ? dict._dir : (lang === "en" ? "ltr" : "rtl");
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    if (dict) {
      document.querySelectorAll("[data-i18n]").forEach(el => {
        const k = el.getAttribute("data-i18n");
        if (dict[k] != null) el.textContent = dict[k];
      });
      document.querySelectorAll("[data-i18n-ph]").forEach(el => {
        const k = el.getAttribute("data-i18n-ph");
        if (dict[k] != null) el.setAttribute("placeholder", dict[k]);
      });
    }
    document.querySelectorAll(".mini-lang button").forEach(b => b.classList.toggle("on", b.dataset.lang === lang));
    localStorage.setItem(LS, lang);
  }

  ready(function () {
    const app = document.querySelector(".app");
    document.querySelectorAll(".menu-btn").forEach(b =>
      b.addEventListener("click", () => app && app.classList.toggle("nav-open")));
    document.addEventListener("click", e => {
      if (app && app.classList.contains("nav-open") && !e.target.closest(".sidebar") && !e.target.closest(".menu-btn"))
        app.classList.remove("nav-open");
    });
    document.querySelectorAll(".mini-lang button").forEach(b =>
      b.addEventListener("click", () => applyLang(b.dataset.lang)));

    applyLang(localStorage.getItem(LS) || "ar");
  });
})();
