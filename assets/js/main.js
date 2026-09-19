/*
  Solace Float Spa - Main Global Scripts
*/

// Flagged synchronously so the reveal styles only ever apply when JS is live.
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  // --- Theme Toggle ---
  const themeToggles = document.querySelectorAll('.theme-toggle');
  
  // Check for saved theme preference or system preference
  const savedTheme = localStorage.getItem('solace-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    updateThemeIcons('dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    updateThemeIcons('light');
  }

  themeToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('solace-theme', newTheme);
      updateThemeIcons(newTheme);
    });
  });

  function updateThemeIcons(theme) {
    themeToggles.forEach(toggle => {
      if (theme === 'dark') {
        toggle.innerHTML = '<i class="ph ph-sun"></i>';
      } else {
        toggle.innerHTML = '<i class="ph ph-moon"></i>';
      }
    });
  }

  // --- RTL Toggle ---
  const rtlToggles = document.querySelectorAll('.rtl-toggle');
  
  rtlToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const currentDir = document.documentElement.getAttribute('dir');
      if (currentDir === 'rtl') {
        document.documentElement.removeAttribute('dir');
      } else {
        document.documentElement.setAttribute('dir', 'rtl');
      }
    });
  });

  // --- Mobile Drawer ---
  const navToggles = document.querySelectorAll('.nav-toggle');
  const drawerCloses = document.querySelectorAll('.drawer-close');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');

  if (mobileDrawer && drawerOverlay) {
    const openDrawer = () => {
      mobileDrawer.classList.add('open');
      drawerOverlay.classList.add('open');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    };

    const closeDrawer = () => {
      mobileDrawer.classList.remove('open');
      drawerOverlay.classList.remove('open');
      document.body.style.overflow = '';
    };

    navToggles.forEach(toggle => toggle.addEventListener('click', openDrawer));
    drawerCloses.forEach(toggle => toggle.addEventListener('click', closeDrawer));
    drawerOverlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileDrawer.classList.contains('open')) closeDrawer();
    });
  }

  // --- Password reveal ---
  document.querySelectorAll('.password-toggle').forEach(toggle => {
    const field = document.getElementById(toggle.dataset.target);
    if (!field) return;

    toggle.addEventListener('click', () => {
      const revealed = field.type === 'text';
      field.type = revealed ? 'password' : 'text';
      toggle.innerHTML = revealed
        ? '<i class="ph ph-eye"></i>'
        : '<i class="ph ph-eye-slash"></i>';
      toggle.setAttribute('aria-label', revealed ? 'Show password' : 'Hide password');
      toggle.setAttribute('aria-pressed', String(!revealed));
    });
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Navbar elevation on scroll ---
  const navbar = document.querySelector('.navbar');

  if (navbar) {
    let ticking = false;
    const syncNavbar = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 8);
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(syncNavbar);
      }
    }, { passive: true });

    syncNavbar();
  }

  // --- Scroll reveal ---
  // Section headers and card grids opt in automatically; anything else can
  // carry .reveal directly.
  const autoReveal = [
    '.section-header',
    '.board-card',
    '.school-featured-card',
    '.school-card',
    '.step-card',
    '.value-card',
    '.team-card',
    '.timeline-row',
    '.deadline-card',
    '.stats-banner',
    '.interactive-shell',
    '.milestone-timeline',
    '.testimonial-feature',
    '.testimonial-mini'
  ].join(',');

  document.querySelectorAll(autoReveal).forEach(el => el.classList.add('reveal'));

  const revealables = document.querySelectorAll('.reveal');

  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(el => el.classList.add('is-visible'));
  } else {
    // Stagger siblings so grids cascade instead of popping in as one block.
    const seen = new Map();
    revealables.forEach(el => {
      const parent = el.parentElement;
      const index = seen.get(parent) || 0;
      seen.set(parent, index + 1);
      el.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 90}ms`);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    revealables.forEach(el => observer.observe(el));
  }

  // --- Count-up for stat banners ---
  // Reads the rendered text, so markup stays meaningful without JS.
  const counters = document.querySelectorAll('.stat-item h3');

  if (counters.length && !reducedMotion && 'IntersectionObserver' in window) {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        countObserver.unobserve(el);

        const raw = el.textContent.trim();
        const match = raw.match(/([\d.,]+)/);
        if (!match) return;

        const target = parseFloat(match[1].replace(/,/g, ''));
        if (!isFinite(target)) return;

        const decimals = (match[1].split('.')[1] || '').length;
        const start = performance.now();
        const duration = 1400;

        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const value = (target * eased).toFixed(decimals);
          el.textContent = raw.replace(match[1], decimals ? value : Math.round(target * eased).toLocaleString());
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = raw;
        };

        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });

    counters.forEach(el => countObserver.observe(el));
  }

  // --- Back to top ---
  // Injected rather than authored into all twelve pages: the control does
  // nothing without JS, so there is no point shipping dead markup to browsers
  // that cannot use it. Rides the same rAF-throttled scroll pattern as the
  // navbar elevation above.
  const backToTop = document.createElement('button');
  backToTop.type = 'button';
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.innerHTML = '<i class="ph ph-arrow-up" aria-hidden="true"></i>';
  document.body.appendChild(backToTop);

  let topTicking = false;
  const syncBackToTop = () => {
    backToTop.classList.toggle('is-visible', window.scrollY > 400);
    topTicking = false;
  };

  window.addEventListener('scroll', () => {
    if (!topTicking) {
      topTicking = true;
      window.requestAnimationFrame(syncBackToTop);
    }
  }, { passive: true });

  syncBackToTop();

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    // Move focus to the top of the document as well, so keyboard and screen
    // reader users land where the page just scrolled to rather than staying
    // parked on a control that has since faded out.
    const target = document.querySelector('.navbar') || document.body;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});
