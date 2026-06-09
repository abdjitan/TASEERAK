/* تسعيرك — Notification bell dropdown. Replaces the static .icon-btn[aria-label] bell.
   Drop <script src="assets/notif.js"></script> before </body>. */
(function () {
  const NOTIFS = [
    { ic: 'offer', t: 'عرض جديد على طلبك', b: 'حديد تسليح Ø16 — مصنع الراجحي', time: 'قبل ٥ دقائق', unread: true },
    { ic: 'accept', t: 'تم قبول عرضك', b: 'مواسير PPR — مؤسسة عمار', time: 'قبل ساعة', unread: true },
    { ic: 'po', t: 'صدر أمر شراء', b: '#PO-2026-0418 بقيمة ١٠٩٬١١٠ ر.س', time: 'قبل ٣ ساعات', unread: true },
    { ic: 'deal', t: 'تأكيد استلام مطلوب', b: 'يرجى تأكيد استلام البضاعة', time: 'أمس', unread: false },
  ];
  const ICONS = {
    offer: ['rgba(245,131,31,.13)', 'var(--orange-dark)', '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>'],
    accept: ['rgba(15,110,86,.12)', 'var(--mech)', '<path d="M20 6L9 17l-5-5"/>'],
    po: ['rgba(27,45,91,.1)', 'var(--navy)', '<path d="M9 2h6l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M9 13l2 2 4-4"/>'],
    deal: ['rgba(124,58,237,.12)', 'var(--arch)', '<path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/>'],
  };
  function init() {
    const bell = document.querySelector('.icon-btn[aria-label="الإشعارات"]');
    if (!bell) return;
    let unread = NOTIFS.filter(n => n.unread).length;
    const wrap = document.createElement('div');
    wrap.className = 'bell-wrap';
    bell.parentNode.insertBefore(wrap, bell);
    wrap.appendChild(bell);
    bell.querySelector('.badge-dot')?.remove();
    const badge = document.createElement('span');
    badge.className = 'bell-badge';
    badge.textContent = unread.toLocaleString('ar-EG');
    if (!unread) badge.style.display = 'none';
    bell.appendChild(badge);

    const dd = document.createElement('div');
    dd.className = 'notif-dd';
    dd.innerHTML = `
      <div class="nh"><h4>الإشعارات</h4><button id="mark-all">تعليم الكل كمقروء</button></div>
      <div class="notif-list">${NOTIFS.map((n, i) => {
        const [bg, col, path] = ICONS[n.ic];
        return `<div class="notif-item ${n.unread ? 'unread' : ''}" data-i="${i}">
          <span class="ni" style="background:${bg};color:${col}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg></span>
          <div style="flex:1"><div class="nt">${n.t}</div><div class="nb">${n.b}</div><div class="ntime">${n.time}</div></div>
          ${n.unread ? '<span class="udot"></span>' : ''}
        </div>`;
      }).join('')}</div>
      <div class="notif-foot"><a href="#">عرض كل الإشعارات</a></div>`;
    wrap.appendChild(dd);

    bell.addEventListener('click', e => { e.stopPropagation(); dd.classList.toggle('show'); });
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) dd.classList.remove('show'); });
    dd.querySelector('#mark-all').addEventListener('click', () => {
      dd.querySelectorAll('.notif-item').forEach(it => { it.classList.remove('unread'); it.querySelector('.udot')?.remove(); });
      unread = 0; badge.style.display = 'none';
    });
    dd.querySelectorAll('.notif-item').forEach(it => it.addEventListener('click', () => {
      if (it.classList.contains('unread')) { it.classList.remove('unread'); it.querySelector('.udot')?.remove(); unread = Math.max(0, unread - 1); badge.textContent = unread.toLocaleString('ar-EG'); if (!unread) badge.style.display = 'none'; }
    }));
  }
  document.readyState !== 'loading' ? init() : document.addEventListener('DOMContentLoaded', init);
})();
