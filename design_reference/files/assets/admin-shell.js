/* ============================================================
   تسعيرك — Admin shell: injects the shared admin sidebar +
   wires mobile drawer + language pills. Each admin page sets
   <body data-admin-page="overview"> (or users/verify/rfqs/...).
   Markup needed: <div class="app"> <aside id="admin-side" class="sidebar"></aside> ... </div>
   ============================================================ */
(function () {
  if (!document.querySelector('script[data-i18n-auto]')) {
    var s = document.createElement('script'); s.src = 'assets/i18n-auto.js'; s.setAttribute('data-i18n-auto', '1');
    document.head.appendChild(s);
  }
  const ICON = {
    overview: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
    verify: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    rfqs: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
    orders: '<path d="M9 2h6l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M9 13l2 2 4-4"/>',
    materials: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12l8.73-5.04M12 22V12"/>',
    disputes: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h0"/>',
    audit: '<path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/>',
    messages: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  };
  const ITEMS = [
    ['overview', 'نظرة عامة', 'Admin Overview.html'],
    ['users', 'المستخدمون', 'Admin Users.html', '٢٤'],
    ['verify', 'طلبات التوثيق', 'Admin Panel.html', '٥'],
    ['rfqs', 'طلبات التسعير والعروض', 'Admin RFQs.html'],
    ['orders', 'أوامر الشراء والمعاملات', 'Admin Orders.html'],
    ['materials', 'المواد والقطاعات', 'Admin Materials.html'],
    ['disputes', 'البلاغات والنزاعات', 'Admin Disputes.html', '٣'],
    ['messages', 'الرسائل', 'Admin Messages.html', '٢'],
    ['audit', 'سجل التدقيق', 'Admin Audit.html'],
  ];
  function build() {
    const side = document.getElementById('admin-side'); if (!side) return;
    const active = document.body.dataset.adminPage || 'overview';
    const nav = ITEMS.map(([k, label, href, count]) =>
      `<a class="side-item${k === active ? ' on' : ''}" href="${href}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>
        <span>${label}</span>${count ? `<span class="count">${count}</span>` : ''}
      </a>`).join('');
    side.innerHTML = `
      <a href="Taseerak Landing.html" class="logo side-logo">
        <span class="logo-badge"><img src="assets/logo.png" alt="تسعيرك"></span>
        <span class="logo-text"><b style="color:#fff">تسعير</b><i>ك</i></span>
      </a>
      <div class="side-section">الإدارة</div>
      <nav class="side-nav">${nav}</nav>
      <div class="side-foot">
        <div class="side-user"><span class="av" style="background:var(--arch)">إ</span>
        <div><div class="nm">إدارة المنصة</div><div class="rl">مشرف عام</div></div></div>
      </div>`;
  }
  function wire() {
    const app = document.querySelector('.app');
    document.querySelectorAll('.menu-btn').forEach(b => b.addEventListener('click', () => app && app.classList.toggle('nav-open')));
    document.addEventListener('click', e => {
      if (app && app.classList.contains('nav-open') && !e.target.closest('.sidebar') && !e.target.closest('.menu-btn')) app.classList.remove('nav-open');
    });
    document.querySelectorAll('.mini-lang button').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.mini-lang button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); document.documentElement.dir = b.dataset.lang === 'en' ? 'ltr' : 'rtl'; document.documentElement.lang = b.dataset.lang;
    }));
  }
  function init() { build(); wire(); }
  document.readyState !== 'loading' ? init() : document.addEventListener('DOMContentLoaded', init);
})();
