/*
  Solace Float Spa - Interactive Sanctuary Tools

  Three self-contained modules:
    #matchFinder       (index.html)  live float suite recommender
    #costEstimator     (home2.html)  float package fee estimator
    #milestoneTimeline (about.html)  sanctuary story milestones
*/

(function () {
  'use strict';

  // ---------------------------------------------------------------- helpers

  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

  const escapeHTML = (str) => String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const readouts = (root) => {
    const map = {};
    root.querySelectorAll('[data-readout]').forEach(el => {
      map[el.dataset.readout] = el;
    });
    return map;
  };

  function chipGroups(root, onChange) {
    const state = {};

    root.querySelectorAll('[data-group]').forEach(row => {
      const group = row.dataset.group;
      const multi = row.dataset.mode === 'multi';
      const chips = Array.from(row.querySelectorAll('[data-value]'));

      state[group] = multi
        ? chips.filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.dataset.value)
        : (chips.find(c => c.getAttribute('aria-pressed') === 'true') || chips[0]).dataset.value;

      row.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-value]');
        if (!chip || !chips.includes(chip)) return;

        if (multi) {
          const on = chip.getAttribute('aria-pressed') !== 'true';
          chip.setAttribute('aria-pressed', String(on));
          state[group] = chips
            .filter(c => c.getAttribute('aria-pressed') === 'true')
            .map(c => c.dataset.value);
        } else {
          chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
          state[group] = chip.dataset.value;
        }

        onChange(state);
      });
    });

    return state;
  }

  function rangeControl(input, onChange) {
    if (!input) return;

    const paint = () => {
      const min = Number(input.min);
      const pct = ((Number(input.value) - min) / (Number(input.max) - min)) * 100;
      input.style.setProperty('--fill', pct + '%');
    };

    input.addEventListener('input', () => { paint(); onChange(Number(input.value)); });
    paint();
  }

  function animateNumber(el, from, to, format, duration) {
    if (el._raf) cancelAnimationFrame(el._raf);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = format(to);
      return;
    }

    const start = performance.now();
    const span = duration || 550;

    const tick = (now) => {
      const p = Math.min((now - start) / span, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(from + (to - from) * eased);
      if (p < 1) el._raf = requestAnimationFrame(tick);
    };

    el._raf = requestAnimationFrame(tick);
  }

  // ------------------------------------------------- 1. Float Session Recommender

  function initMatchFinder() {
    const root = document.getElementById('matchFinder');
    if (!root) return;

    const img = (id, w) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

    const SUITES = [
      { name: 'Executive Zero-Gravity Pod Suite', area: 'Downtown Sanctuary', board: 'Pod',    fee: 79,  grades: ['early', 'primary', 'middle', 'senior'], strengths: ['academics', 'sports', 'boarding'], rating: 4.9, photo: 'photo-1544161515-4ab6ce6db874' },
      { name: 'Horizon Open Basin Suite',       area: 'Westside Studio',     board: 'Open',   fee: 105, grades: ['early', 'primary', 'middle'],           strengths: ['academics', 'arts'],            rating: 4.95, photo: 'photo-1507652313519-d4e9174996dd' },
      { name: 'Float + Infrared Sauna Ritual',   area: 'Downtown Sanctuary', board: 'Sauna',  fee: 110, grades: ['primary', 'middle', 'senior'],          strengths: ['sports', 'arts', 'boarding'],   rating: 4.88, photo: 'photo-1540555700478-4be289fbecef' },
      { name: 'Couples Sanctuary Double Suite',  area: 'Westside Studio',     board: 'Couples',fee: 140, grades: ['early', 'primary', 'middle', 'senior'], strengths: ['arts', 'academics'],            rating: 4.92, photo: 'photo-1596178065887-1198b6148b2b' },
      { name: 'Red Light & Hydro-Massage Suite', area: 'Downtown Sanctuary', board: 'Pod',    fee: 65,  grades: ['early', 'primary'],                     strengths: ['academics', 'transport'],       rating: 4.75, photo: 'photo-1515377905703-c4788e51af15' },
      { name: 'Deep Rest 90-Min Isolation Pod', area: 'Westside Studio',     board: 'Pod',    fee: 95,  grades: ['middle', 'senior'],                     strengths: ['sports', 'boarding'],           rating: 4.85, photo: 'photo-1519823551278-64ac92734fb1' }
    ];

    const out = readouts(root);
    const budgetInput = root.querySelector('#budgetRange');
    let budget = Number(budgetInput.value);

    const score = (suite, state) => {
      let points = 65;
      if (state.board.length) points += state.board.includes(suite.board) ? 25 : -15;
      const headroom = (budget - suite.fee) / budget;
      points += Math.max(-15, Math.min(15, headroom * 20));
      points += (suite.rating - 4.5) * 10;
      return Math.max(25, Math.min(99, Math.round(points)));
    };

    const render = (state) => {
      const matches = SUITES
        .filter(s => s.fee <= budget)
        .filter(s => !state.board.length || state.board.includes(s.board))
        .map(s => ({ school: s, match: score(s, state) }))
        .sort((a, b) => b.match - a.match);

      out.board.textContent = state.board.length ? state.board.join(', ') : 'Any Suite';
      out.priorities.textContent = state.priority.length
        ? state.priority.length + ' selected'
        : 'Pick any';
      out.budget.textContent = money(budget);
      out.count.textContent = matches.length === 1
        ? '1 Suite Match'
        : matches.length + ' Suite Matches';

      if (!matches.length) {
        out.stage.innerHTML =
          '<div class="empty-state"><i class="ph ph-drop" style="font-size:1.75rem;display:block;margin-bottom:.5rem;"></i>' +
          'No float suites fit those budget constraints. Increase your session budget ceiling.</div>';
        return;
      }

      const [top, ...rest] = matches;

      const hero = `
        <a class="match-hero" href="parent-dashboard.html">
          <img src="${img(top.school.photo, 800)}" alt="${escapeHTML(top.school.name)}">
          <div class="match-hero-top">
            <span class="match-hero-board">${escapeHTML(top.school.board)}</span>
            <div class="match-score" style="--score:${top.match};">
              <span>${top.match}%<small>MATCH</small></span>
            </div>
          </div>
          <div class="match-hero-body">
            <h3>${escapeHTML(top.school.name)}</h3>
            <div class="match-hero-meta">
              <span><i class="ph-fill ph-map-pin"></i> ${escapeHTML(top.school.area)}</span>
              <span><i class="ph-fill ph-star" style="color:#F59E0B;"></i> ${top.school.rating}</span>
              <span><i class="ph ph-drop"></i> ${money(top.school.fee)}/session</span>
            </div>
          </div>
        </a>`;

      const runners = rest.slice(0, 2).map(({ school, match }) => `
        <a class="match-runner" href="parent-dashboard.html">
          <img src="${img(school.photo, 200)}" alt="${escapeHTML(school.name)}" loading="lazy">
          <div class="match-runner-main">
            <div class="name">${escapeHTML(school.name)}</div>
            <div class="meta">${escapeHTML(school.board)} &middot; ${escapeHTML(school.area)} &middot; ${money(school.fee)}</div>
          </div>
          <span class="pct">${match}%</span>
        </a>
      `).join('');

      out.stage.innerHTML = hero + (runners ? `<div class="match-runners">${runners}</div>` : '');
    };

    const state = chipGroups(root, render);
    rangeControl(budgetInput, (value) => { budget = value; render(state); });
    render(state);
  }

  // ---------------------------------------------- 2. Float Package Fee Estimator

  function initCostEstimator() {
    const root = document.getElementById('costEstimator');
    if (!root) return;

    const BOARDS = {
      cbse:  { label: 'Executive Pod', tuition: 79 },
      icse:  { label: 'Open Basin',    tuition: 95 },
      ib:    { label: 'Float + Sauna', tuition: 110 },
      state: { label: 'Couples Suite', tuition: 140 }
    };

    const GRADES = {
      primary: { label: '60 Minutes',  factor: 1.00 },
      middle:  { label: '90 Minutes',  factor: 1.30 },
      senior:  { label: '120 Minutes', factor: 1.60 }
    };

    const CITIES = {
      metro: { label: 'Single Float', factor: 1.00 },
      tier2: { label: '3-Pack Bundle',factor: 0.85 },
      tier3: { label: 'Monthly Pass', factor: 0.70 }
    };

    const ADDONS = {
      transport: { label: 'Infrared Sauna', cost: 35 },
      meals:     { label: 'Red Light',     cost: 25 },
      boarding:  { label: 'Elixir Tea',    cost: 10 }
    };

    const SEGMENTS = [
      { key: 'tuition',   label: 'Float Suite',        color: '#1A6B72' },
      { key: 'admission', label: 'Magnesium & Spa Kit',color: '#52B69A' },
      { key: 'materials', label: 'Lounge Elixir',      color: '#4A9E9B' },
      { key: 'addons',    label: 'Add-ons',            color: '#2563EB' }
    ];

    const out = readouts(root);
    const siblingInput = root.querySelector('#siblingRange');
    let sessions = Number(siblingInput ? siblingInput.value : 1);
    let lastTotal = 0;

    const render = (state) => {
      const board = BOARDS[state.board] || BOARDS.cbse;
      const grade = GRADES[state.grade] || GRADES.primary;
      const city = CITIES[state.city] || CITIES.metro;
      const scale = grade.factor * city.factor;

      const parts = {
        tuition: board.tuition * scale,
        admission: 10,
        materials: 5,
        addons: state.addon ? state.addon.reduce((sum, key) => sum + (ADDONS[key] ? ADDONS[key].cost : 0), 0) : 0
      };

      const perSession = Object.values(parts).reduce((a, b) => a + b, 0);

      const multipliers = [1, 0.90, 0.82, 0.75].slice(0, sessions);
      const gross = perSession * sessions;
      const total = perSession * multipliers.reduce((a, b) => a + b, 0);
      const savings = gross - total;

      out.board.textContent = board.label;
      out.grade.textContent = grade.label;
      out.city.textContent = city.label;
      if (out.children) out.children.textContent = String(sessions);
      if (out.addons) out.addons.textContent = state.addon && state.addon.length
        ? state.addon.map(k => ADDONS[k] ? ADDONS[k].label : k).join(', ')
        : 'None';

      animateNumber(out.total, lastTotal, total, money, 600);
      lastTotal = total;

      if (out.permonth) out.permonth.textContent = `Includes private rain shower & post-float tea lounge across ${sessions} float session(s).`;

      out.bar.innerHTML = SEGMENTS
        .map(seg => `<div class="cost-seg" style="background:${seg.color};" data-key="${seg.key}"></div>`)
        .join('');

      requestAnimationFrame(() => {
        out.bar.querySelectorAll('.cost-seg').forEach(el => {
          const share = gross ? (parts[el.dataset.key] * sessions / gross) * 100 : 0;
          el.style.width = share + '%';
        });
      });

      out.legend.innerHTML = SEGMENTS.map(seg => `
        <div class="cost-legend-item">
          <span class="cost-swatch" style="background:${seg.color};"></span>
          <span>${seg.label}</span>
          <span class="amount">${money(parts[seg.key] * sessions)}</span>
        </div>
      `).join('');

      out.savings.textContent = '−' + money(savings);
      out.savingsnote.textContent = sessions > 1
        ? `${sessions - 1} multi-float discount applied`
        : 'Add multiple floats to save up to 25%';
    };

    const state = chipGroups(root, render);
    rangeControl(siblingInput, (value) => { sessions = value; render(state); });
    render(state);
  }

  // ------------------------------------------------ 3. Milestone Timeline

  function initMilestoneTimeline() {
    const root = document.getElementById('milestoneTimeline');
    if (!root) return;

    const MILESTONES = {
      2019: {
        title: 'Founding of Solace Float Spa',
        body: 'Our founder opened our first sanctuary with two handcrafted isolation float pods, dedicated to introducing the restorative power of zero-gravity sensory deprivation.',
        stats: [['2', 'float pods'], ['1,000 lbs', 'Epsom salt per pod']],
        img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80',
        alt: 'Founding float spa suite'
      },
      2021: {
        title: 'UV & Ozone Filtration Upgrade',
        body: 'Pioneered 100% dual UV and ozone water purification systems between every single guest float, setting the highest hygiene standard in sensory hydrotherapy.',
        stats: [['100%', 'purified water'], ['0', 'chemical odor']],
        img: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=900&q=80',
        alt: 'Pristine float pool water'
      },
      2023: {
        title: 'Infrared & Red Light Integration',
        body: 'Expanded our wellness offerings to include full-spectrum infrared saunas and red light therapy rooms to pair with sensory floatation.',
        stats: [['15,000+', 'floats hosted'], ['4.98/5', 'guest rating']],
        img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80',
        alt: 'Infrared sauna suite'
      },
      2026: {
        title: 'Sanctuary Expansion',
        body: 'Today Solace Float Spa operates premier sanctuaries offering executive pods, open horizon pools, and member sanctuary portals.',
        stats: [['2', 'sanctuary locations'], ['99.4%', 'stress relief rate']],
        img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=900&q=80',
        alt: 'Modern float spa lounge'
      }
    };

    const nodes = Array.from(root.querySelectorAll('.milestone-node'));
    const out = readouts(root);

    const select = (year, focus) => {
      const data = MILESTONES[year];
      if (!data) return;

      nodes.forEach(n => {
        const on = n.dataset.year === String(year);
        n.setAttribute('aria-selected', String(on));
        n.tabIndex = on ? 0 : -1;
        if (on && focus) n.focus();
      });

      out.copy.innerHTML = `
        <span class="eyebrow">${year}</span>
        <h3>${escapeHTML(data.title)}</h3>
        <p style="color: var(--color-text-secondary); font-size: 1.05rem; line-height: 1.7;">${escapeHTML(data.body)}</p>
        <div class="milestone-stats">
          ${data.stats.map(([num, cap]) => `
            <div class="milestone-stat">
              <div class="num">${escapeHTML(num)}</div>
              <div class="cap">${escapeHTML(cap)}</div>
            </div>
          `).join('')}
        </div>
      `;

      out.figure.innerHTML =
        `<img src="${data.img}" alt="${escapeHTML(data.alt)}" loading="lazy">`;

      out.copy.style.animation = 'none';
      void out.copy.offsetWidth;
      out.copy.style.animation = '';
    };

    nodes.forEach(node => {
      node.addEventListener('click', () => select(node.dataset.year, false));

      node.addEventListener('keydown', (e) => {
        const i = nodes.indexOf(node);
        let next = null;

        if (e.key === 'ArrowRight') next = nodes[(i + 1) % nodes.length];
        else if (e.key === 'ArrowLeft') next = nodes[(i - 1 + nodes.length) % nodes.length];
        else if (e.key === 'Home') next = nodes[0];
        else if (e.key === 'End') next = nodes[nodes.length - 1];
        else return;

        e.preventDefault();
        select(next.dataset.year, true);
      });
    });

    const initial = nodes.find(n => n.getAttribute('aria-selected') === 'true') || nodes[0];
    if (initial) select(initial.dataset.year, false);
  }

  // ------------------------------------------------------------------ boot

  document.addEventListener('DOMContentLoaded', () => {
    initMatchFinder();
    initCostEstimator();
    initMilestoneTimeline();
  });
})();
