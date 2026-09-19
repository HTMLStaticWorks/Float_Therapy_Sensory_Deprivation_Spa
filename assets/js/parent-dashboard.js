/*
  Solace Float Spa - Client Sanctuary Dashboard Scripts

  The dashboard is a single document containing many views. A hash router
  swaps which one is on screen, so each sidebar entry behaves like its own
  page (deep-linkable, back/forward aware) without a separate HTML file.
*/

document.addEventListener('DOMContentLoaded', () => {
  // --- Sidebar Toggle (Mobile) ---
  const sidebarToggle = document.getElementById('sidebarToggle');
  const dashboardSidebar = document.getElementById('dashboardSidebar');

  if (sidebarToggle && dashboardSidebar) {
    sidebarToggle.addEventListener('click', () => {
      dashboardSidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth < 992) {
        if (!dashboardSidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
          dashboardSidebar.classList.remove('open');
        }
      }
    });
  }

  // ------------------------------------------------------------- view router

  const views = Array.from(document.querySelectorAll('.dash-view'));

  if (views.length) {
    const navItems = Array.from(document.querySelectorAll('[data-view]'));
    const titleEl = document.getElementById('dashTitle');
    const baseTitle = 'Solace Float Spa';
    const names = views.map(v => v.id.replace(/^view-/, ''));
    const DEFAULT_VIEW = names[0];

    const show = (name, opts) => {
      const target = names.includes(name) ? name : DEFAULT_VIEW;
      const section = document.getElementById('view-' + target);

      views.forEach(v => v.classList.toggle('is-active', v === section));

      const navTarget = section.dataset.nav || target;

      navItems.forEach(a => {
        const on = a.dataset.view === navTarget;
        a.classList.toggle('active', on);
        if (on) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });

      const label = section.dataset.title || target;
      const decoded = new DOMParser().parseFromString(label, 'text/html').body.textContent;
      if (titleEl) titleEl.textContent = decoded;
      document.title = decoded + ' | ' + baseTitle;

      if (dashboardSidebar) dashboardSidebar.classList.remove('open');

      if (opts && opts.userInitiated) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        section.focus({ preventScroll: true });
      }
    };

    const fromHash = (userInitiated) => {
      show((location.hash || '').replace(/^#/, ''), { userInitiated: userInitiated });
    };

    window.addEventListener('hashchange', () => fromHash(true));
    fromHash(false);

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const name = link.getAttribute('href').slice(1);
      if (!names.includes(name)) return;

      if (location.hash === '#' + name) {
        e.preventDefault();
        show(name, { userInitiated: true });
      }
    });
  }

  // ------------------------------------------------- application status tabs

  document.querySelectorAll('[data-filter-group]').forEach(group => {
    const key = group.dataset.filterGroup;
    const tabs = Array.from(group.querySelectorAll('.filter-tab'));
    const body = document.querySelector(`[data-filter-target="${key}"]`);
    const empty = document.querySelector(`[data-filter-empty="${key}"]`);
    if (!body) return;

    const rows = Array.from(body.querySelectorAll('tr'));

    group.addEventListener('click', (e) => {
      const tab = e.target.closest('.filter-tab');
      if (!tab) return;

      tabs.forEach(t => t.setAttribute('aria-pressed', String(t === tab)));

      const want = tab.dataset.filter;
      let shown = 0;

      rows.forEach(row => {
        const match = want === 'all' || row.dataset.status === want;
        row.hidden = !match;
        if (match) shown++;
      });

      if (empty) empty.hidden = shown > 0;
    });
  });

  // ------------------------------------------------------------- messages

  const threadBody = document.querySelector('[data-thread-body]');

  if (threadBody) {
    const THREADS = {
      oakridge: {
        name: 'Downtown Sanctuary Concierge',
        avatar: 'assets/images/float-pod-1.jpg',
        messages: [
          { from: 'them', text: 'Good morning Dr. Jenkins! We have sanitized Suite #02 with medical-grade Epsom solution for your upcoming float.', at: 'Mon 09:14' },
          { from: 'them', text: 'We have reserved Nov 15 at 10:30 AM at the Downtown Sanctuary. Please confirm your arrival time at your earliest convenience.', at: 'Mon 09:15' },
          { from: 'me', text: 'Thank you! Nov 15 at 10:30 AM works perfectly. Please prep binaural audio theta waves.', at: 'Mon 11:02' },
          { from: 'them', text: 'Consider it done! 432Hz Binaural Theta track is queued up. Your session lasts 90 minutes.', at: '2h ago' }
        ]
      },
      stmarys: {
        name: "Guide Alex Rivera",
        avatar: 'assets/images/testimonial-michael.jpg',
        messages: [
          { from: 'them', text: 'Welcome to Solace Spa! I will be your primary float guide for your session.', at: 'Oct 15' },
          { from: 'them', text: 'We added organic lavender aromatherapy and warm freshwater shower prep for your arrival.', at: '1d ago' }
        ]
      },
      dps: {
        name: 'Spa Reception',
        avatar: 'assets/images/solace-logo.svg',
        messages: [
          { from: 'me', text: 'Hello, could you confirm when my monthly Zenith credits renew?', at: 'Oct 12' },
          { from: 'them', text: 'Yes! Your 2 monthly Zenith float credits automatically renew on the 1st of each month.', at: 'Oct 13' },
          { from: 'them', text: 'Thank you — your monthly Zenith renewal has processed successfully.', at: '3d ago' }
        ]
      }
    };

    const items = Array.from(document.querySelectorAll('.msg-item[data-thread]'));
    const nameEl = document.querySelector('[data-thread-name]');
    const avatarEl = document.querySelector('[data-thread-avatar]');
    const form = document.querySelector('[data-thread-form]');
    const input = document.querySelector('[data-thread-input]');

    let current = 'oakridge';

    const bubble = (msg) => {
      const el = document.createElement('div');
      el.className = 'msg-bubble' + (msg.from === 'me' ? ' is-mine' : '');
      el.textContent = msg.text;

      const stamp = document.createElement('span');
      stamp.className = 'stamp';
      stamp.textContent = msg.at;
      el.appendChild(stamp);

      return el;
    };

    const paint = () => {
      const thread = THREADS[current];
      threadBody.innerHTML = '';
      thread.messages.forEach(m => threadBody.appendChild(bubble(m)));
      threadBody.scrollTop = threadBody.scrollHeight;

      if (nameEl) nameEl.textContent = thread.name;
      if (avatarEl) avatarEl.src = thread.avatar;
    };

    items.forEach(item => {
      item.addEventListener('click', () => {
        current = item.dataset.thread;
        items.forEach(i => i.setAttribute('aria-pressed', String(i === item)));

        const dot = item.querySelector('.msg-unread-dot');
        if (dot) dot.remove();

        paint();
      });
    });

    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        THREADS[current].messages.push({ from: 'me', text: text, at: 'Just now' });
        input.value = '';
        paint();
      });
    }

    paint();
  }

  // ------------------------------------------------------- settings switches

  document.querySelectorAll('.switch[role="switch"]').forEach(sw => {
    sw.addEventListener('click', () => {
      sw.setAttribute('aria-pressed', sw.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
  });

  // --------------------------------------------------- shortlist remove/undo

  document.querySelectorAll('.shortlist-fav').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.shortlist-card');
      if (!card) return;

      const removed = card.dataset.removed === 'true';
      card.dataset.removed = String(!removed);
      card.style.opacity = removed ? '' : '0.45';
      btn.innerHTML = removed
        ? '<i class="ph-fill ph-heart"></i>'
        : '<i class="ph ph-heart"></i>';
    });
  });

  // --- Document Upload Mock ---
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => {
    input.addEventListener('change', function(e) {
      if (this.files && this.files.length > 0) {
        const fileName = this.files[0].name;
        const formGroup = this.closest('.form-group');
        if (formGroup) {
          let fileNameDisplay = formGroup.querySelector('.file-name-display');
          if (!fileNameDisplay) {
            fileNameDisplay = document.createElement('div');
            fileNameDisplay.className = 'file-name-display';
            fileNameDisplay.style.marginTop = '0.5rem';
            fileNameDisplay.style.fontSize = '0.875rem';
            fileNameDisplay.style.color = 'var(--color-status-admitted)';
            fileNameDisplay.innerHTML = `<i class="ph ph-check-circle"></i> ${fileName} attached`;
            formGroup.appendChild(fileNameDisplay);
          } else {
            fileNameDisplay.innerHTML = `<i class="ph ph-check-circle"></i> ${fileName} attached`;
          }
        }
      }
    });
  });
});
