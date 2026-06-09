/* ============================================================
   تسعيرك — Tweaks panel (vanilla, host-protocol aware)
   Controls: accent color · brand font · background motion · floating chips
   ============================================================ */
(function () {
  const LS = "taseerak_tweaks";
  const DEFAULTS = { accent: "orange", font: "Cairo", motion: "medium", chips: true };
  const ACCENTS = {
    orange: { rgb: "245,131,31", main: "#F5831F", dark: "#d96f15", soft: "#ffb05e", label: "برتقالي" },
    emerald:{ rgb: "15,158,110", main: "#0F9E6E", dark: "#0a7d56", soft: "#5fd6ab", label: "زمردي" },
    blue:   { rgb: "42,111,219", main: "#2A6FDB", dark: "#1f57b0", soft: "#7aa8f0", label: "أزرق" },
    purple: { rgb: "124,58,237", main: "#7c3aed", dark: "#5b21b6", soft: "#b48bf5", label: "بنفسجي" },
  };
  const MOTION = { calm: 0.55, medium: 1, lively: 1.7 };

  let t = load();

  function load() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(LS) || "{}")); }
    catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function save() { localStorage.setItem(LS, JSON.stringify(t)); }

  function apply() {
    const a = ACCENTS[t.accent] || ACCENTS.orange;
    const r = document.documentElement.style;
    r.setProperty("--orange", a.main);
    r.setProperty("--orange-dark", a.dark);
    r.setProperty("--orange-soft", a.soft);
    document.body.style.fontFamily = '"' + t.font + '", "Cairo", sans-serif';
    if (window.setBgAccent) window.setBgAccent(a.rgb); else window.__bgAccent = a.rgb;
    const m = MOTION[t.motion] != null ? MOTION[t.motion] : 1;
    if (window.setBgMotion) window.setBgMotion(m); else window.__bgMotion = m;
    document.querySelectorAll(".float-chip").forEach(c => c.style.display = t.chips ? "" : "none");
  }

  // expose initial bg prefs BEFORE canvas init (script order: this loads first)
  (function preset() {
    const a = ACCENTS[t.accent] || ACCENTS.orange;
    window.__bgAccent = a.rgb;
    window.__bgMotion = MOTION[t.motion] != null ? MOTION[t.motion] : 1;
  })();

  function buildPanel() {
    const el = document.createElement("div");
    el.className = "tw-panel";
    el.innerHTML = `
      <div class="tw-head">
        <div class="tw-title"><span class="tw-dot"></span> لوحة التخصيص</div>
        <button class="tw-x" aria-label="إغلاق">&times;</button>
      </div>
      <div class="tw-body">
        <div class="tw-sec">لون الهوية</div>
        <div class="tw-swatches">
          ${Object.entries(ACCENTS).map(([k, v]) =>
            `<button class="tw-sw ${t.accent === k ? 'on' : ''}" data-accent="${k}" title="${v.label}" style="--c:${v.main}"><span></span></button>`).join("")}
        </div>
        <div class="tw-sec">خط الواجهة</div>
        <div class="tw-seg" data-group="font">
          ${["Cairo", "Tajawal", "Almarai"].map(f =>
            `<button class="${t.font === f ? 'on' : ''}" data-font="${f}" style="font-family:'${f}',sans-serif">${f === 'Cairo' ? 'كايرو' : f === 'Tajawal' ? 'تجوّل' : 'المراعي'}</button>`).join("")}
        </div>
        <div class="tw-sec">حركة الخلفية</div>
        <div class="tw-seg" data-group="motion">
          <button class="${t.motion === 'calm' ? 'on' : ''}" data-motion="calm">هادئة</button>
          <button class="${t.motion === 'medium' ? 'on' : ''}" data-motion="medium">متوسطة</button>
          <button class="${t.motion === 'lively' ? 'on' : ''}" data-motion="lively">حيوية</button>
        </div>
        <div class="tw-row">
          <span>بطاقات عائمة في الهيرو</span>
          <button class="tw-toggle ${t.chips ? 'on' : ''}" data-toggle="chips"><span class="tw-sw2"></span></button>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.querySelector(".tw-x").addEventListener("click", dismiss);
    el.querySelectorAll("[data-accent]").forEach(b => b.addEventListener("click", () => {
      t.accent = b.dataset.accent; el.querySelectorAll("[data-accent]").forEach(x => x.classList.toggle("on", x === b)); commit();
    }));
    el.querySelectorAll("[data-font]").forEach(b => b.addEventListener("click", () => {
      t.font = b.dataset.font; el.querySelectorAll("[data-font]").forEach(x => x.classList.toggle("on", x === b)); commit();
    }));
    el.querySelectorAll("[data-motion]").forEach(b => b.addEventListener("click", () => {
      t.motion = b.dataset.motion; el.querySelectorAll("[data-motion]").forEach(x => x.classList.toggle("on", x === b)); commit();
    }));
    el.querySelector("[data-toggle='chips']").addEventListener("click", (e) => {
      t.chips = !t.chips; e.currentTarget.classList.toggle("on", t.chips); commit();
    });
    return el;
  }

  function commit() {
    apply(); save();
    try { window.parent.postMessage({ type: "__edit_mode_set_keys", edits: t }, "*"); } catch (e) {}
  }

  let panel = null, open = false;
  function show() { if (!panel) panel = buildPanel(); panel.classList.add("show"); open = true; }
  function hide() { if (panel) panel.classList.remove("show"); open = false; }
  function dismiss() { hide(); try { window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); } catch (e) {} }

  // host protocol
  window.addEventListener("message", (e) => {
    const ty = e && e.data && e.data.type;
    if (ty === "__activate_edit_mode") show();
    else if (ty === "__deactivate_edit_mode") hide();
  });

  function boot() {
    apply();
    try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch (e) {}
  }
  document.readyState !== "loading" ? boot() : document.addEventListener("DOMContentLoaded", boot);
})();
