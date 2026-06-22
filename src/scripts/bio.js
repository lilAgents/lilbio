// lilBio: write every length of your bio once, keep it saved in the
// browser per profile, and copy the best-fitting version for each
// platform with its character limit checked.

const $ = (s, r = document) => r.querySelector(s);

/* ---------- theme (OS-aware, matches the family) ---------- */
const MOON_SVG = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
const SUN_SVG = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4l1.4-1.4M18 6l1.4-1.4"/></g></svg>';

function setThemeIcon(btn, theme) {
  if (theme === 'dark') { btn.innerHTML = SUN_SVG; btn.setAttribute('aria-label', 'Switch to light mode'); }
  else { btn.innerHTML = MOON_SVG; btn.setAttribute('aria-label', 'Switch to dark mode'); }
}
function initTheme() {
  const btn = $('#ui-theme-btn');
  const current = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  setThemeIcon(btn, current());
  btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('lilbio-theme', next); } catch (e) {}
    setThemeIcon(btn, next);
  });
}

/* ---------- data ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FIELDS = ['name', 'handle', 'link', 'tagline', 'micro', 'short', 'long'];
const STORE_KEY = 'lilbio-v1';

// warn thresholds: the tightest platform that uses each field
const WARN_AT = { tagline: 220, micro: 80, short: 500, long: 0 };

const PLATFORMS = [
  { name: 'TikTok', limit: 80, slot: 'bio' },
  { name: 'Instagram', limit: 150, slot: 'bio' },
  { name: 'X / Twitter', limit: 160, slot: 'bio' },
  { name: 'GitHub', limit: 160, slot: 'bio' },
  { name: 'LinkedIn headline', limit: 220, slot: 'headline' },
  { name: 'Bluesky', limit: 256, slot: 'bio' },
  { name: 'Threads', limit: 500, slot: 'bio' },
  { name: 'YouTube channel description', limit: 1000, slot: 'bio' },
];

let store = { active: 'Default', profiles: { Default: {} } };

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.profiles && Object.keys(parsed.profiles).length) store = parsed;
    }
  } catch (e) {}
  if (!store.profiles[store.active]) store.active = Object.keys(store.profiles)[0];
}
let saveTimer = null;
function saveStore() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
  }, 250);
}

const data = () => store.profiles[store.active];

/* ---------- fit logic ---------- */
const FIELD_LABEL = { long: 'Long bio', short: 'Short bio', micro: 'Micro bio', tagline: 'Tagline' };

function bestFit(platform) {
  const d = data();
  const order = platform.slot === 'headline' ? ['tagline', 'micro'] : ['long', 'short', 'micro', 'tagline'];
  const written = order.filter((f) => (d[f] || '').trim());
  for (const f of written) {
    const text = d[f].trim();
    if (text.length <= platform.limit) return { text, from: FIELD_LABEL[f] };
  }
  if (!written.length) return { empty: true };
  const shortest = written.reduce((a, b) => (d[a].trim().length <= d[b].trim().length ? a : b));
  return { over: d[shortest].trim().length, from: FIELD_LABEL[shortest] };
}

function pressKit() {
  const d = data();
  const lines = [];
  if (d.name) lines.push(d.name);
  if (d.handle) lines.push(d.handle.startsWith('@') ? d.handle : '@' + d.handle);
  if (d.tagline) lines.push(d.tagline);
  if (d.link) lines.push(d.link);
  if (d.short) lines.push('', d.short);
  return lines.join('\n').trim();
}

