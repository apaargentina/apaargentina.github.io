// APA — main.js

document.addEventListener('DOMContentLoaded', () => {

  // ── Mobile / tablet nav overlay ────────────────────────────────────
  const toggle = document.getElementById('menu-toggle');
  const overlay = document.getElementById('nav-overlay');

  if (toggle && overlay) {
    const closeMenu = () => {
      overlay.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
    };
    const openMenu = () => {
      overlay.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('no-scroll');
    };

    toggle.addEventListener('click', () => {
      const isOpen = overlay.classList.contains('is-open');
      isOpen ? closeMenu() : openMenu();
    });

    overlay.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    // If the viewport grows past the desktop breakpoint while open, reset it
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1100) closeMenu();
    });
  }

  // ── Fade-up on scroll ───────────────────────────────────────────────
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-up').forEach(el => {
    el.style.animationPlayState = 'paused';
    observer.observe(el);
  });

  // ── Carrusel del Home ───────────────────────────────────────────────
  document.querySelectorAll('[data-carousel]').forEach(carousel => {
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const dotsBox = carousel.querySelector('.carousel-dots');
    const prev = carousel.querySelector('.carousel-btn--prev');
    const next = carousel.querySelector('.carousel-btn--next');
    if (!track || slides.length < 2 || !dotsBox) return;

    const dots = Array.from(slides).map((_, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'carousel-dot';
      d.setAttribute('aria-label', 'Ir a la foto ' + (i + 1));
      d.addEventListener('click', () => { stop(); goTo(i); });
      dotsBox.appendChild(d);
      return d;
    });

    const index = () => Math.round(track.scrollLeft / track.clientWidth);
    const goTo = (i) => {
      const n = (i + slides.length) % slides.length;
      track.scrollTo({ left: n * track.clientWidth, behavior: 'smooth' });
    };
    const sync = () => dots.forEach((d, i) => d.classList.toggle('is-active', i === index()));
    track.addEventListener('scroll', sync, { passive: true });
    sync();

    // Pasar fotos solo: se detiene al interactuar, con el mouse encima, y si el
    // visitante pidió menos movimiento en su sistema.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = null, hovering = false;
    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => {
      if (reduceMotion || timer) return;
      timer = setInterval(() => { if (!hovering && !document.hidden) goTo(index() + 1); }, 5000);
    };

    prev.addEventListener('click', () => { stop(); goTo(index() - 1); });
    next.addEventListener('click', () => { stop(); goTo(index() + 1); });
    track.addEventListener('touchstart', stop, { passive: true });
    carousel.addEventListener('mouseenter', () => { hovering = true; });
    carousel.addEventListener('mouseleave', () => { hovering = false; });
    carousel.addEventListener('focusin', stop);
    start();
  });

  // ── Asociate: toggle Socios / Nuevos Socios ───────────────────────
  const memToggle = document.querySelector('[data-membership-toggle]');
  const memGrid = document.getElementById('aranceles');
  if (memToggle && memGrid) {
    const memButtons = memToggle.querySelectorAll('.map-toggle-btn');
    memButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        memGrid.dataset.modo = btn.dataset.modo;
        memButtons.forEach(b => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
    });
  }

  // ── Contacto: botón "Copiar" correo ───────────────────────────────
  const copyStatus = document.querySelector('[data-copy-status]');
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
        document.body.removeChild(ta);
      }
      btn.classList.toggle('is-copied', ok);
      if (copyStatus) copyStatus.textContent = ok ? text + ' copiado al portapapeles' : 'No se pudo copiar: seleccioná el correo y copialo a mano.';
      setTimeout(() => { btn.classList.remove('is-copied'); if (copyStatus) copyStatus.textContent = ''; }, 2200);
    });
  });

  // ── Simple category/year filter (used on the Eventos archive) ─────
  const filterBar = document.querySelector('[data-filters]');
  if (filterBar) {
    const buttons = filterBar.querySelectorAll('.filter-btn');
    const items = document.querySelectorAll('[data-archive-item]');

    const applyFilter = (value) => {
      items.forEach(item => {
        const matches = value === 'all' || (item.dataset.archiveItem || '').includes('|' + value + '|');
        item.classList.toggle('is-visible', matches);
      });
    };

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        applyFilter(btn.dataset.filter);
      });
    });

    applyFilter('all');
  }

});