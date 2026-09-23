document.addEventListener('DOMContentLoaded', function () {
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (!header || !toggle || !nav) return;

  var backdrop = document.createElement('div');
  backdrop.className = 'menu-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.appendChild(backdrop);

  function setMenuOpen(open, restoreFocus) {
    header.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (!open && restoreFocus) toggle.focus();
  }

  setMenuOpen(false, false);

  toggle.addEventListener('click', function () {
    setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true', false);
  });

  backdrop.addEventListener('click', function () {
    setMenuOpen(false, true);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && header.classList.contains('is-open')) {
      setMenuOpen(false, true);
    }
  });

  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) setMenuOpen(false, false);
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 980 && header.classList.contains('is-open')) {
      setMenuOpen(false, false);
    }
  });
});