/* ---------- render ---------- */
function renderCards() {
  const cards = PLATFORMS.map((p, i) => {
    const fit = bestFit(p);
    let body, meta;
    if (fit.empty) {
      body = '<p class="bio-body bio-body--empty">Write a bio on the left and the best fit lands here.</p>';
      meta = `<span class="bio-from">0 / ${p.limit}</span>`;
    } else if (fit.over) {
      body = `<p class="bio-body bio-body--empty">Nothing fits yet: your shortest option (${esc(fit.from)}) is ${fit.over} characters, ${fit.over - p.limit} over this limit.</p>`;
      meta = `<span class="bio-from bio-from--over">${fit.over} / ${p.limit}</span>`;
    } else {
      body = `<p class="bio-body">${esc(fit.text)}</p>`;
      meta = `<span class="bio-from">${fit.text.length} / ${p.limit} &middot; from ${esc(fit.from)}</span>
        <button class="btn btn--sm" data-copy="${i}" type="button">Copy</button>`;
    }
    return `<section class="insp-sec bio-card">
      <h2 class="insp-sec__title">${esc(p.name)} <span class="bio-lim">${p.limit} max</span></h2>
      ${body}
      <div class="bio-meta">${meta}</div>
    </section>`;
  });

  const kit = pressKit();
  cards.push(`<section class="insp-sec bio-card">
    <h2 class="insp-sec__title">Press kit block <span class="bio-lim">name, handle, tagline, link, short bio</span></h2>
    ${kit ? `<p class="bio-body">${esc(kit)}</p>` : '<p class="bio-body bio-body--empty">Fills in as you write: a tidy block to paste into press kits, podcast forms, and speaker pages.</p>'}
    <div class="bio-meta">${kit ? '<span class="bio-from">ready to paste</span><button class="btn btn--sm" data-copy="kit" type="button">Copy</button>' : '<span class="bio-from"></span>'}</div>
  </section>`);

  $('#cards').innerHTML = cards.join('');
}

function renderCounts() {
  const d = data();
  for (const f of ['tagline', 'micro', 'short', 'long']) {
    const el = $('#c-' + f);
    const len = (d[f] || '').length;
    el.textContent = len;
    const warn = WARN_AT[f] && len > WARN_AT[f];
    el.classList.toggle('count--warn', !!warn);
    el.classList.toggle('count--ok', !warn);
  }
}

function fillFields() {
  for (const f of FIELDS) $('#f-' + f).value = data()[f] || '';
  renderCounts();
}

function renderProfiles() {
  $('#profile-sel').innerHTML = Object.keys(store.profiles)
    .map((n) => `<option${n === store.active ? ' selected' : ''}>${esc(n)}</option>`).join('');
}

function renderAll() { renderProfiles(); fillFields(); renderCards(); }

/* ---------- wire-up ---------- */
function initBio() {
  initTheme();
  loadStore();
  renderAll();

  for (const f of FIELDS) {
    $('#f-' + f).addEventListener('input', (e) => {
      data()[f] = e.target.value;
      renderCounts();
      renderCards();
      saveStore();
    });
  }

  $('#cards').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const which = btn.dataset.copy;
    const text = which === 'kit' ? pressKit() : bestFit(PLATFORMS[Number(which)]).text;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1100);
    } catch (err) { /* clipboard blocked; nothing to do */ }
  });

  $('#profile-sel').addEventListener('change', (e) => {
    store.active = e.target.value;
    saveStore();
    fillFields();
    renderCards();
  });
  $('#profile-new').addEventListener('click', () => {
    const name = (window.prompt('Name the new profile (e.g. a client or a second brand):') || '').trim();
    if (!name || store.profiles[name]) return;
    store.profiles[name] = {};
    store.active = name;
    saveStore();
    renderAll();
  });
  $('#profile-del').addEventListener('click', () => {
    const names = Object.keys(store.profiles);
    if (!window.confirm(`Delete the "${store.active}" profile? This cannot be undone.`)) return;
    delete store.profiles[store.active];
    if (!Object.keys(store.profiles).length) store.profiles = { Default: {} };
    store.active = Object.keys(store.profiles)[0];
    saveStore();
    renderAll();
  });

  $('#export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lilbio-profiles.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  $('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed.profiles !== 'object' || !Object.keys(parsed.profiles).length) throw new Error('bad shape');
      Object.assign(store.profiles, parsed.profiles);
      if (parsed.active && store.profiles[parsed.active]) store.active = parsed.active;
      saveStore();
      renderAll();
    } catch (err) {
      window.alert('That file does not look like a lilBio export.');
    }
    e.target.value = '';
  });
}

export { initBio };
