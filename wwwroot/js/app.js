// ============================================================
// UPTIME STUDENT APP — frontend controller
// Vanilla JavaScript, no build step. All data comes from the
// ASP.NET Core API; nothing is hard-coded business data.
// ============================================================

'use strict';

/* ---------- tiny utilities ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const pad = n => String(n).padStart(2, '0');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const ico = (name, cls = '') => `<svg class="ico ${cls}" aria-hidden="true"><use href="#${name}"></use></svg>`;

const DAYS = [
  { code: 'Mon', label: 'Monday', short: 'Mon', iso: 1 },
  { code: 'Tue', label: 'Tuesday', short: 'Tue', iso: 2 },
  { code: 'Wed', label: 'Wednesday', short: 'Wed', iso: 3 },
  { code: 'Thu', label: 'Thursday', short: 'Thu', iso: 4 },
  { code: 'Fri', label: 'Friday', short: 'Fri', iso: 5 },
  { code: 'Sat', label: 'Saturday', short: 'Sat', iso: 6 },
  { code: 'Sun', label: 'Sunday', short: 'Sun', iso: 7 }
];
const DAY_BY_CODE = Object.fromEntries(DAYS.map(d => [d.code, d]));
const DAY_BY_ISO = Object.fromEntries(DAYS.map(d => [d.iso, d]));

const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => toISO(new Date());
const parseISO = s => {
  const [y, m, d] = String(s ?? '').slice(0, 10).split('-').map(Number);
  return Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)
    ? new Date(y, m - 1, d, 12, 0, 0)
    : new Date(NaN);
};
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = d => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const fmtDate = v => {
  const d = parseISO(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtDateShort = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = v => String(v ?? '').slice(0, 5);
const fmtDuration = mins => {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60 ? `${m % 60}m` : ''}`.trim() : `${m}m`;
};
const money = n => 'N$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const timeToMinutes = v => {
  const [h, m] = String(v ?? '00:00').slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const minutesToTime = n => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const daysUntil = iso => {
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = parseISO(todayISO());
  return Math.round((d - today) / 86400000);
};
const dueMeta = iso => {
  const n = daysUntil(iso);
  if (n === null) return { text: 'No due date', tone: '' };
  if (n < 0) return { text: `${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} overdue`, tone: 'red' };
  if (n === 0) return { text: 'Due today', tone: 'amber' };
  if (n === 1) return { text: 'Due tomorrow', tone: 'amber' };
  return { text: `Due in ${n} days`, tone: '' };
};

function displayName(s) {
  if (!s) return 'Student';
  return s.preferredName || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || 'Student';
}
function initialsOf(s) {
  if (!s) return 'U';
  return (((s.firstName || 'U')[0] || '') + ((s.lastName || '')[0] || '')).toUpperCase() || 'U';
}
function avatarHtml(s, cls = '') {
  return `<span class="avatar ${cls}">${s && s.photoUrl
    ? `<img src="${esc(s.photoUrl)}" alt="">`
    : esc(initialsOf(s))}</span>`;
}
function chipsFor(text, tone = '') {
  return `<span class="chip ${tone}">${esc(text)}</span>`;
}
function emptyState(icon, title, text, action = '') {
  return `<div class="empty">${ico(icon)}<b>${esc(title)}</b>${esc(text)}${action ? `<div style="margin-top:11px">${action}</div>` : ''}</div>`;
}
function statCard(icon, tone, label, value, note = '') {
  return `<div class="stat">
    <div class="stat-top">
      <div>
        <small>${esc(label)}</small>
        <strong>${value}</strong>
        ${note ? `<div class="stat-note">${esc(note)}</div>` : ''}
      </div>
      <span class="stat-icon ${tone}">${ico(icon)}</span>
    </div>
  </div>`;
}
function panel(title, sub, body, actions = '') {
  return `<div class="panel">
    <div class="panel-head">
      <div><h3 class="panel-title">${esc(title)}</h3>${sub ? `<p class="panel-sub">${esc(sub)}</p>` : ''}</div>
      ${actions ? `<div class="panel-actions">${actions}</div>` : ''}
    </div>
    ${body}
  </div>`;
}
function barChart(days) {
  const max = Math.max(1, ...days.map(d => d.minutes || 0));
  return `<div class="bars">${days.map(d => {
    const value = Math.max(0, Number(d.minutes) || 0);
    const height = Math.max(4, Math.round((value / max) * 100));
    const peak = value === max && value > 0 ? 'peak' : '';
    return `<div class="bar-wrap" title="${esc(d.label)}: ${fmtDuration(value)}">
      <span class="bar-value">${value}</span>
      <div class="bar ${peak}" style="height:${height}%"></div>
      <span class="bar-label">${esc(d.label)}</span>
    </div>`;
  }).join('')}</div>`;
}

/* ---------- persistent state ---------- */

const LS = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem('uptime.' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('uptime.' + key, JSON.stringify(value)); } catch { /* storage blocked */ }
  },
  del(key) {
    try { localStorage.removeItem('uptime.' + key); } catch { /* storage blocked */ }
  }
};

const state = {
  students: [],
  student: null,
  page: null,
  classes: [],
  events: [],
  tasks: [],
  expenses: [],
  alarms: [],
  ringtones: [],
  settings: null,
  insights: null,
  dashboard: null,
  apiOffline: false,
  ui: {
    calendarDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    taskView: LS.get('taskView', 'board'),
    taskQuery: '',
    taskPriority: 'All',
    dbTab: 'erd',
    dbTable: null,
    dbSchema: null,
    dbQueryKey: null,
    assignment: null
  }
};

const PAGE_META = {
  Dashboard: { slug: 'dashboard', eyebrow: 'Your personal study space', icon: 'i-grid' },
  Timetable: { slug: 'timetable', eyebrow: 'Weekly class plan', icon: 'i-week' },
  Calendar: { slug: 'calendar', eyebrow: 'Events and calendar sync', icon: 'i-calendar' },
  Tasks: { slug: 'tasks', eyebrow: 'Assignments and to-dos', icon: 'i-check' },
  'Assignment Helper': { slug: 'assignment-helper', eyebrow: 'Plan, research and cite', icon: 'i-wand' },
  Budget: { slug: 'budget', eyebrow: 'Student money', icon: 'i-wallet' },
  'Study Timer': { slug: 'study-timer', eyebrow: 'Focus sessions', icon: 'i-timer' },
  Alarms: { slug: 'alarms', eyebrow: 'Wake up and remember', icon: 'i-bell' },
  'Research Hub': { slug: 'research-hub', eyebrow: 'Credible sources', icon: 'i-globe' },
  'Study Lab': { slug: 'study-lab', eyebrow: 'Study smarter', icon: 'i-bulb' },
  Database: { slug: 'database', eyebrow: 'Live database', icon: 'i-database' },
  'API Workflow': { slug: 'api-workflow', eyebrow: 'REST walkthrough', icon: 'i-api' },
  'Presentation Kit': { slug: 'presentation-kit', eyebrow: 'Demo day', icon: 'i-present' },
  Settings: { slug: 'settings', eyebrow: 'Profile and preferences', icon: 'i-settings' }
};

const PAGE_RENDER = {};
const ACTIONS = {};

function act(name, fn) {
  ACTIONS[name] = async (el, ev) => {
    try { await fn(el, ev); }
    catch (err) { toast(err.message || 'Something went wrong.', 'error'); }
  };
}
function bindForm(target, fn) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (el) el.addEventListener('submit', async ev => {
    ev.preventDefault();
    try { await fn(el, ev); }
    catch (err) { toast(err.message || 'Could not save.', 'error'); }
  });
  return el;
}

/* ---------- API ---------- */

async function api(path, options = {}) {
  const opts = { ...options };
  if (opts.body && !(opts.body instanceof FormData) && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
    opts.headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  }
  const res = await fetch(path, opts);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const text = await res.text();
      if (text) {
        const data = JSON.parse(text);
        msg = data.title || data.detail || data.message
          || (data.errors ? Object.values(data.errors).flat().join(' ') : '')
          || (typeof data === 'string' ? data : msg);
      }
    } catch { /* keep the status message */ }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  const type = res.headers.get('content-type') || '';
  return type.includes('application/json') ? res.json() : res.text();
}

const sid = () => state.student?.id;

/* ---------- theme ---------- */

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  LS.set('theme', next);
  $$('.theme-option').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === next));
}
function toggleTheme() {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}
act('theme-set', el => applyTheme(el.dataset.theme));

/* ---------- toast ---------- */

let toastTimer = null;
function toast(message, kind = '') {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast-message show' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast-message'; }, 3200);
}

/* ---------- modal ---------- */

let modalDismiss = null;

function openModal({ title, subtitle = '', body, footer = '', size = '' }) {
  closeModal();
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-layer">
    <div class="modal-scrim" data-action="modal-close"></div>
    <div class="modal-card ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head">
        <div><h3>${esc(title)}</h3>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
        <button class="modal-close" type="button" data-action="modal-close" aria-label="Close">${ico('i-x')}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>
  </div>`;
  const first = root.querySelector('input:not([type=hidden]), select, textarea');
  if (first) setTimeout(() => first.focus(), 50);
  return root.querySelector('.modal-card');
}

function closeModal() {
  if (modalDismiss) {
    const dismiss = modalDismiss;
    modalDismiss = null;
    dismiss(false);
  }
  const root = $('#modalRoot');
  if (root) root.innerHTML = '';
}

function modalError(card, message) {
  let box = card.querySelector('.modal-error');
  if (!box) {
    box = document.createElement('div');
    box.className = 'modal-error';
    card.querySelector('.modal-body')?.appendChild(box);
  }
  box.textContent = message;
  box.classList.add('show');
}

function askConfirm(title, text, confirmLabel = 'Delete', danger = true) {
  return new Promise(resolve => {
    let settled = false;
    const done = value => {
      if (settled) return;
      settled = true;
      modalDismiss = null;
      resolve(value);
    };
    modalDismiss = done;

    const card = openModal({
      title,
      size: 'narrow',
      body: `<p class="small" style="margin:0">${esc(text)}</p>`,
      footer: `<button class="btn btn-outline-secondary" type="button" id="confirmNo">Cancel</button>
               <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button" id="confirmYes">${esc(confirmLabel)}</button>`
    });
    card.querySelector('#confirmNo').addEventListener('click', () => { modalDismiss = null; closeModal(); done(false); });
    card.querySelector('#confirmYes').addEventListener('click', () => { modalDismiss = null; closeModal(); done(true); });
  });
}

async function copyText(text, label = 'Copied to clipboard') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(label, 'success');
}
act('copy-text', el => copyText(el.dataset.clipboard || '', el.dataset.label || 'Copied to clipboard'));

/* ---------- shell ---------- */

function updateChrome() {
  const s = state.student;
  const name = s ? displayName(s) : 'Student';
  const inst = s ? s.institutionName : 'Your institution';

  ['sideName', 'topName'].forEach(id => { const el = $('#' + id); if (el) el.textContent = name; });
  ['sideInstitution', 'topInstitution'].forEach(id => { const el = $('#' + id); if (el) el.textContent = inst; });
  ['sideAvatar', 'topAvatar'].forEach(id => {
    const el = $('#' + id);
    if (!el) return;
    el.innerHTML = s && s.photoUrl
      ? `<img src="${esc(s.photoUrl)}" alt="">`
      : esc(initialsOf(s));
  });
}

function updateTodayLabel() {
  const el = $('#todayLabel');
  if (el) el.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

async function checkHealth() {
  const el = $('#healthState');
  if (!el) return;
  try {
    const res = await fetch('/health', { cache: 'no-store' });
    if (!res.ok) throw new Error('offline');
    const payload = await res.json();
    const provider = payload.provider === 'PostgreSQL' ? 'PostgreSQL' : 'SQL Server';
    el.className = 'health-pill ok';
    el.innerHTML = `<i></i> API + ${esc(provider)} online`;
    state.apiOffline = false;
  } catch {
    el.className = 'health-pill bad';
    el.innerHTML = '<i></i> API offline';
    state.apiOffline = true;
  }
}

function openDrawer() {
  $('#sidebar')?.classList.add('open');
  $('#scrim')?.classList.add('show');
}
function closeDrawer() {
  $('#sidebar')?.classList.remove('open');
  $('#scrim')?.classList.remove('show');
}

/* ---------- command palette ---------- */

let paletteIndex = 0;
let paletteRows = [];

function paletteEntries() {
  const pages = Object.keys(PAGE_META).map(name => ({
    label: name === 'Database' ? 'Database & ERD' : name,
    section: 'Navigate',
    icon: PAGE_META[name].icon,
    hint: PAGE_META[name].eyebrow,
    run: () => showPage(name)
  }));
  const actions = [
    { label: 'Add a class', section: 'Actions', icon: 'i-plus', hint: 'Timetable', run: () => runAction('add-class') },
    { label: 'Add a calendar event', section: 'Actions', icon: 'i-calendar', hint: 'Calendar', run: () => runAction('new-event') },
    { label: 'Add a task', section: 'Actions', icon: 'i-check', hint: 'Tasks', run: () => runAction('new-task') },
    { label: 'Record an expense', section: 'Actions', icon: 'i-wallet', hint: 'Budget', run: () => runAction('add-expense') },
    { label: 'Create an alarm', section: 'Actions', icon: 'i-bell', hint: 'Alarms', run: () => runAction('new-alarm') },
    { label: 'Open the focus timer', section: 'Actions', icon: 'i-play', hint: 'Study Timer', run: () => showPage('Study Timer') },
    { label: 'Open Swagger API explorer', section: 'Actions', icon: 'i-api', hint: '/swagger', run: () => window.open('/swagger', '_blank') },
    { label: 'Load the classroom demo profile', section: 'Actions', icon: 'i-spark', hint: 'Demo data', run: () => runAction('demo-seed') },
    { label: 'Switch between light and dark', section: 'Actions', icon: 'i-sun', hint: 'Theme', run: () => toggleTheme() },
    { label: 'Download a JSON backup', section: 'Actions', icon: 'i-download', hint: 'Export', run: () => runAction('export-json') }
  ];
  return [...pages, ...actions];
}

function runAction(name) {
  const fn = ACTIONS[name];
  if (fn) fn(null, null);
}

function renderPalette(query) {
  const q = query.trim().toLowerCase();
  const all = paletteEntries();
  const filtered = q
    ? all.filter(item => item.label.toLowerCase().includes(q) || (item.hint || '').toLowerCase().includes(q) || item.section.toLowerCase().includes(q))
    : all;

  paletteIndex = Math.max(0, Math.min(paletteIndex, filtered.length - 1));
  let lastSection = '';
  paletteRows = filtered;

  $('#paletteList').innerHTML = filtered.length
    ? filtered.map((item, index) => {
      const header = item.section !== lastSection ? `<div class="palette-section">${esc(item.section)}</div>` : '';
      lastSection = item.section;
      return `${header}<button class="palette-item ${index === paletteIndex ? 'active' : ''}" data-palette-index="${index}" type="button">
        ${ico(item.icon)}<span>${esc(item.label)}</span><small>${esc(item.hint || '')}</small>
      </button>`;
    }).join('')
    : `<div class="palette-empty">No matching pages or actions.</div>`;
}

function openCommandPalette() {
  $('#commandPalette').hidden = false;
  $('#paletteInput').value = '';
  paletteIndex = 0;
  renderPalette('');
  setTimeout(() => $('#paletteInput').focus(), 30);
}
function closeCommandPalette() {
  $('#commandPalette').hidden = true;
}

function onPaletteKey(ev) {
  if (ev.key === 'ArrowDown') {
    ev.preventDefault();
    paletteIndex = Math.min(paletteRows.length - 1, paletteIndex + 1);
    renderPalette($('#paletteInput').value);
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault();
    paletteIndex = Math.max(0, paletteIndex - 1);
    renderPalette($('#paletteInput').value);
  } else if (ev.key === 'Enter') {
    ev.preventDefault();
    const item = paletteRows[paletteIndex];
    if (item) { closeCommandPalette(); item.run(); }
  }
}

/* ---------- routing ---------- */

function slugOf(name) {
  return PAGE_META[name]?.slug || 'dashboard';
}
function nameFromSlug(slug) {
  return Object.keys(PAGE_META).find(name => PAGE_META[name].slug === slug) || 'Dashboard';
}

async function showPage(name, opts = {}) {
  if (!PAGE_META[name]) name = 'Dashboard';
  state.page = name;

  $$('.nav-link[data-page]').forEach(btn => {
    const active = btn.dataset.page === name;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });

  $('#pageTitle').textContent = name === 'Database' ? 'Database & ERD' : name;
  $('#pageEyebrow').textContent = PAGE_META[name].eyebrow;
  if (opts.pushHash !== false) {
    const hash = '#/' + slugOf(name);
    if (location.hash !== hash) location.hash = hash;
  }
  closeDrawer();

  if (!state.student) { renderOnboarding(); return; }

  const content = $('#content');
  content.innerHTML = `<div class="loading"><div class="spinner"></div>Loading ${esc(name)}…</div>`;

  const render = PAGE_RENDER[name];
  if (!render) {
    content.innerHTML = emptyState('i-alert', 'Page not available', 'Reload the application and try again.');
    return;
  }

  try {
    await render();
  } catch (err) {
    content.innerHTML = `<div class="panel">
      ${emptyState('i-alert', 'Could not load this page', err.message || 'The API did not respond.',
        `<button class="btn btn-primary btn-sm" data-action="retry">${ico('i-refresh')}Try again</button>`)}
    </div>`;
  }
  updateFloatingTimer();
}

function routeFromHash() {
  const slug = location.hash.replace(/^#\/?/, '').split('?')[0];
  const name = slug ? nameFromSlug(slug) : 'Dashboard';
  if (name === state.page) return;
  showPage(name, { pushHash: false });
}

act('retry', () => showPage(state.page || 'Dashboard'));
act('goto', el => showPage(el.dataset.page || 'Dashboard'));

/* ---------- onboarding ---------- */

function renderOnboarding() {
  state.page = 'Onboarding';
  $('#pageTitle').textContent = 'Welcome to Uptime';
  $('#pageEyebrow').textContent = 'Set up your space';

  $('#content').innerHTML = `
    <div class="page-stack">
      ${state.apiOffline ? `<div class="alert-strip">${ico('i-alert')}The API is offline. Start the app with <b>scripts/run.ps1</b> or press F5 in VS Code, then reload.</div>` : ''}
      <div class="onboarding">
        <section class="onboard-hero">
          <p class="eyebrow" style="color:#bcd0ff">UPTIME STUDENT APP</p>
          <h2>Your study life,<br>organised in one place.</h2>
          <p>One profile ties together your timetable, calendar, tasks, budget, alarms and focus sessions — all stored in one database and exposed through a documented REST API.</p>
          <ul>
            <li>${ico('i-check-circle')}Weekly timetable with Google/Outlook calendar sync</li>
            <li>${ico('i-check-circle')}Assignment planner and citation generator</li>
            <li>${ico('i-check-circle')}Budget tracker, alarms and focus timer</li>
            <li>${ico('i-check-circle')}Live ERD, SQL lab and Swagger explorer</li>
          </ul>
        </section>

        <div class="onboard-card">
          <h3 style="margin:0 0 4px;font-size:17px;font-weight:800">Create your student profile</h3>
          <p class="small muted" style="margin:0 0 14px">No login is needed. The profile is stored in your own database.</p>
          <form id="onboardForm">
            <div class="form-grid">
              <div class="field"><label for="obFirst">First name *</label><input class="form-control" id="obFirst" name="firstName" required maxlength="80" placeholder="Lina"></div>
              <div class="field"><label for="obLast">Last name *</label><input class="form-control" id="obLast" name="lastName" required maxlength="80" placeholder="Shilongo"></div>
              <div class="field span-2"><label for="obPref">Preferred name</label><input class="form-control" id="obPref" name="preferredName" maxlength="80" placeholder="How should we greet you?"></div>
              <div class="field span-2"><label for="obInst">Institution *</label><input class="form-control" id="obInst" name="institutionName" required minlength="2" maxlength="150" placeholder="Triumphant College"></div>
              <div class="field span-2"><label for="obMail">Email (optional)</label><input class="form-control" id="obMail" name="email" type="email" maxlength="150" placeholder="you@example.com"></div>
            </div>
            <button class="btn btn-primary w-100" style="margin-top:14px" type="submit">${ico('i-arrow')}Create profile and continue</button>
          </form>

          <div class="divider">or</div>

          <button class="btn btn-outline-primary w-100" type="button" data-action="demo-seed">${ico('i-spark')}Load the classroom demo profile</button>
          <p class="tiny muted" style="margin:8px 0 0">Seeds a full showcase profile: timetable, events, tasks, expenses, alarms and study history.</p>
        </div>
      </div>
    </div>`;

  bindForm('#onboardForm', async el => {
    const data = Object.fromEntries(new FormData(el));
    data.preferredName = data.preferredName?.trim() || null;
    data.email = data.email?.trim() || null;
    const profile = await api('/api/students', { method: 'POST', body: data });
    state.student = profile;
    state.students = [profile];
    LS.set('studentId', profile.id);
    updateChrome();
    toast('Profile created. Welcome to Uptime!', 'success');
    showPage('Dashboard');
  });
}

act('demo-seed', async () => {
  const result = await api('/api/demo/seed', { method: 'POST' });
  state.students = await api('/api/students');
  state.student = state.students.find(s => s.id === result.studentId) || state.students[0] || null;
  if (state.student) LS.set('studentId', state.student.id);
  updateChrome();
  await checkHealth();
  toast(result.message || 'Demo profile loaded.', 'success');
  showPage('Dashboard');
});

/* ---------- dashboard ---------- */

PAGE_RENDER.Dashboard = async function renderDashboard() {
  const [dashboard, insights] = await Promise.all([
    api(`/api/students/${sid()}/dashboard`),
    api(`/api/students/${sid()}/insights`).catch(() => null)
  ]);
  state.dashboard = dashboard;
  state.insights = insights;

  const b = dashboard.budget;
  const budgetPct = b.limit > 0 ? Math.min(100, Math.round((b.spent / b.limit) * 100)) : 0;
  const goal = insights?.studyGoalMinutes || 300;
  const focusPct = insights ? Math.min(100, Math.round((insights.weekMinutes / goal) * 100)) : 0;
  const todayDate = new Date();
  const nextEvent = dashboard.upcomingEvents?.[0];

  const classesBody = dashboard.classes?.length
    ? `<div class="item-list">${dashboard.classes.map(c => `
        <div class="item-row">
          <div class="item-main"><b>${esc(c.course)}</b><small>${esc(c.venue || 'Venue to confirm')}${c.instructor ? ' · ' + esc(c.instructor) : ''}</small></div>
          <div class="item-side">${chipsFor(`${fmtTime(c.startTime)}–${fmtTime(c.endTime)}`, 'blue')}</div>
        </div>`).join('')}</div>`
    : emptyState('i-week', 'No classes today', 'Your timetable is clear. Use the free time for a focus session.',
      `<button class="btn btn-sm btn-outline-primary" data-action="goto" data-page="Timetable">Open timetable</button>`);

  const eventsBody = dashboard.upcomingEvents?.length
    ? `<div class="item-list">${dashboard.upcomingEvents.map(ev => {
      const meta = dueMeta(ev.eventDate);
      return `<div class="item-row">
        <div class="item-main"><b>${esc(ev.title)}</b><small>${esc(ev.description || 'Calendar event')}</small></div>
        <div class="item-side"><span class="tiny muted nowrap">${fmtDate(ev.eventDate)}</span>${meta.tone ? chipsFor(meta.text, meta.tone) : ''}</div>
      </div>`;
    }).join('')}</div>`
    : emptyState('i-calendar', 'Nothing coming up', 'Add an event or import a Google/Outlook calendar.',
      `<button class="btn btn-sm btn-outline-primary" data-action="goto" data-page="Calendar">Open calendar</button>`);

  const studyBars = insights?.days?.length
    ? barChart(insights.days)
    : emptyState('i-timer', 'No study sessions yet', 'Run the focus timer to start building your streak.',
      `<button class="btn btn-sm btn-outline-primary" data-action="goto" data-page="Study Timer">Start focusing</button>`);

  const alert = insights?.overdueTasks
    ? `<div class="alert-strip">${ico('i-alert')}You have <b>${insights.overdueTasks}</b> overdue task${insights.overdueTasks === 1 ? '' : 's'}.
        <button class="btn btn-sm btn-outline-primary" data-action="goto" data-page="Tasks">Review tasks</button></div>`
    : (budgetPct >= 90
      ? `<div class="alert-strip">${ico('i-wallet')}You have used <b>${budgetPct}%</b> of this month's budget.
          <button class="btn btn-sm btn-outline-primary" data-action="goto" data-page="Budget">Check budget</button></div>`
      : '');

  $('#content').innerHTML = `<div class="page-stack">
    <section class="welcome">
      <div class="welcome-copy">
        <p class="eyebrow">${esc(todayDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
        <h2>${esc(dashboard.greeting)}</h2>
        <p>${esc(dashboard.welcome)} You have <b>${dashboard.classes?.length || 0}</b> class${dashboard.classes?.length === 1 ? '' : 'es'} today,
           <b>${dashboard.pendingTasks}</b> open task${dashboard.pendingTasks === 1 ? '' : 's'}
           and <b>${dashboard.enabledAlarms}</b> active alarm${dashboard.enabledAlarms === 1 ? '' : 's'}.</p>
        <div class="welcome-tags">
          <span>${esc(state.student.institutionName)}</span>
          <span>${insights ? `${insights.streakDays}-day study streak` : 'Database live'}</span>
          ${nextEvent ? `<span>Next: ${esc(nextEvent.title)} · ${esc(fmtDate(nextEvent.eventDate))}</span>` : '<span>Calendar clear</span>'}
        </div>
        <div class="hero-actions">
          <button class="btn btn-primary btn-sm" data-action="goto" data-page="Study Timer">${ico('i-play')}Start focus</button>
          <button class="btn btn-outline-primary btn-sm" data-action="new-task">${ico('i-plus')}Add task</button>
          <button class="btn btn-outline-primary btn-sm" data-action="goto" data-page="Calendar">${ico('i-calendar')}Calendar</button>
        </div>
      </div>
      <div class="hero-panel">
        <div class="mini-ring" style="--pct:${focusPct}"><div>${focusPct}%</div></div>
        <div><b>Weekly focus</b><small>${insights ? `${insights.weekMinutes} of ${goal} min` : 'Goal: 300 min'}</small></div>
      </div>
    </section>

    ${alert}

    <div class="stats-grid">
      ${statCard('i-week', '', 'Classes today', dashboard.classes?.length || 0, dashboard.today)}
      ${statCard('i-check', 'amber', 'Open tasks', dashboard.pendingTasks, insights ? `${insights.completedTasks} completed` : 'Across all courses')}
      ${statCard('i-wallet', budgetPct >= 90 ? 'red' : budgetPct >= 70 ? 'amber' : 'green', 'Spent this month', money(b.spent), `${budgetPct}% of ${money(b.limit)}`)}
      ${statCard('i-timer', 'green', 'Study streak', insights ? `${insights.streakDays}d` : '—', insights ? `${fmtDuration(insights.weekMinutes)} this week` : 'Start a session')}
    </div>

    <div class="grid-2">
      ${panel(`Today's timetable`, dashboard.today, classesBody,
        `<button class="btn btn-sm btn-outline-primary" data-action="add-class">${ico('i-plus')}Add class</button>`)}
      ${panel('Upcoming events', 'Next five calendar entries', eventsBody,
        `<button class="btn btn-sm btn-outline-primary" data-action="new-event">${ico('i-plus')}New event</button>`)}
    </div>

    <div class="grid-2 even">
      ${panel('Monthly budget', 'Spending against your own limit', `
        <div class="meter-head"><b>${money(b.spent)} spent</b><span>${money(b.limit)} limit</span></div>
        <div class="progress"><div class="progress-bar ${budgetPct >= 90 ? 'red' : budgetPct >= 70 ? 'amber' : ''}" style="width:${budgetPct}%"></div></div>
        <div class="tiny muted" style="margin-top:7px">${money(Math.max(0, b.remaining))} remaining · ${money(b.limit)} monthly limit</div>
        <div class="hero-actions">
          <button class="btn btn-sm btn-outline-primary" data-action="add-expense">${ico('i-plus')}Record expense</button>
          <button class="btn btn-sm btn-ghost" data-action="goto" data-page="Budget">View budget</button>
        </div>`,
        `<span class="chip ${budgetPct >= 90 ? 'red' : budgetPct >= 70 ? 'amber' : 'green'}">${budgetPct}% used</span>`)}
      ${panel('Focus last 7 days', insights ? `${fmtDuration(insights.totalMinutes)} recorded in total` : 'Study minutes per day', studyBars,
        `<button class="btn btn-sm btn-outline-primary" data-action="goto" data-page="Study Timer">${ico('i-timer')}Timer</button>`)}
    </div>

    ${panel('Quick actions', 'Everything is one click away', `
      <div class="grid-4">
        <button class="btn btn-outline-primary" data-action="add-class">${ico('i-week')}Add class</button>
        <button class="btn btn-outline-primary" data-action="new-event">${ico('i-calendar')}New event</button>
        <button class="btn btn-outline-primary" data-action="goto" data-page="Assignment Helper">${ico('i-wand')}Plan assignment</button>
        <button class="btn btn-outline-primary" data-action="goto" data-page="Database">${ico('i-database')}Live ERD</button>
      </div>`)}
  </div>`;
};

/* ---------- shared helpers for planning pages ---------- */

function refreshPage() {
  if (state.student) showPage(state.page === 'Onboarding' ? 'Dashboard' : state.page, { pushHash: false });
}

function clashHtml(clashes) {
  if (!clashes || !clashes.length) {
    return `<div class="alert-strip good">${ico('i-check-circle')}No clashes detected across classes, events and deadlines.</div>`;
  }
  return `<div class="clash-list">${clashes.map(c => {
    const severity = String(c.severity || 'medium').toLowerCase();
    return `<div class="clash-item">
      <span class="severity-dot ${esc(severity)}"></span>
      <div class="clash-body"><b>${esc(c.title)}</b><small>${esc(c.day)} · ${esc(c.detail)}</small></div>
      <span class="clash-time">${esc(c.start)}–${esc(c.end)}</span>
    </div>`;
  }).join('')}</div>`;
}

/* ---------- timetable ---------- */

PAGE_RENDER.Timetable = async function renderTimetable() {
  const [classes, clashes] = await Promise.all([
    api(`/api/students/${sid()}/classes`),
    api(`/api/students/${sid()}/calendar/clashes`).catch(() => [])
  ]);
  state.classes = classes;

  const weekStart = startOfWeek(new Date());
  const totalMinutes = classes.reduce((sum, c) =>
    sum + Math.max(0, timeToMinutes(c.endTime) - timeToMinutes(c.startTime)), 0);
  const perDay = DAYS.map(day => ({
    day,
    count: classes.filter(c => c.dayOfWeek === day.code).length
  }));
  const busiest = perDay.reduce((a, b) => (b.count > a.count ? b : a), perDay[0]);

  const columns = DAYS.map(day => {
    const items = classes
      .filter(c => c.dayOfWeek === day.code)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    const date = addDays(weekStart, day.iso - 1);
    const isToday = toISO(date) === todayISO();
    return `<div class="day-col ${isToday ? 'today' : ''}">
      <div class="day-head"><b>${day.short}</b><small>${date.getDate()} ${date.toLocaleDateString('en-GB', { month: 'short' })}</small></div>
      ${items.length
        ? items.map(c => `<div class="class-card" data-action="edit-class" data-id="${c.id}" role="button" tabindex="0">
            <b>${esc(c.course)}</b>
            <small>${esc(c.venue || 'Venue to confirm')}</small>
            <span class="class-time">${fmtTime(c.startTime)}–${fmtTime(c.endTime)}</span>
          </div>`).join('')
        : `<div class="day-empty">Free</div>`}
    </div>`;
  }).join('');

  const feedUrl = `${location.origin}/api/students/${sid()}/calendar/ics`;

  $('#content').innerHTML = `<div class="page-stack">
    <div class="stats-grid three">
      ${statCard('i-week', '', 'Classes per week', classes.length, `${busiest.count} on ${busiest.day.label}`)}
      ${statCard('i-clock', 'green', 'Contact hours', fmtDuration(totalMinutes), 'Weekly teaching time')}
      ${statCard('i-calendar', clashes.length ? 'amber' : 'green', 'Schedule clashes', clashes.length, clashes.length ? 'Open the clash radar' : 'All clear')}
    </div>

    ${clashes.length ? `<div class="alert-strip">${ico('i-alert')}Clash radar found <b>${clashes.length}</b> conflict${clashes.length === 1 ? '' : 's'} between classes, events or deadlines.
      <button class="btn btn-sm btn-outline-primary" data-action="goto" data-page="Calendar">Inspect</button></div>` : ''}

    ${panel('Weekly timetable', 'Click any class to edit it. Classes sync to Google/Outlook as recurring events.', `
      ${classes.length ? `<div class="week-scroll"><div class="week-board">${columns}</div></div>`
        : emptyState('i-week', 'No classes yet', 'Add your weekly lectures and labs to build your timetable.',
            `<button class="btn btn-primary btn-sm" data-action="add-class">${ico('i-plus')}Add your first class</button>`)}
    `, `<button class="btn btn-sm btn-primary" data-action="add-class">${ico('i-plus')}Add class</button>
        <a class="btn btn-sm btn-outline-primary" href="/api/students/${sid()}/calendar/ics/download">${ico('i-download')}.ics</a>`)}

    <div class="grid-2 even">
      ${panel('Calendar sync', 'One live feed, every device', `
        <p class="small muted" style="margin:0 0 8px">Paste this address into Google Calendar (“From URL”), Outlook (“Subscribe from web”) or Apple Calendar (“New subscription”).</p>
        <div class="code" style="white-space:pre-wrap;word-break:break-all">${esc(feedUrl)}</div>
        <div class="hero-actions">
          <button class="btn btn-sm btn-primary" data-action="copy-text" data-clipboard="${esc(feedUrl)}" data-label="Feed URL copied">${ico('i-copy')}Copy feed URL</button>
          <a class="btn btn-sm btn-outline-primary" href="/api/students/${sid()}/calendar/ics/download">${ico('i-download')}Download .ics</a>
        </div>
        <p class="tiny muted" style="margin:9px 0 0">The feed is read-only and regenerates from the database on every request.</p>`)}
      ${panel('Clash radar', 'Overlapping classes, events and deadlines', clashHtml(clashes),
        `<button class="btn btn-sm btn-outline-primary" data-action="refresh-clashes">${ico('i-refresh')}Re-scan</button>`)}
    </div>
  </div>`;

};

function openClassModal(item) {
  const isEdit = Boolean(item);
  const card = openModal({
    title: isEdit ? 'Edit class' : 'Add a class',
    subtitle: 'Weekly classes become recurring events in the .ics feed.',
    body: `<form id="classModalForm">
      <div class="form-grid">
        <div class="field span-2"><label for="cmCourse">Course *</label>
          <input class="form-control" id="cmCourse" name="course" required maxlength="150" value="${esc(item?.course || '')}" placeholder="e.g. Database Systems"></div>
        <div class="field"><label for="cmDay">Day *</label>
          <select class="form-select" id="cmDay" name="dayOfWeek">
            ${DAYS.map(d => `<option value="${d.code}" ${item?.dayOfWeek === d.code ? 'selected' : ''}>${d.label}</option>`).join('')}
          </select></div>
        <div class="field"><label for="cmVenue">Venue *</label>
          <input class="form-control" id="cmVenue" name="venue" required maxlength="150" value="${esc(item?.venue || '')}" placeholder="Room 12"></div>
        <div class="field"><label for="cmStart">Start time *</label>
          <input class="form-control" id="cmStart" name="startTime" type="time" required value="${esc(fmtTime(item?.startTime || '08:00'))}"></div>
        <div class="field"><label for="cmEnd">End time *</label>
          <input class="form-control" id="cmEnd" name="endTime" type="time" required value="${esc(fmtTime(item?.endTime || '09:30'))}"></div>
        <div class="field span-2"><label for="cmInstructor">Instructor</label>
          <input class="form-control" id="cmInstructor" name="instructor" maxlength="120" value="${esc(item?.instructor || '')}" placeholder="Optional"></div>
      </div>
      <div class="modal-error"></div>
    </form>`,
    footer: `<button class="btn btn-outline-secondary" type="button" data-action="modal-close">Cancel</button>
      ${isEdit ? `<button class="btn btn-outline-danger" type="button" id="classDelete">${ico('i-trash')}Delete</button>` : ''}
      <button class="btn btn-primary" type="submit" form="classModalForm">${isEdit ? 'Save changes' : 'Add class'}</button>`
  });

  card.querySelector('#classDelete')?.addEventListener('click', async () => {
    const yes = await askConfirm('Delete class', `Remove ${item.course} from your timetable?`);
    if (!yes) return;
    await api(`/api/students/${sid()}/classes/${item.id}`, { method: 'DELETE' });
    closeModal();
    toast('Class removed.', 'success');
    refreshPage();
  });

  bindForm(card.querySelector('#classModalForm'), async formEl => {
    const d = Object.fromEntries(new FormData(formEl));
    if (timeToMinutes(d.endTime) <= timeToMinutes(d.startTime)) {
      modalError(card, 'The end time must be after the start time.');
      return;
    }
    const body = {
      course: d.course.trim(),
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime + ':00',
      endTime: d.endTime + ':00',
      venue: d.venue.trim(),
      instructor: d.instructor?.trim() || null
    };
    if (isEdit) await api(`/api/students/${sid()}/classes/${item.id}`, { method: 'PUT', body });
    else await api(`/api/students/${sid()}/classes`, { method: 'POST', body });
    closeModal();
    toast(isEdit ? 'Class updated.' : 'Class added to your timetable.', 'success');
    refreshPage();
  });
}

act('add-class', () => openClassModal(null));
act('edit-class', el => {
  const item = state.classes.find(c => c.id === Number(el.dataset.id));
  if (item) openClassModal(item);
});
act('refresh-clashes', () => refreshPage());

/* ---------- calendar ---------- */

function monthGridHtml() {
  const base = state.ui.calendarDate;
  const start = startOfWeek(new Date(base.getFullYear(), base.getMonth(), 1));
  const cells = [];

  for (let i = 0; i < 42; i++) {
    const date = addDays(start, i);
    const iso = toISO(date);
    const inMonth = date.getMonth() === base.getMonth();
    const isToday = iso === todayISO();
    const dayCode = DAY_BY_ISO[date.getDay() === 0 ? 7 : date.getDay()].code;

    const dayEvents = state.events.filter(ev => String(ev.eventDate).slice(0, 10) === iso);
    const dayClasses = state.classes.filter(c => c.dayOfWeek === dayCode);

    const chips = [
      ...dayEvents.map(ev => `<span class="cal-chip" data-action="edit-event" data-id="${ev.id}" role="button"
          title="${esc(ev.title)}${ev.description ? ' · ' + esc(ev.description) : ''}">${ev.eventTime ? fmtTime(ev.eventTime) + ' ' : ''}${esc(ev.title)}</span>`),
      ...dayClasses.map(c => `<span class="cal-chip class" title="${esc(c.course)} · ${esc(c.venue)}">${fmtTime(c.startTime)} ${esc(c.course)}</span>`)
    ];

    cells.push(`<div class="cal-cell ${inMonth ? '' : 'out'} ${isToday ? 'today' : ''}" data-action="new-event-date" data-date="${iso}" role="button" tabindex="0">
      <div class="cal-daynum"><span>${date.getDate()}</span>${isToday ? '<span class="today-pill">TODAY</span>' : ''}</div>
      ${chips.slice(0, 3).join('')}
      ${chips.length > 3 ? `<span class="cal-more">+${chips.length - 3} more</span>` : ''}
    </div>`);
  }

  return `<div class="calendar-scroll"><div class="calendar">
    ${DAYS.map(d => `<div class="cal-head">${d.short}</div>`).join('')}
    ${cells.join('')}
  </div></div>`;
}

function calendarPanelHtml() {
  const base = state.ui.calendarDate;
  const label = base.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return `<div class="panel">
    <div class="cal-toolbar" style="margin-bottom:13px">
      <div class="cal-nav">
        <button class="icon-btn" type="button" data-action="cal-prev" aria-label="Previous month">${ico('i-chevron-left')}</button>
        <span class="cal-month">${esc(label)}</span>
        <button class="icon-btn" type="button" data-action="cal-next" aria-label="Next month">${ico('i-chevron-right')}</button>
        <button class="btn btn-sm btn-outline-primary" type="button" data-action="cal-today">Today</button>
      </div>
      <div class="panel-actions">
        <button class="btn btn-sm btn-primary" type="button" data-action="new-event">${ico('i-plus')}New event</button>
        <button class="btn btn-sm btn-outline-primary" type="button" data-action="import-ics">${ico('i-upload')}Import .ics</button>
        <a class="btn btn-sm btn-outline-primary" href="/api/students/${sid()}/calendar/ics/download">${ico('i-download')}Export</a>
      </div>
    </div>
    ${monthGridHtml()}
    <div class="cal-legend" style="margin-top:13px">
      <span><i class="legend-swatch"></i>Calendar event</span>
      <span><i class="legend-swatch class"></i>Weekly class</span>
      <span>${ico('i-clock')}Click an empty day to add an event</span>
    </div>
  </div>
  <input type="file" id="icsInput" accept=".ics,text/calendar" hidden>`;
}

PAGE_RENDER.Calendar = async function renderCalendar() {
  const [events, classes, clashes] = await Promise.all([
    api(`/api/students/${sid()}/events`),
    api(`/api/students/${sid()}/classes`),
    api(`/api/students/${sid()}/calendar/clashes`).catch(() => [])
  ]);
  state.events = events;
  state.classes = classes;

  const feedUrl = `${location.origin}/api/students/${sid()}/calendar/ics`;
  const monthEvents = events.filter(ev => String(ev.eventDate).startsWith(monthKey(state.ui.calendarDate)));

  $('#content').innerHTML = `<div class="page-stack">
    <div id="calendarHost">${calendarPanelHtml()}</div>

    <div class="grid-2 even">
      ${panel('Sync with Google or Outlook', 'Standard iCalendar (RFC 5545)', `
        <p class="small muted" style="margin:0 0 8px">Subscribe once and every class, event and task deadline appears in your phone or laptop calendar.</p>
        <div class="code" style="white-space:pre-wrap;word-break:break-all">${esc(feedUrl)}</div>
        <div class="hero-actions">
          <button class="btn btn-sm btn-primary" data-action="copy-text" data-clipboard="${esc(feedUrl)}" data-label="Feed URL copied">${ico('i-copy')}Copy URL</button>
          <a class="btn btn-sm btn-outline-primary" href="/api/students/${sid()}/calendar/ics/download">${ico('i-download')}Download file</a>
        </div>
        <ol class="tip-steps" style="margin-top:11px">
          <li><b>Google Calendar:</b> Other calendars → From URL → paste the feed.</li>
          <li><b>Outlook:</b> Add calendar → Subscribe from web → paste the feed.</li>
          <li><b>Apple Calendar:</b> File → New Calendar Subscription.</li>
        </ol>
        <div class="note" style="margin-top:10px">${ico('i-link')}Importing an .ics file also works. Duplicate title/date/time combinations are skipped automatically.</div>`)}
      ${panel('Clash radar', `${monthEvents.length} event${monthEvents.length === 1 ? '' : 's'} this month`, clashHtml(clashes),
        `<button class="btn btn-sm btn-outline-primary" data-action="refresh-clashes">${ico('i-refresh')}Re-scan</button>`)}
    </div>
  </div>`;

  wireCalendarPage();
};

function wireCalendarPage() {
  const input = $('#icsInput');
  if (input) input.addEventListener('change', () => uploadIcs(input));
}

async function uploadIcs(input) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    const data = new FormData();
    data.append('file', file);
    const result = await api(`/api/students/${sid()}/calendar/import`, { method: 'POST', body: data });
    if (result.warnings?.length) {
      openModal({
        title: 'Calendar imported with notes',
        subtitle: `${result.imported} imported · ${result.skipped} skipped`,
        body: `<div class="item-list">${result.warnings.map(w => `<div class="item-row"><div class="item-main"><small>${esc(w)}</small></div></div>`).join('')}</div>`,
        footer: `<button class="btn btn-primary" data-action="modal-close">Got it</button>`
      });
    } else {
      toast(`Imported ${result.imported} event${result.imported === 1 ? '' : 's'}; skipped ${result.skipped}.`, 'success');
    }
    refreshPage();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    input.value = '';
  }
}

act('cal-prev', () => {
  const d = state.ui.calendarDate;
  state.ui.calendarDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const host = $('#calendarHost');
  if (host) { host.innerHTML = calendarPanelHtml(); wireCalendarPage(); }
});
act('cal-next', () => {
  const d = state.ui.calendarDate;
  state.ui.calendarDate = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const host = $('#calendarHost');
  if (host) { host.innerHTML = calendarPanelHtml(); wireCalendarPage(); }
});
act('cal-today', () => {
  const now = new Date();
  state.ui.calendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const host = $('#calendarHost');
  if (host) { host.innerHTML = calendarPanelHtml(); wireCalendarPage(); }
});
act('import-ics', () => $('#icsInput')?.click());

function openEventModal(item, presetDate) {
  const isEdit = Boolean(item);
  const date = item ? String(item.eventDate).slice(0, 10) : (presetDate || todayISO());
  const card = openModal({
    title: isEdit ? 'Edit event' : 'New calendar event',
    subtitle: isEdit ? 'Changes also appear in the .ics feed.' : 'Add a one-off event to your calendar.',
    body: `<form id="eventModalForm">
      <div class="form-grid">
        <div class="field span-2"><label for="emTitle">Title *</label>
          <input class="form-control" id="emTitle" name="title" required maxlength="150" value="${esc(item?.title || '')}" placeholder="e.g. Group project meeting"></div>
        <div class="field"><label for="emDate">Date *</label>
          <input class="form-control" id="emDate" name="eventDate" type="date" required value="${esc(date)}"></div>
        <div class="field"><label for="emTime">Time</label>
          <input class="form-control" id="emTime" name="eventTime" type="time" value="${esc(fmtTime(item?.eventTime || ''))}"></div>
        <div class="field span-2"><label for="emDesc">Description</label>
          <textarea class="form-control" id="emDesc" name="description" rows="3" maxlength="1000" placeholder="Optional notes">${esc(item?.description || '')}</textarea></div>
      </div>
      <div class="modal-error"></div>
    </form>`,
    footer: `<button class="btn btn-outline-secondary" type="button" data-action="modal-close">Cancel</button>
      ${isEdit ? `<button class="btn btn-outline-danger" type="button" id="eventDelete">${ico('i-trash')}Delete</button>` : ''}
      <button class="btn btn-primary" type="submit" form="eventModalForm">${isEdit ? 'Save changes' : 'Add event'}</button>`
  });

  card.querySelector('#eventDelete')?.addEventListener('click', async () => {
    const yes = await askConfirm('Delete event', `Remove “${item.title}” from your calendar?`);
    if (!yes) return;
    await api(`/api/students/${sid()}/events/${item.id}`, { method: 'DELETE' });
    closeModal();
    toast('Event removed.', 'success');
    refreshPage();
  });

  bindForm(card.querySelector('#eventModalForm'), async formEl => {
    const d = Object.fromEntries(new FormData(formEl));
    const body = {
      title: d.title.trim(),
      eventDate: d.eventDate,
      eventTime: d.eventTime ? d.eventTime + ':00' : null,
      description: d.description?.trim() || null
    };
    if (isEdit) await api(`/api/students/${sid()}/events/${item.id}`, { method: 'PUT', body });
    else await api(`/api/students/${sid()}/events`, { method: 'POST', body });
    closeModal();
    toast(isEdit ? 'Event updated.' : 'Event added.', 'success');
    refreshPage();
  });
}

act('new-event', () => openEventModal(null));
act('new-event-date', el => openEventModal(null, el.dataset.date));
act('edit-event', el => {
  const item = state.events.find(ev => ev.id === Number(el.dataset.id));
  if (item) openEventModal(item);
});

/* ---------- tasks ---------- */

function filteredTasks() {
  const q = state.ui.taskQuery.trim().toLowerCase();
  return state.tasks.filter(t => {
    const priorityMatch = state.ui.taskPriority === 'All' || t.priority === state.ui.taskPriority;
    const textMatch = !q
      || t.title.toLowerCase().includes(q)
      || (t.description || '').toLowerCase().includes(q);
    return priorityMatch && textMatch;
  });
}

function taskCard(t) {
  const due = t.dueDate ? dueMeta(t.dueDate) : null;
  const overdue = due?.tone === 'red' && t.status !== 'Completed';
  return `<div class="kcard p-${esc(t.priority)} ${overdue ? 'overdue' : ''}" draggable="true"
      data-task-id="${t.id}" data-action="edit-task" data-id="${t.id}" role="button" tabindex="0">
    <b>${esc(t.title)}</b>
    ${t.description ? `<small>${esc(t.description.length > 100 ? t.description.slice(0, 100) + '…' : t.description)}</small>` : ''}
    <div class="kcard-foot">
      <span class="chip ${t.priority === 'High' ? 'red' : t.priority === 'Low' ? 'green' : 'blue'}">${esc(t.priority)}</span>
      <span class="tiny ${overdue ? 'strong' : 'muted'}" style="${overdue ? 'color:var(--bad)' : ''}">${due ? esc(due.text) : 'No due date'}</span>
    </div>
  </div>`;
}

function renderTaskArea() {
  const area = $('#taskArea');
  if (!area) return;
  const tasks = filteredTasks();

  if (state.ui.taskView === 'list') {
    area.innerHTML = tasks.length
      ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Due</th><th></th></tr></thead>
          <tbody>${tasks.map(t => {
            const due = t.dueDate ? dueMeta(t.dueDate) : null;
            return `<tr>
              <td><b>${esc(t.title)}</b>${t.description ? `<div class="tiny muted">${esc(t.description.slice(0, 70))}</div>` : ''}</td>
              <td><select class="form-select form-select-sm" style="width:130px" data-change="task-status-change" data-id="${t.id}">
                ${['Pending', 'In Progress', 'Completed'].map(s => `<option ${t.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select></td>
              <td>${chipsFor(t.priority, t.priority === 'High' ? 'red' : t.priority === 'Low' ? 'green' : 'blue')}</td>
              <td class="nowrap">${due ? esc(due.text) : '—'}</td>
              <td class="nowrap">
                <button class="icon-btn" type="button" data-action="edit-task" data-id="${t.id}" aria-label="Edit">${ico('i-edit')}</button>
                <button class="icon-btn danger" type="button" data-action="delete-task" data-id="${t.id}" aria-label="Delete">${ico('i-trash')}</button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`
      : emptyState('i-check', 'No matching tasks', 'Adjust the search or create a new task.');
    return;
  }

  const columns = [
    { status: 'Pending', label: 'Pending' },
    { status: 'In Progress', label: 'In progress' },
    { status: 'Completed', label: 'Completed' }
  ];

  area.innerHTML = `<div class="kanban">${columns.map(col => {
    const items = tasks.filter(t => t.status === col.status);
    return `<div class="kcol" data-status="${col.status}">
      <div class="kcol-head"><b>${col.label}</b><span class="count">${items.length}</span></div>
      ${items.length ? items.map(taskCard).join('') : `<div class="day-empty">Drop tasks here</div>`}
    </div>`;
  }).join('')}</div>`;

  area.querySelectorAll('.kcard').forEach(card => {
    card.addEventListener('dragstart', ev => {
      ev.dataTransfer.setData('text/plain', card.dataset.taskId);
      ev.dataTransfer.effectAllowed = 'move';
      card.style.opacity = '0.5';
    });
    card.addEventListener('dragend', () => { card.style.opacity = ''; });
  });
  area.querySelectorAll('.kcol').forEach(col => {
    col.addEventListener('dragover', ev => { ev.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', async ev => {
      ev.preventDefault();
      col.classList.remove('drag-over');
      const id = Number(ev.dataTransfer.getData('text/plain'));
      await setTaskStatus(id, col.dataset.status);
    });
  });
}

async function setTaskStatus(id, status) {
  const task = state.tasks.find(t => t.id === id);
  if (!task || task.status === status) return;
  await api(`/api/students/${sid()}/tasks/${id}`, {
    method: 'PUT',
    body: {
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      status,
      priority: task.priority
    }
  });
  task.status = status;
  renderTaskArea();
  toast(`Moved to ${status}.`, 'success');
}

act('task-status-change', el => setTaskStatus(Number(el.dataset.id), el.value));
act('task-view', el => {
  state.ui.taskView = el.dataset.view;
  LS.set('taskView', state.ui.taskView);
  $$('.view-toggle button').forEach(b => b.classList.toggle('active', b.dataset.view === state.ui.taskView));
  renderTaskArea();
});

function openTaskModal(item) {
  const isEdit = Boolean(item);
  const card = openModal({
    title: isEdit ? 'Edit task' : 'New task',
    subtitle: isEdit ? 'Update the status, priority or deadline.' : 'Capture an assignment, errand or study goal.',
    body: `<form id="taskModalForm">
      <div class="form-grid">
        <div class="field span-2"><label for="tmTitle">Title *</label>
          <input class="form-control" id="tmTitle" name="title" required maxlength="180" value="${esc(item?.title || '')}" placeholder="e.g. Finish database ERD chapter"></div>
        <div class="field span-2"><label for="tmDesc">Description</label>
          <textarea class="form-control" id="tmDesc" name="description" rows="3" maxlength="1000" placeholder="Optional details">${esc(item?.description || '')}</textarea></div>
        <div class="field"><label for="tmDue">Due date</label>
          <input class="form-control" id="tmDue" name="dueDate" type="date" value="${esc(item?.dueDate || '')}"></div>
        <div class="field"><label for="tmStatus">Status</label>
          <select class="form-select" id="tmStatus" name="status">
            ${['Pending', 'In Progress', 'Completed'].map(s => `<option ${item?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select></div>
        <div class="field"><label for="tmPriority">Priority</label>
          <select class="form-select" id="tmPriority" name="priority">
            ${['Low', 'Normal', 'High'].map(p => `<option ${item?.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select></div>
      </div>
      <div class="modal-error"></div>
    </form>`,
    footer: `<button class="btn btn-outline-secondary" type="button" data-action="modal-close">Cancel</button>
      ${isEdit ? `<button class="btn btn-outline-danger" type="button" id="taskDelete">${ico('i-trash')}Delete</button>` : ''}
      <button class="btn btn-primary" type="submit" form="taskModalForm">${isEdit ? 'Save changes' : 'Add task'}</button>`
  });

  card.querySelector('#taskDelete')?.addEventListener('click', async () => {
    const yes = await askConfirm('Delete task', `Remove “${item.title}”?`);
    if (!yes) return;
    await api(`/api/students/${sid()}/tasks/${item.id}`, { method: 'DELETE' });
    closeModal();
    toast('Task deleted.', 'success');
    refreshPage();
  });

  bindForm(card.querySelector('#taskModalForm'), async formEl => {
    const d = Object.fromEntries(new FormData(formEl));
    const body = {
      title: d.title.trim(),
      description: d.description?.trim() || null,
      dueDate: d.dueDate || null,
      status: d.status,
      priority: d.priority
    };
    if (isEdit) await api(`/api/students/${sid()}/tasks/${item.id}`, { method: 'PUT', body });
    else await api(`/api/students/${sid()}/tasks`, { method: 'POST', body });
    closeModal();
    toast(isEdit ? 'Task updated.' : 'Task added.', 'success');
    refreshPage();
  });
}

act('new-task', () => openTaskModal(null));
act('edit-task', el => {
  const item = state.tasks.find(t => t.id === Number(el.dataset.id));
  if (item) openTaskModal(item);
});
act('delete-task', async el => {
  const item = state.tasks.find(t => t.id === Number(el.dataset.id));
  if (!item) return;
  const yes = await askConfirm('Delete task', `Remove “${item.title}”?`);
  if (!yes) return;
  await api(`/api/students/${sid()}/tasks/${item.id}`, { method: 'DELETE' });
  state.tasks = state.tasks.filter(t => t.id !== item.id);
  renderTaskArea();
  toast('Task deleted.', 'success');
});

PAGE_RENDER.Tasks = async function renderTasks() {
  state.tasks = await api(`/api/students/${sid()}/tasks`);
  const counts = {
    pending: state.tasks.filter(t => t.status === 'Pending').length,
    progress: state.tasks.filter(t => t.status === 'In Progress').length,
    done: state.tasks.filter(t => t.status === 'Completed').length
  };

  $('#content').innerHTML = `<div class="page-stack">
    <div class="stats-grid three">
      ${statCard('i-check', 'amber', 'Pending', counts.pending, 'Not started yet')}
      ${statCard('i-clock', '', 'In progress', counts.progress, 'Actively working')}
      ${statCard('i-check-circle', 'green', 'Completed', counts.done, `${state.tasks.length} tasks in total`)}
    </div>

    ${panel('Task board', 'Drag a card between columns to change its status', `
      <div class="filter-bar" style="margin-bottom:13px">
        <input class="form-control" id="taskSearch" placeholder="Search tasks…" value="${esc(state.ui.taskQuery)}" style="flex:1">
        <select class="form-select" id="taskPriority" style="max-width:150px">
          ${['All', 'High', 'Normal', 'Low'].map(p => `<option ${state.ui.taskPriority === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
        <div class="view-toggle" role="group" aria-label="Task view">
          <button type="button" data-action="task-view" data-view="board" class="${state.ui.taskView === 'board' ? 'active' : ''}">Board</button>
          <button type="button" data-action="task-view" data-view="list" class="${state.ui.taskView === 'list' ? 'active' : ''}">List</button>
        </div>
        <button class="btn btn-primary btn-sm" type="button" data-action="new-task">${ico('i-plus')}New task</button>
      </div>
      <div id="taskArea"></div>`,
      `<span class="chip blue">${state.tasks.length} total</span>`)}

    ${panel('Assignment helper shortcut', 'Turn a brief into a dated plan', `
      <div class="alert-strip info">${ico('i-wand')}The Assignment Helper builds a milestone plan and can push each milestone into this board as a task.
        <button class="btn btn-sm btn-outline-primary" data-action="goto" data-page="Assignment Helper">Open planner</button>
      </div>`)}
  </div>`;

  $('#taskSearch').addEventListener('input', ev => {
    state.ui.taskQuery = ev.target.value;
    renderTaskArea();
  });
  $('#taskPriority').addEventListener('change', ev => {
    state.ui.taskPriority = ev.target.value;
    renderTaskArea();
  });

  renderTaskArea();
};

/* ---------- assignment helper ---------- */

const MILESTONES = [
  { key: 'brief', title: 'Decode the brief', detail: 'Highlight the instruction verb, scope, format and marking rubric.', at: 0 },
  { key: 'sources', title: 'Collect credible sources', detail: 'Aim for 5–8 peer-reviewed or official sources; save the citation details now.', at: 0.2 },
  { key: 'outline', title: 'Build the outline', detail: 'One sentence per paragraph, with the evidence it will use.', at: 0.35 },
  { key: 'draft', title: 'Write the first draft', detail: 'Get full sentences down; do not edit while drafting.', at: 0.6 },
  { key: 'review', title: 'Review against the rubric', detail: 'Check argument, evidence, referencing and formatting.', at: 0.8 },
  { key: 'submit', title: 'Proofread and submit', detail: 'Read aloud, check the reference list, then submit early.', at: 0.95 }
];

function buildPlan(d) {
  const due = parseISO(d.due);
  if (Number.isNaN(due.getTime())) throw new Error('Choose a valid due date.');
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  const span = Math.max(1, Math.round((due - start) / 86400000));
  const steps = MILESTONES.map(m => ({
    key: m.key,
    title: m.title,
    detail: m.detail,
    date: toISO(addDays(start, Math.max(0, Math.min(span - 1, Math.round(span * m.at)))))
  }));
  return {
    id: 'plan-' + Date.now().toString(36),
    title: d.title.trim(),
    course: (d.course || '').trim(),
    due: d.due,
    hours: Number(d.hours) || 10,
    difficulty: d.difficulty || 'Normal',
    created: todayISO(),
    steps,
    done: {}
  };
}

function renderPlan() {
  const host = $('#planOut');
  if (!host) return;
  const plan = state.ui.assignment;
  if (!plan) {
    host.innerHTML = emptyState('i-wand', 'No plan yet', 'Describe your assignment and Uptime will work backwards from the due date.');
    return;
  }

  const doneCount = plan.steps.filter(s => plan.done?.[s.key]).length;
  const pct = Math.round((doneCount / plan.steps.length) * 100);
  const sessionLength = plan.difficulty === 'Hard' ? 50 : plan.difficulty === 'Easy' ? 25 : 40;
  const sessions = Math.ceil((plan.hours * 60) / sessionLength);

  host.innerHTML = `<div class="panel-head">
      <div><h3 class="panel-title">${esc(plan.title)}</h3>
      <p class="panel-sub">${esc(plan.course || 'General')} · due ${esc(fmtDate(plan.due))} · ${plan.hours} hours · ${sessions} × ${sessionLength}-minute sessions</p></div>
      <div class="panel-actions">
        <span class="chip ${pct === 100 ? 'green' : 'blue'}">${doneCount}/${plan.steps.length} done</span>
      </div>
    </div>
    <div class="progress" style="margin-bottom:13px"><div class="progress-bar ${pct === 100 ? 'green' : ''}" style="width:${pct}%"></div></div>
    <div class="item-list">${plan.steps.map((s, i) => {
      const done = Boolean(plan.done?.[s.key]);
      const late = !done && daysUntil(s.date) < 0;
      return `<label class="planner-step ${done ? 'done' : ''}" style="margin-bottom:7px;cursor:pointer">
        <input type="checkbox" data-change="plan-step" data-key="${s.key}" ${done ? 'checked' : ''} style="margin-top:3px;accent-color:var(--blue)">
        <div class="planner-main"><b>${esc(s.title)}</b><small>${esc(s.detail)}</small></div>
        <span class="planner-date" style="${late ? 'color:var(--bad)' : ''}">${esc(fmtDate(s.date))}${late ? '<br>overdue' : ''}</span>
      </label>`;
    }).join('')}</div>
    <div class="hero-actions">
      <button class="btn btn-sm btn-primary" data-action="push-milestones">${ico('i-check')}Push open milestones to tasks</button>
      <button class="btn btn-sm btn-outline-primary" data-action="goto" data-page="Research Hub">${ico('i-globe')}Find sources</button>
      <button class="btn btn-sm btn-ghost" data-action="plan-clear">Clear plan</button>
    </div>`;
}

function renderSavedPlans() {
  const host = $('#savedPlans');
  if (!host) return;
  const plans = LS.get('assignments', []);
  host.innerHTML = plans.length
    ? `<div class="item-list">${plans.slice().reverse().map(p => {
      const total = p.steps?.length || 6;
      const done = Object.keys(p.done || {}).filter(k => p.done[k]).length;
      return `<div class="item-row">
        <div class="item-main"><b>${esc(p.title)}</b><small>${esc(p.course || 'General')} · due ${esc(fmtDate(p.due))} · ${done}/${total} steps</small></div>
        <div class="item-side">
          <button class="btn btn-sm btn-outline-primary" data-action="plan-load" data-id="${esc(p.id)}">Open</button>
          <button class="icon-btn danger" data-action="plan-delete" data-id="${esc(p.id)}" aria-label="Delete plan">${ico('i-trash')}</button>
        </div>
      </div>`;
    }).join('')}</div>`
    : emptyState('i-book', 'No saved plans', 'Plans are saved in this browser so you can return to them.');
}

function saveCurrentPlan() {
  const plan = state.ui.assignment;
  if (!plan) return;
  const plans = LS.get('assignments', []).filter(p => p.id !== plan.id);
  plans.push(plan);
  LS.set('assignments', plans);
  renderSavedPlans();
}

function citationHtml(d) {
  const author = (d.author || 'Author').trim();
  const year = (d.year || 'n.d.').trim();
  const title = (d.title || 'Untitled').trim();
  const source = (d.source || '').trim();
  const url = (d.url || '').trim();
  const accessed = d.accessed ? fmtDate(d.accessed) : fmtDate(todayISO());
  const type = d.type || 'website';

  const apaTitle = type === 'book' ? `<i>${esc(title)}</i>` : esc(title);
  const apaSource = type === 'journal' && source ? ` <i>${esc(source)}</i>.` : (source ? ` ${esc(source)}.` : '');
  const apa = `${esc(author)} (${esc(year)}). ${apaTitle}.${apaSource}${url ? ` ${esc(url)}` : ''}`;

  const mla = `${esc(author)}. “${esc(title)}.” ${source ? esc(source) + ', ' : ''}${esc(year)}${url ? ', ' + esc(url) : ''}.`;

  const harvard = `${esc(author)} (${esc(year)}) ‘${esc(title)}’, ${source ? esc(source) + '.' : ''}${url ? ` Available at: ${esc(url)}` : ''} (Accessed: ${esc(accessed)}).`;

  return `<div class="citation-out">
      <div class="citation-label"><span>APA 7</span><button class="btn btn-sm btn-ghost" data-action="copy-text" data-clipboard="${esc(apa.replace(/<[^>]+>/g, ''))}">${ico('i-copy')}Copy</button></div>
      ${apa}
    </div>
    <div class="citation-out">
      <div class="citation-label"><span>MLA 9</span><button class="btn btn-sm btn-ghost" data-action="copy-text" data-clipboard="${esc(mla)}">${ico('i-copy')}Copy</button></div>
      ${mla}
    </div>
    <div class="citation-out">
      <div class="citation-label"><span>Harvard</span><button class="btn btn-sm btn-ghost" data-action="copy-text" data-clipboard="${esc(harvard)}">${ico('i-copy')}Copy</button></div>
      ${harvard}
    </div>
    <div class="note" style="margin-top:9px">${ico('i-bulb')}Always check your institution's referencing guide: punctuation and capitalisation rules can vary by department.</div>`;
}

PAGE_RENDER['Assignment Helper'] = async function renderAssignmentHelper() {
  const saved = LS.get('assignments', []);
  if (!state.ui.assignment && saved.length) state.ui.assignment = saved[saved.length - 1];

  $('#content').innerHTML = `<div class="page-stack">
    <div class="grid-2">
      ${panel('Plan an assignment', 'Work backwards from the due date', `
        <form id="planForm">
          <div class="form-grid">
            <div class="field span-2"><label for="apTitle">Assignment title *</label>
              <input class="form-control" id="apTitle" name="title" required maxlength="150" placeholder="e.g. Network security case study"></div>
            <div class="field"><label for="apCourse">Course</label>
              <input class="form-control" id="apCourse" name="course" maxlength="100" placeholder="e.g. Computer Forensics"></div>
            <div class="field"><label for="apDue">Due date *</label>
              <input class="form-control" id="apDue" name="due" type="date" required min="${todayISO()}" value="${esc(toISO(addDays(new Date(), 14)))}"></div>
            <div class="field"><label for="apHours">Estimated effort (hours)</label>
              <input class="form-control" id="apHours" name="hours" type="number" min="1" max="200" value="10"></div>
            <div class="field"><label for="apDifficulty">Difficulty</label>
              <select class="form-select" id="apDifficulty" name="difficulty">
                <option>Easy</option><option selected>Normal</option><option>Hard</option>
              </select></div>
          </div>
          <button class="btn btn-primary w-100" style="margin-top:13px" type="submit">${ico('i-wand')}Build my milestone plan</button>
        </form>

        <div class="divider">milestones</div>
        <div class="check-list">
          ${MILESTONES.map((m, i) => `<div class="check-item" style="cursor:default">
            <span class="planner-num">${i + 1}</span>
            <span><b>${esc(m.title)}</b><br><span class="tiny muted">${esc(m.detail)}</span></span>
          </div>`).join('')}
        </div>`)}

      <div>
        <div class="panel" id="planPanel">
          <div id="planOut"></div>
        </div>
        <div class="panel" style="margin-top:16px">
          <div class="panel-head"><div><h3 class="panel-title">Saved plans</h3><p class="panel-sub">Stored in this browser</p></div></div>
          <div id="savedPlans"></div>
        </div>
      </div>
    </div>

    ${panel('Citation generator', 'APA 7, MLA 9 and Harvard in one step', `
      <form id="citationForm">
        <div class="form-grid three">
          <div class="field"><label for="cfType">Source type</label>
            <select class="form-select" id="cfType" name="type">
              <option value="website">Website</option>
              <option value="journal">Journal article</option>
              <option value="book">Book</option>
            </select></div>
          <div class="field"><label for="cfAuthor">Author(s)</label>
            <input class="form-control" id="cfAuthor" name="author" placeholder="Shilongo, R."></div>
          <div class="field"><label for="cfYear">Year</label>
            <input class="form-control" id="cfYear" name="year" placeholder="2026"></div>
          <div class="field span-2"><label for="cfTitle">Title</label>
            <input class="form-control" id="cfTitle" name="title" placeholder="The title of the source"></div>
          <div class="field"><label for="cfSource">Publisher / journal</label>
            <input class="form-control" id="cfSource" name="source" placeholder="Journal or publisher"></div>
          <div class="field span-2"><label for="cfUrl">URL or DOI</label>
            <input class="form-control" id="cfUrl" name="url" placeholder="https://…"></div>
          <div class="field"><label for="cfAccessed">Accessed</label>
            <input class="form-control" id="cfAccessed" name="accessed" type="date" value="${todayISO()}"></div>
        </div>
        <div class="hero-actions">
          <button class="btn btn-primary btn-sm" type="submit">${ico('i-copy')}Generate citations</button>
          <button class="btn btn-outline-primary btn-sm" type="button" data-action="goto" data-page="Research Hub">${ico('i-globe')}Find a source</button>
        </div>
      </form>
      <div id="citeOut" style="margin-top:13px">
        <div class="note">${ico('i-book')}Fill in the fields above and Uptime will format all three styles. Copy the one your lecturer requires.</div>
      </div>`)}
  </div>`;

  bindForm('#planForm', el => {
    const d = Object.fromEntries(new FormData(el));
    state.ui.assignment = buildPlan(d);
    saveCurrentPlan();
    renderPlan();
    toast('Milestone plan created and saved.', 'success');
  });

  bindForm('#citationForm', el => {
    const d = Object.fromEntries(new FormData(el));
    if (!d.title.trim()) throw new Error('Enter the source title first.');
    $('#citeOut').innerHTML = citationHtml(d);
  });

  renderPlan();
  renderSavedPlans();
};

act('plan-step', el => {
  const plan = state.ui.assignment;
  if (!plan) return;
  plan.done = plan.done || {};
  plan.done[el.dataset.key] = el.checked;
  saveCurrentPlan();
  renderPlan();
});
act('plan-clear', () => {
  state.ui.assignment = null;
  renderPlan();
});
act('plan-load', el => {
  const plan = LS.get('assignments', []).find(p => p.id === el.dataset.id);
  if (!plan) return;
  state.ui.assignment = plan;
  renderPlan();
  toast('Plan loaded.', 'success');
});
act('plan-delete', async el => {
  const plans = LS.get('assignments', []).filter(p => p.id !== el.dataset.id);
  LS.set('assignments', plans);
  if (state.ui.assignment?.id === el.dataset.id) state.ui.assignment = null;
  renderPlan();
  renderSavedPlans();
  toast('Plan removed.', 'success');
});
act('push-milestones', async () => {
  const plan = state.ui.assignment;
  if (!plan) return;
  const open = plan.steps.filter(s => !plan.done?.[s.key]);
  if (!open.length) { toast('Every milestone is already complete.', 'success'); return; }
  const yes = await askConfirm(
    'Push milestones to tasks',
    `Add ${open.length} milestone${open.length === 1 ? '' : 's'} to your task board with their planned due dates?`,
    'Add tasks', false
  );
  if (!yes) return;
  for (const step of open) {
    await api(`/api/students/${sid()}/tasks`, {
      method: 'POST',
      body: {
        title: `${plan.title}: ${step.title}`,
        description: step.detail,
        dueDate: step.date,
        status: 'Pending',
        priority: 'High'
      }
    });
  }
  toast(`${open.length} milestone task${open.length === 1 ? '' : 's'} added.`, 'success');
});

/* ---------- budget ---------- */

function moneyBars(months) {
  const max = Math.max(1, ...months.map(m => m.total));
  return `<div class="bars">${months.map(m => {
    const h = Math.max(4, Math.round((m.total / max) * 100));
    return `<div class="bar-wrap" title="${esc(m.label)}: ${money(m.total)}">
      <span class="bar-value">${m.total ? Math.round(m.total) : ''}</span>
      <div class="bar ${m.total === max && max > 1 ? 'peak' : ''}" style="height:${h}%"></div>
      <span class="bar-label">${esc(m.label)}</span>
    </div>`;
  }).join('')}</div>`;
}

function openExpenseModal(item) {
  const isEdit = Boolean(item);
  const categories = ['Food', 'Transport', 'Books', 'Accommodation', 'Data', 'Airtime', 'Printing', 'Social', 'Other'];
  const card = openModal({
    title: isEdit ? 'Edit expense' : 'Record an expense',
    subtitle: 'Every entry updates the monthly budget immediately.',
    body: `<form id="expenseModalForm">
      <div class="form-grid">
        <div class="field span-2"><label for="xmName">What did you buy? *</label>
          <input class="form-control" id="xmName" name="name" required maxlength="150" value="${esc(item?.name || '')}" placeholder="e.g. Data bundle"></div>
        <div class="field"><label for="xmAmount">Amount (N$) *</label>
          <input class="form-control" id="xmAmount" name="amount" type="number" min="0.01" step="0.01" required value="${esc(item?.amount || '')}"></div>
        <div class="field"><label for="xmDate">Date *</label>
          <input class="form-control" id="xmDate" name="expenseDate" type="date" required value="${esc(item?.expenseDate || todayISO())}"></div>
        <div class="field span-2"><label for="xmCategory">Category</label>
          <select class="form-select" id="xmCategory" name="category">
            ${categories.map(c => `<option ${item?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select></div>
      </div>
      <div class="modal-error"></div>
    </form>`,
    footer: `<button class="btn btn-outline-secondary" type="button" data-action="modal-close">Cancel</button>
      ${isEdit ? `<button class="btn btn-outline-danger" type="button" id="expenseDelete">${ico('i-trash')}Delete</button>` : ''}
      <button class="btn btn-primary" type="submit" form="expenseModalForm">${isEdit ? 'Save changes' : 'Add expense'}</button>`
  });

  card.querySelector('#expenseDelete')?.addEventListener('click', async () => {
    const yes = await askConfirm('Delete expense', `Remove “${item.name}” (${money(item.amount)})?`);
    if (!yes) return;
    await api(`/api/students/${sid()}/expenses/${item.id}`, { method: 'DELETE' });
    closeModal();
    toast('Expense deleted.', 'success');
    refreshPage();
  });

  bindForm(card.querySelector('#expenseModalForm'), async formEl => {
    const d = Object.fromEntries(new FormData(formEl));
    const body = {
      name: d.name.trim(),
      amount: Number(d.amount),
      category: d.category,
      expenseDate: d.expenseDate
    };
    if (!body.amount || body.amount <= 0) { modalError(card, 'The amount must be greater than zero.'); return; }
    if (isEdit) await api(`/api/students/${sid()}/expenses/${item.id}`, { method: 'PUT', body });
    else await api(`/api/students/${sid()}/expenses`, { method: 'POST', body });
    closeModal();
    toast(isEdit ? 'Expense updated.' : 'Expense recorded.', 'success');
    refreshPage();
  });
}

act('add-expense', () => openExpenseModal(null));
act('edit-expense', el => {
  const item = state.expenses.find(x => x.id === Number(el.dataset.id));
  if (item) openExpenseModal(item);
});

act('edit-budget-limit', async () => {
  const current = Number(state.settings?.monthlyBudgetLimit || 500);
  const card = openModal({
    title: 'Monthly budget limit',
    subtitle: 'Set the amount you allow yourself to spend each month.',
    size: 'narrow',
    body: `<form id="limitForm">
      <div class="field"><label for="lmLimit">Limit (N$)</label>
        <input class="form-control" id="lmLimit" name="limit" type="number" min="0.01" step="0.01" required value="${current}"></div>
      <div class="modal-error"></div>
    </form>`,
    footer: `<button class="btn btn-outline-secondary" type="button" data-action="modal-close">Cancel</button>
      <button class="btn btn-primary" type="submit" form="limitForm">Save limit</button>`
  });
  bindForm(card.querySelector('#limitForm'), async formEl => {
    const value = Number(Object.fromEntries(new FormData(formEl)).limit);
    if (!value || value <= 0) { modalError(card, 'Enter an amount greater than zero.'); return; }
    const settings = state.settings || {};
    await api(`/api/students/${sid()}/settings`, {
      method: 'PUT',
      body: {
        reminderMinutes: settings.reminderMinutes ?? 60,
        notificationsEnabled: settings.notificationsEnabled ?? true,
        ringtoneEnabled: settings.ringtoneEnabled ?? true,
        volume: settings.volume ?? 70,
        monthlyBudgetLimit: value
      }
    });
    closeModal();
    toast('Budget limit updated.', 'success');
    refreshPage();
  });
});

PAGE_RENDER.Budget = async function renderBudget() {
  const [expenses, settings] = await Promise.all([
    api(`/api/students/${sid()}/expenses`),
    api(`/api/students/${sid()}/settings`)
  ]);
  state.expenses = expenses;
  state.settings = settings;

  const now = new Date();
  const key = monthKey(now);
  const monthly = expenses.filter(e => String(e.expenseDate).startsWith(key));
  const spent = monthly.reduce((sum, e) => sum + Number(e.amount), 0);
  const limit = Number(settings.monthlyBudgetLimit || 0);
  const remaining = limit - spent;
  const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
  const dailyAllowance = remaining / daysLeft;

  const byCategory = {};
  monthly.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount); });
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = monthKey(d);
    const total = expenses
      .filter(e => String(e.expenseDate).startsWith(k))
      .reduce((sum, e) => sum + Number(e.amount), 0);
    months.push({ label: d.toLocaleDateString('en-GB', { month: 'short' }), total });
  }

  const categoryBody = categories.length
    ? `<div class="meter-list">${categories.map(([name, amount]) => `
        <div>
          <div class="meter-head"><b>${esc(name)}</b><span>${money(amount)}</span></div>
          <div class="progress"><div class="progress-bar" style="width:${spent ? Math.round((amount / spent) * 100) : 0}%"></div></div>
        </div>`).join('')}</div>`
    : emptyState('i-wallet', 'No spending this month', 'Record your first expense to see the category breakdown.');

  const listBody = expenses.length
    ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Expense</th><th>Category</th><th>Date</th><th style="text-align:right">Amount</th><th></th></tr></thead>
        <tbody>${expenses.map(e => `<tr>
          <td><b>${esc(e.name)}</b></td>
          <td>${chipsFor(e.category)}</td>
          <td class="nowrap">${esc(fmtDate(e.expenseDate))}</td>
          <td class="nowrap" style="text-align:right;font-weight:700">${money(e.amount)}</td>
          <td class="nowrap">
            <button class="icon-btn" type="button" data-action="edit-expense" data-id="${e.id}" aria-label="Edit expense">${ico('i-edit')}</button>
            <button class="icon-btn danger" type="button" data-action="delete-expense" data-id="${e.id}" aria-label="Delete expense">${ico('i-trash')}</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`
    : emptyState('i-wallet', 'No expenses yet', 'Track food, transport, data and books to see where your money goes.',
        `<button class="btn btn-primary btn-sm" data-action="add-expense">${ico('i-plus')}Record an expense</button>`);

  $('#content').innerHTML = `<div class="page-stack">
    <div class="stats-grid">
      ${statCard('i-wallet', '', 'Monthly limit', money(limit), `${now.toLocaleDateString('en-GB', { month: 'long' })} budget`)}
      ${statCard('i-arrow', pct >= 90 ? 'red' : pct >= 70 ? 'amber' : 'green', 'Spent this month', money(spent), `${pct}% of limit · ${monthly.length} entries`)}
      ${statCard('i-check-circle', remaining < 0 ? 'red' : 'green', 'Remaining', money(remaining), remaining < 0 ? 'Over budget' : 'Available to spend')}
      ${statCard('i-clock', 'amber', 'Daily allowance', money(Math.max(0, dailyAllowance)), `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`)}
    </div>

    ${remaining < 0 ? `<div class="alert-strip">${ico('i-alert')}You are <b>${money(Math.abs(remaining))}</b> over your monthly limit. Review the categories below.
      <button class="btn btn-sm btn-outline-primary" data-action="edit-budget-limit">Adjust limit</button></div>` : ''}

    <div class="grid-2 even">
      ${panel('Spending by category', `This month · ${money(spent)} total`, categoryBody,
        `<button class="btn btn-sm btn-primary" data-action="add-expense">${ico('i-plus')}Add expense</button>`)}
      ${panel('Six-month trend', 'Total spending per month', moneyBars(months),
        `<button class="btn btn-sm btn-outline-primary" data-action="edit-budget-limit">${ico('i-edit')}Limit</button>`)}
    </div>

    ${panel('Expense history', `${expenses.length} recorded expense${expenses.length === 1 ? '' : 's'}`, listBody,
      `<button class="btn btn-sm btn-primary" data-action="add-expense">${ico('i-plus')}New expense</button>`)}
  </div>`;
};

act('delete-expense', async el => {
  const item = state.expenses.find(x => x.id === Number(el.dataset.id));
  if (!item) return;
  const yes = await askConfirm('Delete expense', `Remove “${item.name}” (${money(item.amount)})?`);
  if (!yes) return;
  await api(`/api/students/${sid()}/expenses/${item.id}`, { method: 'DELETE' });
  toast('Expense deleted.', 'success');
  refreshPage();
});

/* ---------- study timer ---------- */

const TIMER_MODES = [
  { name: 'Focus', minutes: 25 },
  { name: 'Short break', minutes: 5 },
  { name: 'Long break', minutes: 15 },
  { name: 'Deep work', minutes: 50 }
];

const timer = {
  mode: 'Focus',
  duration: 25 * 60,
  remaining: 25 * 60,
  running: false,
  endsAt: 0,
  startedAt: null,
  subject: LS.get('timerSubject', ''),
  interval: null
};

function mmss(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

function persistTimer() {
  LS.set('timer', {
    mode: timer.mode,
    duration: timer.duration,
    remaining: timer.remaining,
    running: timer.running,
    endsAt: timer.endsAt,
    startedAt: timer.startedAt,
    subject: timer.subject
  });
}

function restoreTimer() {
  const saved = LS.get('timer', null);
  if (!saved) return;
  timer.mode = saved.mode || 'Focus';
  timer.duration = Number(saved.duration) || 1500;
  timer.subject = saved.subject || '';
  timer.startedAt = saved.startedAt || null;

  if (saved.running && Number(saved.endsAt) > Date.now()) {
    timer.running = true;
    timer.endsAt = Number(saved.endsAt);
    timer.remaining = Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
    startTicking();
  } else if (saved.running) {
    timer.running = false;
    timer.remaining = 0;
  } else {
    timer.remaining = Number.isFinite(saved.remaining) ? saved.remaining : timer.duration;
  }
}

function startTicking() {
  clearInterval(timer.interval);
  timer.interval = setInterval(() => {
    if (!timer.running) return;
    timer.remaining = Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
    updateTimerDisplay();
    if (timer.remaining <= 0) completeTimer();
  }, 500);
}

function updateTimerDisplay() {
  const ring = $('#timerRing');
  if (ring) {
    const pct = timer.duration ? Math.min(100, Math.round(((timer.duration - timer.remaining) / timer.duration) * 100)) : 0;
    ring.style.setProperty('--pct', pct);
  }
  const display = $('#timerDisplay');
  if (display) display.textContent = mmss(timer.remaining);
  const modeLabel = $('#timerModeLabel');
  if (modeLabel) modeLabel.textContent = timer.mode;
  syncTimerButton();
  updateFloatingTimer();
}

function syncTimerButton() {
  const btn = $('#timerToggle');
  if (btn) btn.innerHTML = timer.running ? `${ico('i-pause')}Pause` : `${ico('i-play')}Start`;
  $$('#timerModes .mode-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.mode === timer.mode);
  });
}

function updateFloatingTimer() {
  let host = $('#floatingTimer');
  if (!timer.running || state.page === 'Study Timer') {
    if (host) host.remove();
    return;
  }
  if (!host) {
    host = document.createElement('div');
    host.id = 'floatingTimer';
    host.className = 'floating-timer';
    host.innerHTML = `<span id="floatingTime">${mmss(timer.remaining)}</span>
      <button type="button" data-action="timer-toggle" aria-label="Pause timer">${ico('i-pause')}</button>
      <button type="button" data-action="goto" data-page="Study Timer" aria-label="Open timer">${ico('i-timer')}</button>`;
    document.body.appendChild(host);
  }
  const time = $('#floatingTime');
  if (time) time.textContent = mmss(timer.remaining);
}

function startTimer() {
  if (timer.running) return;
  if (timer.remaining <= 0) timer.remaining = timer.duration;
  timer.startedAt = timer.startedAt || new Date().toISOString();
  timer.running = true;
  timer.endsAt = Date.now() + timer.remaining * 1000;
  persistTimer();
  startTicking();
  updateTimerDisplay();
}

function pauseTimer() {
  if (!timer.running) return;
  timer.remaining = Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
  timer.running = false;
  timer.endsAt = 0;
  clearInterval(timer.interval);
  timer.interval = null;
  persistTimer();
  updateTimerDisplay();
}

function resetTimer() {
  clearInterval(timer.interval);
  timer.interval = null;
  timer.running = false;
  timer.remaining = timer.duration;
  timer.endsAt = 0;
  timer.startedAt = null;
  persistTimer();
  updateTimerDisplay();
}

function setTimerMode(modeName) {
  const mode = TIMER_MODES.find(m => m.name === modeName);
  if (!mode) return;
  clearInterval(timer.interval);
  timer.interval = null;
  timer.mode = mode.name;
  timer.duration = mode.minutes * 60;
  timer.remaining = timer.duration;
  timer.running = false;
  timer.endsAt = 0;
  timer.startedAt = null;
  persistTimer();
  updateTimerDisplay();
  toast(`${mode.name}: ${mode.minutes} minutes.`, 'success');
}

async function playToneById(id) {
  const tone = state.ringtones.find(r => r.id === Number(id));
  if (!tone) { beep(); return; }
  const audio = $('#toneAudio');
  try {
    audio.pause();
    audio.src = tone.audioFilePath;
   audio.volume = Math.min(1, Math.max(0, (state.settings?.volume ?? 70) / 100));
    audio.loop = false;
    audio.currentTime = 0;
    await audio.play();
  } catch {
    beep();
  }
}

function beep() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 720;
    gain.gain.value = 0.08;
    osc.start();
    setTimeout(() => { try { osc.stop(); ctx.close(); } catch { /* ignore */ } }, 380);
  } catch { /* audio blocked */ }
}

function notifyUser(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon: '/images/student-icon.svg' }); } catch { /* ignore */ }
}

function completeTimer() {
  clearInterval(timer.interval);
  timer.interval = null;
  timer.running = false;
  timer.remaining = 0;
  timer.endsAt = 0;
  persistTimer();
  updateTimerDisplay();

  if (state.settings?.ringtoneEnabled !== false) {
    playToneById(state.ringtones[0]?.id);
  }
  notifyUser('Focus session complete', `${timer.mode} finished. Save it to your study history.`);
  toast('Focus session complete! Save it to your history.', 'success');
  openSaveSessionModal(Math.max(1, Math.round(timer.duration / 60)));
}

function openSaveSessionModal(minutes) {
  const card = openModal({
    title: 'Save study session',
    subtitle: 'Recorded sessions power your streak, focus score and subject breakdown.',
    body: `<form id="sessionModalForm">
      <div class="form-grid">
        <div class="field span-2"><label for="smSubject">Subject *</label>
          <input class="form-control" id="smSubject" name="subject" required maxlength="150" value="${esc(timer.subject || '')}" placeholder="e.g. Database Systems"></div>
        <div class="field"><label for="smMinutes">Minutes *</label>
          <input class="form-control" id="smMinutes" name="durationMinutes" type="number" min="1" max="1440" required value="${minutes}"></div>
        <div class="field"><label for="smStarted">Started at</label>
          <input class="form-control" id="smStarted" name="startedAt" type="datetime-local" value="${esc((timer.startedAt || new Date().toISOString()).slice(0, 16))}"></div>
      </div>
      <div class="modal-error"></div>
    </form>`,
    footer: `<button class="btn btn-outline-secondary" type="button" data-action="modal-close">Skip</button>
      <button class="btn btn-primary" type="submit" form="sessionModalForm">Save session</button>`
  });

  bindForm(card.querySelector('#sessionModalForm'), async formEl => {
    const d = Object.fromEntries(new FormData(formEl));
    const durationMinutes = Number(d.durationMinutes);
    if (!durationMinutes || durationMinutes < 1) { modalError(card, 'Enter at least one minute.'); return; }
    await api(`/api/students/${sid()}/study-sessions`, {
      method: 'POST',
      body: {
        subject: d.subject.trim(),
        durationMinutes,
        startedAt: d.startedAt ? new Date(d.startedAt).toISOString() : null
      }
    });
    timer.subject = d.subject.trim();
    LS.set('timerSubject', timer.subject);
    timer.startedAt = null;
    if (timer.remaining <= 0) timer.remaining = timer.duration;
    timer.endsAt = 0;
    persistTimer();
    closeModal();
    toast('Study session saved.', 'success');
    if (state.page === 'Study Timer') refreshPage();
  });
}

act('timer-toggle', () => { timer.running ? pauseTimer() : startTimer(); });
act('timer-reset', () => resetTimer());
act('timer-save', () => {
  if (timer.running) pauseTimer();
  const elapsed = Math.max(1, Math.round((timer.duration - timer.remaining) / 60));
  openSaveSessionModal(elapsed);
});
act('timer-mode', el => setTimerMode(el.dataset.mode));
act('timer-subject', el => {
  timer.subject = el.value;
  LS.set('timerSubject', timer.subject);
});

function insightsPanelHtml(insights) {
  if (!insights) {
    return emptyState('i-bulb', 'Insights unavailable', 'Record a focus session to unlock your study analytics.');
  }
  const goal = insights.studyGoalMinutes || 300;
  const pct = Math.min(100, Math.round((insights.weekMinutes / goal) * 100));
  const subjects = insights.subjects?.length
    ? `<div class="item-list" style="margin-top:12px">${insights.subjects.slice(0, 5).map(s => `
        <div class="item-row">
          <div class="item-main"><b>${esc(s.subject)}</b><small>${fmtDuration(s.minutes)}</small></div>
          <div class="item-side">${chipsFor(`${Math.round((s.minutes / Math.max(1, insights.totalMinutes)) * 100)}%`, 'blue')}</div>
        </div>`).join('')}</div>`
    : `<p class="tiny muted" style="margin:12px 0 0">No subject data yet.</p>`;

  return `<div class="panel-head">
      <div><h3 class="panel-title">Study insights</h3><p class="panel-sub">Calculated from your recorded sessions and tasks</p></div>
      <span class="chip ${insights.focusScore >= 70 ? 'green' : insights.focusScore >= 40 ? 'amber' : 'red'}">Focus ${insights.focusScore}</span>
    </div>
    <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
      <div class="ring" style="--pct:${insights.focusScore}">
        <div class="ring-inner"><b>${insights.focusScore}</b><small>focus score</small></div>
      </div>
      <div style="flex:1;min-width:190px">
        <div class="meter-list">
          <div>
            <div class="meter-head"><b>This week</b><span>${fmtDuration(insights.weekMinutes)} / ${fmtDuration(goal)}</span></div>
            <div class="progress"><div class="progress-bar ${pct >= 100 ? 'green' : ''}" style="width:${pct}%"></div></div>
          </div>
          <div class="meter-head"><b>Study streak</b><span>${insights.streakDays} day${insights.streakDays === 1 ? '' : 's'}</span></div>
          <div class="meter-head"><b>Average session</b><span>${Math.round(insights.averageSession)} min</span></div>
          <div class="meter-head"><b>Sessions recorded</b><span>${insights.sessions}</span></div>
          <div class="meter-head"><b>Open / overdue tasks</b><span>${insights.openTasks} / ${insights.overdueTasks}</span></div>
        </div>
      </div>
    </div>
    <div class="divider-line"></div>
    ${barChart(insights.days)}
    ${subjects}`;
}

PAGE_RENDER['Study Timer'] = async function renderStudyTimer() {
  const [insights, sessions] = await Promise.all([
    api(`/api/students/${sid()}/insights`).catch(() => null),
    api(`/api/students/${sid()}/study-sessions`).catch(() => [])
  ]);
  state.insights = insights;

  const sessionBody = sessions.length
    ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Subject</th><th>Duration</th><th>Started</th></tr></thead>
        <tbody>${sessions.slice(0, 10).map(s => `<tr>
          <td><b>${esc(s.subject)}</b></td>
          <td>${fmtDuration(s.durationMinutes)}</td>
          <td class="nowrap">${esc(new Date(s.startedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</td>
        </tr>`).join('')}</tbody>
      </table></div>`
    : emptyState('i-timer', 'No sessions yet', 'Finish a focus session and save it to start your history.');

  $('#content').innerHTML = `<div class="page-stack">
    <div class="grid-2 even">
      ${panel('Focus timer', 'Pomodoro and deep-work intervals', `
        <div class="timer-wrap">
          <div class="mode-chips" id="timerModes">
            ${TIMER_MODES.map(m => `<button class="mode-chip ${timer.mode === m.name ? 'active' : ''}" type="button"
              data-action="timer-mode" data-mode="${m.name}">${m.name} · ${m.minutes}m</button>`).join('')}
          </div>
          <div class="timer-ring" id="timerRing" style="--pct:${timer.duration ? Math.min(100, Math.round(((timer.duration - timer.remaining) / timer.duration) * 100)) : 0}">
            <div class="timer-inner">
              <div class="timer-display" id="timerDisplay">${mmss(timer.remaining)}</div>
              <div class="timer-mode" id="timerModeLabel">${esc(timer.mode)}</div>
            </div>
          </div>
          <div class="timer-controls">
            <button class="btn btn-primary" id="timerToggle" type="button" data-action="timer-toggle">${timer.running ? ico('i-pause') + 'Pause' : ico('i-play') + 'Start'}</button>
            <button class="btn btn-outline-secondary" type="button" data-action="timer-reset">${ico('i-refresh')}Reset</button>
            <button class="btn btn-outline-primary" type="button" data-action="timer-save">${ico('i-check')}Save session</button>
          </div>
          <div class="field" style="width:min(100%,360px)">
            <label for="timerSubject">What are you studying?</label>
            <input class="form-control" id="timerSubject" value="${esc(timer.subject)}" maxlength="150" placeholder="e.g. Computer Forensics"
              data-input="timer-subject">
          </div>
        </div>`,
        `<span class="chip ${timer.running ? 'green' : 'outline'}">${timer.running ? 'Running' : 'Ready'}</span>`)}

      <div class="panel">${insightsPanelHtml(insights)}</div>
    </div>

    ${panel('Recent sessions', 'Your last ten recorded sessions', sessionBody,
      `<button class="btn btn-sm btn-outline-primary" data-action="timer-save">${ico('i-plus')}Log manually</button>`)}
  </div>`;

  updateTimerDisplay();
};

/* ---------- alarms ---------- */

function repeatLabel(csv) {
  if (!csv) return 'One-time';
  const parts = String(csv).split(',').filter(Boolean).map(Number).sort((a, b) => a - b);
  if (parts.length === 7) return 'Every day';
  if (parts.join(',') === '1,2,3,4,5') return 'Weekdays';
  if (parts.join(',') === '6,7') return 'Weekend';
  return parts.map(n => DAY_BY_ISO[n]?.short || n).join(' ');
}

function nextAlarmDate(alarm) {
  const [h, m] = fmtTime(alarm.alarmTime).split(':').map(Number);
  const repeat = alarm.repeatDays ? String(alarm.repeatDays).split(',').map(Number) : [];
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const day = addDays(now, i);
    const iso = day.getDay() === 0 ? 7 : day.getDay();
    if (repeat.length && !repeat.includes(iso)) continue;
    const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h || 0, m || 0, 0, 0);
    if (candidate > now) return candidate;
  }
  return null;
}

function untilLabel(date) {
  if (!date) return 'No upcoming run';
  const mins = Math.round((date - Date.now()) / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  return `in ${Math.round(hours / 24)} day${Math.round(hours / 24) === 1 ? '' : 's'}`;
}

function openAlarmModal(item) {
  const isEdit = Boolean(item);
  const repeat = item?.repeatDays ? String(item.repeatDays).split(',') : [];
  const card = openModal({
    title: isEdit ? 'Edit alarm' : 'New alarm',
    subtitle: 'Browser alarms ring while the app is open in a tab.',
    body: `<form id="alarmModalForm">
      <div class="form-grid">
        <div class="field span-2"><label for="amLabel">Label *</label>
          <input class="form-control" id="amLabel" name="label" required maxlength="100" value="${esc(item?.label || 'Study time')}" placeholder="e.g. Wake up for class"></div>
        <div class="field"><label for="amTime">Time *</label>
          <input class="form-control" id="amTime" name="alarmTime" type="time" required value="${esc(fmtTime(item?.alarmTime || '07:00'))}"></div>
        <div class="field"><label for="amTone">Ringtone</label>
          <select class="form-select" id="amTone" name="ringtoneId">
            ${state.ringtones.map(r => `<option value="${r.id}" ${item?.ringtoneId === r.id ? 'selected' : ''}>${esc(r.category)} — ${esc(r.name)}</option>`).join('')}
          </select></div>
        <div class="field span-2"><label>Repeat</label>
          <div class="day-chips">
            ${DAYS.map(d => `<label class="day-chip"><input type="checkbox" name="days" value="${d.iso}" ${repeat.includes(String(d.iso)) ? 'checked' : ''}>${d.short}</label>`).join('')}
          </div>
          <span class="hint">Leave all unchecked for a one-time alarm.</span></div>
        <div class="field span-2">
          <label class="form-check-label" style="display:flex;align-items:center;gap:8px">
            <input class="form-check-input" type="checkbox" name="isEnabled" ${item ? (item.isEnabled ? 'checked' : '') : 'checked'}>
            Alarm is enabled
          </label>
        </div>
      </div>
      <div class="modal-error"></div>
    </form>`,
    footer: `<button class="btn btn-outline-secondary" type="button" data-action="modal-close">Cancel</button>
      ${isEdit ? `<button class="btn btn-outline-danger" type="button" id="alarmDelete">${ico('i-trash')}Delete</button>` : ''}
      <button class="btn btn-primary" type="submit" form="alarmModalForm">${isEdit ? 'Save changes' : 'Create alarm'}</button>`
  });

  card.querySelector('#alarmDelete')?.addEventListener('click', async () => {
    const yes = await askConfirm('Delete alarm', `Remove the ${fmtTime(item.alarmTime)} alarm “${item.label}”?`);
    if (!yes) return;
    await api(`/api/students/${sid()}/alarms/${item.id}`, { method: 'DELETE' });
    closeModal();
    toast('Alarm deleted.', 'success');
    refreshPage();
  });

  bindForm(card.querySelector('#alarmModalForm'), async formEl => {
    const fd = new FormData(formEl);
    const days = fd.getAll('days').map(String).sort((a, b) => Number(a) - Number(b)).join(',');
    const body = {
      label: String(fd.get('label')).trim(),
      alarmTime: String(fd.get('alarmTime')) + ':00',
      isEnabled: fd.get('isEnabled') === 'on',
      repeatDays: days,
      ringtoneId: Number(fd.get('ringtoneId'))
    };
    if (isEdit) await api(`/api/students/${sid()}/alarms/${item.id}`, { method: 'PUT', body });
    else await api(`/api/students/${sid()}/alarms`, { method: 'POST', body });
    closeModal();
    toast(isEdit ? 'Alarm updated.' : 'Alarm created.', 'success');
    refreshPage();
  });
}

act('new-alarm', () => openAlarmModal(null));
act('edit-alarm', el => {
  const item = state.alarms.find(a => a.id === Number(el.dataset.id));
  if (item) openAlarmModal(item);
});
act('delete-alarm', async el => {
  const item = state.alarms.find(a => a.id === Number(el.dataset.id));
  if (!item) return;
  const yes = await askConfirm('Delete alarm', `Remove the ${fmtTime(item.alarmTime)} alarm “${item.label}”?`);
  if (!yes) return;
  await api(`/api/students/${sid()}/alarms/${item.id}`, { method: 'DELETE' });
  toast('Alarm deleted.', 'success');
  refreshPage();
});
act('alarm-toggle', async el => {
  await api(`/api/students/${sid()}/alarms/${el.dataset.id}/enabled`, {
    method: 'PATCH',
    body: el.checked
  });
  const item = state.alarms.find(a => a.id === Number(el.dataset.id));
  if (item) item.isEnabled = el.checked;
  toast(el.checked ? 'Alarm enabled.' : 'Alarm disabled.', 'success');
});
act('alarm-test', el => playToneById(el.dataset.id));
act('request-notify', async () => {
  if (!('Notification' in window)) { toast('This browser does not support notifications.', 'error'); return; }
  const permission = await Notification.requestPermission();
  toast(permission === 'granted' ? 'Notifications enabled.' : 'Notifications were not enabled.', permission === 'granted' ? 'success' : 'error');
});

let alarmCheckTimer = null;

function startAlarmChecker() {
  clearInterval(alarmCheckTimer);
  alarmCheckTimer = setInterval(checkAlarms, 15000);
  setTimeout(checkAlarms, 4000);
}

async function checkAlarms() {
  if (!state.student) return;
  try {
    const alarms = await api(`/api/students/${sid()}/alarms`);
    state.alarms = alarms;
    const now = new Date();
    const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const iso = now.getDay() === 0 ? 7 : now.getDay();
    for (const alarm of alarms) {
      if (!alarm.isEnabled || fmtTime(alarm.alarmTime) !== hm) continue;
      const repeat = alarm.repeatDays ? String(alarm.repeatDays).split(',').map(Number) : [];
      if (repeat.length && !repeat.includes(iso)) continue;
      const firedKey = `fired:${alarm.id}:${toISO(now)}:${hm}`;
      if (sessionStorage.getItem(firedKey)) continue;
      sessionStorage.setItem(firedKey, '1');
      fireAlarm(alarm);
    }
  } catch { /* API offline; try again later */ }
}

function fireAlarm(alarm) {
  if (state.settings?.ringtoneEnabled !== false) playToneById(alarm.ringtoneId);
  toast(`Alarm: ${alarm.label} (${fmtTime(alarm.alarmTime)})`, 'success');
  notifyUser('Uptime alarm', `${alarm.label} · ${fmtTime(alarm.alarmTime)}`);
}

PAGE_RENDER.Alarms = async function renderAlarms() {
  const [alarms, settings] = await Promise.all([
    api(`/api/students/${sid()}/alarms`),
    api(`/api/students/${sid()}/settings`).catch(() => null)
  ]);
  state.alarms = alarms;
  if (settings) state.settings = settings;

  const enabled = alarms.filter(a => a.isEnabled);
  const upcoming = enabled
    .map(a => ({ alarm: a, date: nextAlarmDate(a) }))
    .filter(x => x.date)
    .sort((a, b) => a.date - b.date)[0];

  const listBody = alarms.length
    ? `<div class="item-list">${alarms.map(a => {
      const next = a.isEnabled ? nextAlarmDate(a) : null;
      return `<div class="item-row">
        <div class="item-main">
          <b style="font-size:20px;letter-spacing:-0.03em">${fmtTime(a.alarmTime)}</b>
          <small>${esc(a.label)} · ${esc(repeatLabel(a.repeatDays))} · ${esc(a.ringtone?.name || 'Ringtone')}${next ? ' · rings ' + untilLabel(next) : ''}</small>
        </div>
        <div class="item-side">
          <button class="btn btn-sm btn-outline-primary" data-action="alarm-test" data-id="${a.ringtoneId}" aria-label="Preview ringtone">${ico('i-play')}</button>
          <label class="switch" title="${a.isEnabled ? 'Disable' : 'Enable'} alarm">
            <input type="checkbox" ${a.isEnabled ? 'checked' : ''} data-change="alarm-toggle" data-id="${a.id}">
            <span></span>
          </label>
          <button class="icon-btn" data-action="edit-alarm" data-id="${a.id}" aria-label="Edit alarm">${ico('i-edit')}</button>
          <button class="icon-btn danger" data-action="delete-alarm" data-id="${a.id}" aria-label="Delete alarm">${ico('i-trash')}</button>
        </div>
      </div>`;
    }).join('')}</div>`
    : emptyState('i-bell', 'No alarms yet', 'Create a wake-up alarm or a reminder for your study block.',
        `<button class="btn btn-primary btn-sm" data-action="new-alarm">${ico('i-plus')}Create an alarm</button>`);

  $('#content').innerHTML = `<div class="page-stack">
    <div class="stats-grid three">
      ${statCard('i-bell', '', 'Alarms', alarms.length, `${enabled.length} enabled`)}
      ${statCard('i-clock', 'green', 'Next alarm', upcoming ? fmtTime(upcoming.alarm.alarmTime) : '—', upcoming ? `${upcoming.alarm.label} · ${untilLabel(upcoming.date)}` : 'Nothing scheduled')}
      ${statCard('i-play', 'amber', 'Ringtones', state.ringtones.length, 'Inspired by phone defaults')}
    </div>

    ${panel('Your alarms', 'Toggle, preview, edit or delete', listBody,
      `<button class="btn btn-sm btn-primary" data-action="new-alarm">${ico('i-plus')}New alarm</button>
       <button class="btn btn-sm btn-outline-primary" data-action="request-notify">${ico('i-bell')}Enable notifications</button>`)}

    <div class="grid-2 even">
      ${panel('Ringtone library', 'Tap play to preview', `
        <div class="item-list">${state.ringtones.map(r => `
          <div class="item-row">
            <div class="item-main"><b>${esc(r.name)}</b><small>${esc(r.category)}</small></div>
            <div class="item-side"><button class="btn btn-sm btn-outline-primary" data-action="alarm-test" data-id="${r.id}">${ico('i-play')}Preview</button></div>
          </div>`).join('') || '<div class="empty">No active ringtones.</div>'}</div>`)}
      ${panel('How browser alarms work', 'Honest limits', `
        <div class="note">${ico('i-alert')}Alarms ring while this app is open in a browser tab. Browsers throttle background tabs, so keep the tab visible during a demo. For guaranteed wake-ups use your phone's built-in clock.</div>
        <div class="divider-line"></div>
        <p class="small muted" style="margin:0 0 8px">Uptime stores the alarm in the database and checks every 15 seconds. When it fires you get a sound, an in-app toast and a desktop notification (if permitted).</p>
        <button class="btn btn-sm btn-outline-primary" data-action="request-notify">${ico('i-bell')}Allow desktop notifications</button>`)}
    </div>
  </div>`;
};

/* ---------- research hub ---------- */

const RESOURCES = [
  { name: 'Google Scholar', mark: 'GS', cat: 'Search', url: 'https://scholar.google.com', desc: 'Broad academic search across journals, theses and books. Use “Cited by” to trace a paper forward.', tip: 'Best first stop for almost any topic.' },
  { name: 'Semantic Scholar', mark: 'SS', cat: 'Search', url: 'https://www.semanticscholar.org', desc: 'AI-assisted discovery with citation context and one-line TLDR summaries.', tip: 'Great for understanding a paper fast.' },
  { name: 'Connected Papers', mark: 'CP', cat: 'Search', url: 'https://www.connectedpapers.com', desc: 'Builds a visual graph of related work around one seed paper.', tip: 'Use it to map a whole literature review.' },
  { name: 'DOAJ', mark: 'DO', cat: 'Journals', url: 'https://doaj.org', desc: 'Directory of vetted open-access, peer-reviewed journals.', tip: 'Everything here is free to read legally.' },
  { name: 'PubMed', mark: 'PM', cat: 'Journals', url: 'https://pubmed.ncbi.nlm.nih.gov', desc: 'Biomedical and health sciences literature from the US National Library of Medicine.', tip: 'Use MeSH terms for precise medical searches.' },
  { name: 'JSTOR', mark: 'JS', cat: 'Journals', url: 'https://www.jstor.org', desc: 'Archive of humanities and social science journals and books.', tip: 'Often available through your campus library.' },
  { name: 'WorldCat', mark: 'WC', cat: 'Libraries', url: 'https://search.worldcat.org', desc: 'Find books, theses and media in libraries worldwide.', tip: 'Check your library before buying anything.' },
  { name: 'Google Books', mark: 'GB', cat: 'Books', url: 'https://books.google.com', desc: 'Search inside books and preview chapters or quotations.', tip: 'Use it to verify a page number quickly.' },
  { name: 'ZoteroBib', mark: 'ZB', cat: 'Cite', url: 'https://zbib.org', desc: 'Free citation builder for APA, MLA, Harvard, Chicago and more.', tip: 'Paste a URL or ISBN and it formats the reference.' },
  { name: 'Purdue OWL', mark: 'OWL', cat: 'Write', url: 'https://owl.purdue.edu', desc: 'Authoritative guidance on academic writing, structure and referencing.', tip: 'The APA and MLA style guides are especially clear.' },
  { name: 'Grammarly', mark: 'G', cat: 'Write', url: 'https://www.grammarly.com', desc: 'Grammar, clarity and tone checking with a generous free tier.', tip: 'Use it on the final draft, never the first.' },
  { name: 'Our World in Data', mark: 'OWD', cat: 'Data', url: 'https://ourworldindata.org', desc: 'Open datasets, charts and explanations for global issues.', tip: 'Every chart lists its original data source.' },
  { name: 'Statista', mark: 'ST', cat: 'Data', url: 'https://www.statista.com', desc: 'Market and industry statistics with limited free access.', tip: 'Always cite the original source behind a Statista chart.' },
  { name: 'Wikipedia', mark: 'W', cat: 'Reference', url: 'https://www.wikipedia.org', desc: 'Background orientation only. Follow the citations to primary sources.', tip: 'Never cite Wikipedia in an academic assignment.' }
];

function researchCard(r) {
  return `<div class="resource-card">
    <div class="resource-top">
      <span class="resource-mark">${esc(r.mark)}</span>
      <div><h4>${esc(r.name)}</h4><span class="tag rowcount">${esc(r.cat)}</span></div>
    </div>
    <p>${esc(r.desc)}</p>
    <div class="resource-foot">
      <span class="tiny muted">${esc(r.tip)}</span>
      <a class="btn btn-sm btn-outline-primary" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${ico('i-external')}Open</a>
    </div>
  </div>`;
}

const CRAAP = [
  { key: 'currency', title: 'Currency', detail: 'Is the information recent enough for your topic?' },
  { key: 'relevance', title: 'Relevance', detail: 'Does it actually answer your research question?' },
  { key: 'authority', title: 'Authority', detail: 'Who wrote it, and what are their credentials?' },
  { key: 'accuracy', title: 'Accuracy', detail: 'Is the evidence cited, verifiable and unbiased?' },
  { key: 'purpose', title: 'Purpose', detail: 'Why was it written — to inform, persuade or sell?' }
];

function renderResearchGrid() {
  const host = $('#resourceGrid');
  if (!host) return;
  const filter = state.ui.researchFilter || 'All';
  const items = filter === 'All' ? RESOURCES : RESOURCES.filter(r => r.cat === filter);
  host.innerHTML = items.map(researchCard).join('');
  $$('#researchFilters .mode-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.filter === filter));
  const count = $('#researchCount');
  if (count) count.textContent = `${items.length} source${items.length === 1 ? '' : 's'}`;
}

function renderCraap() {
  const host = $('#craapList');
  if (!host) return;
  const done = LS.get('craap', {});
  host.innerHTML = CRAAP.map(item => `<label class="check-item ${done[item.key] ? 'done' : ''}">
    <input type="checkbox" ${done[item.key] ? 'checked' : ''} data-change="craap-toggle" data-key="${item.key}">
    <span><b>${esc(item.title)}</b><br><span class="tiny muted">${esc(item.detail)}</span></span>
  </label>`).join('');
}

PAGE_RENDER['Research Hub'] = async function renderResearchHub() {
  const categories = ['All', ...Array.from(new Set(RESOURCES.map(r => r.cat)))];
  state.ui.researchFilter = state.ui.researchFilter || 'All';

  $('#content').innerHTML = `<div class="page-stack">
    ${panel('Research source navigator', 'Real, credible websites — open them in a new tab', `
      <div class="filter-bar" id="researchFilters" style="margin-bottom:12px">
        ${categories.map(c => `<button class="mode-chip ${state.ui.researchFilter === c ? 'active' : ''}" type="button"
          data-action="research-filter" data-filter="${c}">${c}</button>`).join('')}
        <span class="chip outline" id="researchCount" style="margin-left:auto"></span>
      </div>
      <div class="resource-grid" id="resourceGrid"></div>`,
      `<button class="btn btn-sm btn-outline-primary" data-action="goto" data-page="Assignment Helper">${ico('i-wand')}Citation builder</button>`)}

    <div class="grid-2">
      ${panel('A repeatable research workflow', 'Seven steps from question to reference list', `
        <div class="check-list">
          ${[
            ['Define the question', 'Turn the brief into one answerable question with a scope and a timeframe.'],
            ['Build keywords', 'List synonyms and technical terms; combine them with AND / OR.'],
            ['Search three places', 'A general scholar index, a subject database and your library catalogue.'],
            ['Evaluate with CRAAP', 'Score each source for currency, relevance, authority, accuracy and purpose.'],
            ['Take notes with page numbers', 'Copy the exact quotation and the page reference while reading.'],
            ['Outline before drafting', 'One sentence per paragraph plus the evidence it will use.'],
            ['Cite as you write', 'Build the reference list as you go — never leave it to the last hour.']
          ].map(([title, detail], i) => `<div class="check-item" style="cursor:default">
            <span class="planner-num">${i + 1}</span>
            <span><b>${esc(title)}</b><br><span class="tiny muted">${esc(detail)}</span></span>
          </div>`).join('')}
        </div>`)}
      <div class="panel">
        <div class="panel-head"><div><h3 class="panel-title">CRAAP test</h3><p class="panel-sub">Tick each box before you trust a source</p></div>
          <span class="chip blue">${CRAAP.length} checks</span></div>
        <div class="check-list" id="craapList"></div>
        <div class="note" style="margin-top:12px">${ico('i-bulb')}If a source fails two or more checks, find a better one. Your marker can tell the difference.</div>
      </div>
    </div>

    <div class="alert-strip info">${ico('i-link')}Your campus library pays for databases you cannot reach through a normal search. Log in through the library portal first, then open JSTOR, EBSCO or ProQuest.</div>
  </div>`;

  renderResearchGrid();
  renderCraap();
};

act('research-filter', el => {
  state.ui.researchFilter = el.dataset.filter;
  renderResearchGrid();
});
act('craap-toggle', el => {
  const done = LS.get('craap', {});
  done[el.dataset.key] = el.checked;
  LS.set('craap', done);
  el.closest('.check-item')?.classList.toggle('done', el.checked);
});

/* ---------- study lab ---------- */

const STUDY_TIPS = [
  {
    key: 'recall', title: 'Active recall', icon: 'i-bulb',
    evidence: 'Testing yourself beats re-reading by a wide margin in controlled studies.',
    steps: ['Close the book and write everything you remember.', 'Check against your notes.', 'Repeat only the gaps tomorrow.']
  },
  {
    key: 'spacing', title: 'Spaced repetition', icon: 'i-clock',
    evidence: 'Reviewing at increasing intervals produces stronger long-term retention.',
    steps: ['Review after 1 day, 3 days, 1 week, 3 weeks.', 'Use flashcards for facts and definitions.', 'Keep sessions short but regular.']
  },
  {
    key: 'interleave', title: 'Interleaving', icon: 'i-grid',
    evidence: 'Mixing problem types improves discrimination and transfer between topics.',
    steps: ['Alternate two related subjects in one session.', 'Mix old and new question types.', 'Accept that it feels harder — that is the point.']
  },
  {
    key: 'feynman', title: 'Feynman technique', icon: 'i-wand',
    evidence: 'Explaining a concept in plain language exposes gaps in understanding.',
    steps: ['Write the concept at the top of a page.', 'Explain it as if to a first-year student.', 'Find and fix every vague sentence.']
  },
  {
    key: 'pomodoro', title: 'Focused intervals', icon: 'i-timer',
    evidence: 'Short, protected focus blocks reduce fatigue and procrastination.',
    steps: ['25 minutes on, 5 minutes off.', 'After four rounds take a 15–30 minute break.', 'Log each session in the timer.']
  },
  {
    key: 'sleep', title: 'Sleep and memory', icon: 'i-moon',
    evidence: 'Consolidation happens during sleep; all-nighters measurably hurt recall.',
    steps: ['Aim for 7–9 hours before an exam.', 'Review briefly, then sleep.', 'Avoid screens for the last 30 minutes.']
  }
];

const STUDY_CHECKLIST = [
  'I know the format, length and weighting of the assessment.',
  'I have the marking rubric open next to my notes.',
  'My phone is on silent and out of reach.',
  'I have a water bottle and a clear desk.',
  'I know which three tasks I will finish in this session.',
  'I have scheduled a short break.'
];

function studyRecommendation(insights) {
  if (!insights) {
    return { title: 'Start with one honest session', body: 'Run a 25-minute focus block and log it. Everything else in the Study Lab gets sharper once there is data to work with.', page: 'Study Timer', action: 'Open the timer' };
  }
  if (insights.overdueTasks > 0) {
    return { title: 'Clear the overdue backlog first', body: `You have ${insights.overdueTasks} overdue task${insights.overdueTasks === 1 ? '' : 's'}. Spend ten minutes breaking the oldest one into a single next action, then do it in a 25-minute block.`, page: 'Tasks', action: 'Review tasks' };
  }
  if (insights.streakDays === 0) {
    return { title: 'Rebuild the streak today', body: 'Your streak has reset. One short session is enough to restart it — consistency matters more than length.', page: 'Study Timer', action: 'Start a session' };
  }
  if (insights.averageSession < 15) {
    return { title: 'Stretch your focus window', body: `Your average session is ${Math.round(insights.averageSession)} minutes. Try one Deep Work block this week and remove notifications for the first 20 minutes.`, page: 'Study Timer', action: 'Try deep work' };
  }
  if (insights.focusScore < 50) {
    return { title: 'Protect three fixed study slots', body: 'Your focus score is still building. Put three recurring study blocks in your timetable and treat them like lectures.', page: 'Timetable', action: 'Plan the week' };
  }
  return { title: 'You are in a good rhythm', body: `${insights.streakDays} days of momentum and a focus score of ${insights.focusScore}. Keep the weekly goal in sight and use active recall for the next session.`, page: 'Study Timer', action: 'Keep going' };
}

function renderStudyChecklist() {
  const host = $('#studyChecklist');
  if (!host) return;
  const done = LS.get('studyChecklist', {});
  host.innerHTML = STUDY_CHECKLIST.map((text, i) => `<label class="check-item ${done[i] ? 'done' : ''}">
    <input type="checkbox" ${done[i] ? 'checked' : ''} data-change="study-check" data-index="${i}">
    <span>${esc(text)}</span>
  </label>`).join('');
}

PAGE_RENDER['Study Lab'] = async function renderStudyLab() {
  const insights = await api(`/api/students/${sid()}/insights`).catch(() => null);

  $('#content').innerHTML = `<div class="page-stack">
    <div class="alert-strip info">${ico('i-bulb')}<span><b>${esc(studyRecommendation(insights).title)}.</b> ${esc(studyRecommendation(insights).body)}</span>
      <button class="btn btn-sm btn-outline-primary" data-action="goto" data-page="${esc(studyRecommendation(insights).page)}">${esc(studyRecommendation(insights).action)}</button></div>

    <div class="section-head">
      <div><h2>Evidence-based techniques</h2><p>Six methods with a strong research base — pick one and use it today.</p></div>
    </div>

    <div class="grid-3">
      ${STUDY_TIPS.map(tip => `<div class="tip-card">
        <h4><span>${ico(tip.icon)}</span>${esc(tip.title)}</h4>
        <p>${esc(tip.evidence)}</p>
        <ol class="tip-steps">${tip.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      </div>`).join('')}
    </div>

    <div class="grid-2 even">
      ${panel('Pre-session checklist', 'Two minutes now saves an hour later', `<div class="check-list" id="studyChecklist"></div>`,
        `<span class="chip outline">Saved locally</span>`)}
      ${panel('Your numbers', 'From the current week', insights ? `
        <div class="meter-list">
          <div><div class="meter-head"><b>Weekly focus minutes</b><span>${insights.weekMinutes} / ${insights.studyGoalMinutes}</span></div>
            <div class="progress"><div class="progress-bar" style="width:${Math.min(100, Math.round(insights.weekMinutes / Math.max(1, insights.studyGoalMinutes) * 100))}%"></div></div></div>
          <div class="meter-head"><b>Streak</b><span>${insights.streakDays} day${insights.streakDays === 1 ? '' : 's'}</span></div>
          <div class="meter-head"><b>Average session</b><span>${Math.round(insights.averageSession)} min</span></div>
          <div class="meter-head"><b>Overdue tasks</b><span>${insights.overdueTasks}</span></div>
        </div>
        <div class="divider-line"></div>
        ${barChart(insights.days)}` : `<div class="empty">Record a session to unlock your numbers.</div>`,
        `<button class="btn btn-sm btn-outline-primary" data-action="goto" data-page="Study Timer">${ico('i-timer')}Timer</button>`)}
    </div>
  </div>`;

  renderStudyChecklist();
};

act('study-check', el => {
  const done = LS.get('studyChecklist', {});
  done[el.dataset.index] = el.checked;
  LS.set('studyChecklist', done);
  el.closest('.check-item')?.classList.toggle('done', el.checked);
});

/* ---------- database & ERD ---------- */

const ERD_ROOT = {
  name: 'UptimeStudentProfiles',
  note: 'One row per local student profile',
  cols: [
    ['Id', 'integer', 'PK'], ['FirstName', 'varchar(80)', ''],
    ['LastName', 'varchar(80)', ''], ['PreferredName', 'varchar(80)', ''],
    ['InstitutionName', 'varchar(150)', ''], ['Email', 'varchar(150)', 'unique'],
    ['PhotoUrl', 'varchar(300)', ''], ['CreatedAt', 'timestamp', ''],
    ['UpdatedAt', 'timestamp', '']
  ]
};

const ERD_CHILDREN = [
  {
    name: 'UptimeClassSchedules', rel: 'has', note: 'Weekly classes',
    cols: [['Id', 'integer', 'PK'], ['StudentId', 'integer', 'FK'], ['Course', 'varchar(150)', ''],
      ['DayOfWeek', 'varchar(10)', ''], ['StartTime', 'time', ''], ['EndTime', 'time', ''],
      ['Venue', 'varchar(150)', ''], ['Instructor', 'varchar(120)', '']]
  },
  {
    name: 'UptimeCalendarEvents', rel: 'has', note: 'One-off events',
    cols: [['Id', 'integer', 'PK'], ['StudentId', 'integer', 'FK'], ['Title', 'varchar(150)', ''],
      ['EventDate', 'date', ''], ['EventTime', 'time', ''], ['Description', 'varchar(1000)', '']]
  },
  {
    name: 'UptimeStudentTasks', rel: 'has', note: 'Tasks and deadlines',
    cols: [['Id', 'integer', 'PK'], ['StudentId', 'integer', 'FK'], ['Title', 'varchar(180)', ''],
      ['Description', 'varchar(1000)', ''], ['DueDate', 'date nullable', ''],
      ['Status', 'varchar(20)', ''], ['Priority', 'varchar(20)', ''], ['CreatedAt', 'timestamp', '']]
  },
  {
    name: 'UptimeExpenses', rel: 'has', note: 'Budget entries',
    cols: [['Id', 'integer', 'PK'], ['StudentId', 'integer', 'FK'], ['Name', 'varchar(150)', ''],
      ['Amount', 'numeric(10,2)', ''], ['Category', 'varchar(50)', ''], ['ExpenseDate', 'date', '']]
  },
  {
    name: 'UptimeStudySessions', rel: 'has', note: 'Focus history',
    cols: [['Id', 'integer', 'PK'], ['StudentId', 'integer', 'FK'], ['Subject', 'varchar(150)', ''],
      ['DurationMinutes', 'integer', ''], ['StartedAt', 'timestamp', '']]
  },
  {
    name: 'UptimeAlarms', rel: 'has', note: 'Alarms',
    cols: [['Id', 'integer', 'PK'], ['StudentId', 'integer', 'FK'], ['Label', 'varchar(100)', ''],
      ['AlarmTime', 'time', ''], ['IsEnabled', 'boolean', ''], ['RepeatDays', 'varchar(13)', ''],
      ['RingtoneId', 'integer', 'FK'], ['CreatedAt', 'timestamp', ''], ['UpdatedAt', 'timestamp', '']]
  },
  {
    name: 'UptimeStudentSettings', rel: 'has one', note: 'Preferences (1:1)',
    cols: [['Id', 'integer', 'PK'], ['StudentId', 'integer', 'FK unique'], ['ReminderMinutes', 'integer', ''],
      ['NotificationsEnabled', 'boolean', ''], ['RingtoneEnabled', 'boolean', ''],
      ['Volume', 'integer', ''], ['MonthlyBudgetLimit', 'numeric(10,2)', '']]
  },
  {
    name: 'UptimeRingtones', rel: 'is referenced by', note: 'Seeded ringtone library',
    cols: [['Id', 'integer', 'PK'], ['Name', 'varchar(80)', ''], ['Category', 'varchar(40)', ''],
      ['AudioFilePath', 'varchar(250)', ''], ['IsActive', 'boolean', '']]
  }
];

function erdCols(cols) {
  return `<div class="erd-cols">${cols.map(([name, type, tag]) => `
    <div class="erd-col"><span>${esc(name)}</span><em>${tag === 'PK' ? 'PK' : tag === 'FK' ? 'FK' : ''} ${esc(type)}</em></div>`).join('')}</div>`;
}

function erdHtml() {
  return `<div class="erd-tree">
    <div class="erd-root">
      <div class="erd-root-head"><b>${esc(ERD_ROOT.name)}</b><span class="tag pk">root</span></div>
      <p class="tiny muted" style="margin:0 0 8px">${esc(ERD_ROOT.note)}</p>
      ${erdCols(ERD_ROOT.cols)}
    </div>
    <div class="erd-children">
      ${ERD_CHILDREN.map(t => `<div class="erd-table">
        <div class="erd-table-head"><b>${esc(t.name)}</b><span class="tag fk">${esc(t.rel)}</span></div>
        <p class="tiny muted" style="margin:0 0 6px">${esc(t.note)}</p>
        ${erdCols(t.cols)}
      </div>`).join('')}
    </div>
  </div>
  <div class="erd-legend">
    <span><span class="tag pk">PK</span> primary key</span>
    <span><span class="tag fk">FK</span> foreign key</span>
    <span>All student tables cascade on profile delete</span>
    <span>UptimeAlarms → UptimeRingtones is restricted</span>
  </div>`;
}

function erdMermaid() {
  const lines = ['erDiagram'];
  ERD_CHILDREN.filter(t => t.name !== 'UptimeRingtones').forEach(t => {
    lines.push(`    UptimeStudentProfiles ||--o{ ${t.name} : "${t.rel}"`);
  });
  lines.push('    UptimeRingtones ||--o{ UptimeAlarms : "is used by"');
  return lines.join('\n');
}

function formatCell(value) {
  if (value === null || value === undefined) return '<span class="muted">—</span>';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const text = String(value);
  return esc(text.length > 70 ? text.slice(0, 70) + '…' : text);
}

function resultTable(columns, rows, totalRows) {
  if (!columns?.length) return emptyState('i-database', 'No columns returned', 'The query produced no result set.');
  return `<div class="table-wrap"><table class="table">
    <thead><tr>${columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${(rows || []).length
      ? rows.map(row => `<tr>${columns.map(c => `<td>${formatCell(row[c])}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columns.length}" class="muted" style="padding:18px;text-align:center">No rows match this query.</td></tr>`}
    </tbody></table></div>
    ${totalRows !== undefined ? `<p class="tiny muted" style="margin:7px 0 0">${rows.length} preview row${rows.length === 1 ? '' : 's'} · ${totalRows} total row${totalRows === 1 ? '' : 's'} in the table.</p>` : ''}`;
}

PAGE_RENDER.Database = async function renderDatabase() {
  const [schema, queries] = await Promise.all([
    api('/api/meta/schema').catch(() => null),
    api('/api/meta/queries').catch(() => [])
  ]);
  state.ui.dbSchema = schema;
  state.ui.dbQueries = queries;

  $('#content').innerHTML = `<div class="page-stack">
    <div class="panel">
      <div class="panel-head">
        <div><h3 class="panel-title">${esc(schema?.provider || 'Live')} schema explorer</h3>
          <p class="panel-sub">Read live metadata from <b>INFORMATION_SCHEMA</b>. Nothing is mutated.</p></div>
        <div class="panel-actions">
          <div class="tabs" role="tablist">
            <button class="tab ${state.ui.dbTab === 'erd' ? 'active' : ''}" data-action="db-tab" data-tab="erd">ERD</button>
            <button class="tab ${state.ui.dbTab === 'schema' ? 'active' : ''}" data-action="db-tab" data-tab="schema">Tables</button>
            <button class="tab ${state.ui.dbTab === 'sql' ? 'active' : ''}" data-action="db-tab" data-tab="sql">SQL Lab</button>
          </div>
          <button class="btn btn-sm btn-outline-primary" data-action="db-refresh">${ico('i-refresh')}Refresh</button>
        </div>
      </div>
      ${schema ? `<div class="db-summary">
        <div><b>${esc(schema.database)}</b><small>database</small></div>
        <div><b>${schema.tableCount}</b><small>tables</small></div>
        <div><b>${schema.totalRows}</b><small>total rows</small></div>
        <div><b>${schema.relationships?.length || 0}</b><small>relationships</small></div>
        <div><b>${new Date(schema.generatedAt).toLocaleTimeString('en-GB')}</b><small>snapshot time</small></div>
      </div>` : `<div class="alert-strip">${ico('i-alert')}The schema endpoint did not respond. Check that the database is reachable and the API is online.</div>`}
      <div id="dbTabBody" style="margin-top:16px"></div>
    </div>

    <div class="grid-2 even">
      ${panel('Present the database live', 'Tools your audience already trusts', `
        <div class="item-list">
          <div class="item-row"><div class="item-main"><b>VS Code mssql extension</b><small>The saved 192.168.1.162 / Uptime connection browses tables and runs T-SQL without leaving the editor.</small></div>
            <button class="btn btn-sm btn-outline-primary" data-action="copy-text" data-clipboard="sqlcmd -S 192.168.1.162 -E -d Uptime -Q &quot;SELECT * FROM dbo.UptimeStudentProfiles&quot;" data-label="sqlcmd command copied">${ico('i-copy')}Copy</button></div>
          <div class="item-row"><div class="item-main"><b>SQL Server Management Studio</b><small>Official GUI — expand Databases → Uptime → Tables.</small></div>
            <a class="btn btn-sm btn-outline-primary" href="https://learn.microsoft.com/sql/ssms/download-sql-server-management-studio-ssms" target="_blank" rel="noopener noreferrer">${ico('i-external')}Get it</a></div>
          <div class="item-row"><div class="item-main"><b>Azure Data Studio</b><small>Free cross-platform database client with notebooks and an ER view.</small></div>
            <a class="btn btn-sm btn-outline-primary" href="https://azure.microsoft.com/products/data-studio" target="_blank" rel="noopener noreferrer">${ico('i-external')}Get it</a></div>
          <div class="item-row"><div class="item-main"><b>Supabase Table Editor</b><small>Second live view when presenting from the hosted PostgreSQL path.</small></div>
            <a class="btn btn-sm btn-outline-primary" href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">${ico('i-external')}Supabase</a></div>
        </div>`)}
      ${panel('Commands for the demo', 'Run these in a terminal', `
        <pre class="code">sqlcmd -S 192.168.1.162 -E -d Uptime

SELECT * FROM dbo.UptimeStudentProfiles;
SELECT s.FirstName, COUNT(e.Id) AS expenses,
       SUM(e.Amount) AS total
FROM dbo.UptimeStudentProfiles s
JOIN dbo.UptimeExpenses e ON e.StudentId = s.Id
GROUP BY s.Id, s.FirstName;</pre>
        <div class="note" style="margin-top:10px">${ico('i-alert')}Use square brackets when a name needs quoting: [UptimeStudentProfiles].</div>`)}
    </div>
  </div>`;

  renderDbTab();
};

function renderDbTab() {
  const host = $('#dbTabBody');
  if (!host) return;
  $$('.tab[data-tab]').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === state.ui.dbTab));

  if (state.ui.dbTab === 'erd') {
    host.innerHTML = `<div class="panel-head" style="margin-bottom:6px">
        <div><h4 class="panel-title">Entity relationship diagram</h4>
        <p class="panel-sub">Nine tables · every child row carries a StudentId foreign key.</p></div>
        <button class="btn btn-sm btn-outline-primary" data-action="copy-mermaid">${ico('i-copy')}Copy Mermaid</button>
      </div>
      ${erdHtml()}`;
    return;
  }

  if (state.ui.dbTab === 'schema') {
    const schema = state.ui.dbSchema;
    if (!schema) {
      host.innerHTML = emptyState('i-database', 'Schema unavailable', 'Check that the database is reachable, then refresh the page.');
      return;
    }
    host.innerHTML = `<div class="db-layout">
      <div class="panel db-side">
        <h4 class="panel-title" style="margin-bottom:8px">Tables</h4>
        <div class="query-list" id="dbTableList">
          ${schema.tables.map(t => `<button type="button" data-action="db-table" data-name="${esc(t.name)}" class="${state.ui.dbTable === t.name ? 'active' : ''}">
            <b>${esc(t.name)}</b><small>${t.rowCount} rows · ${t.columns.length} columns</small>
          </button>`).join('')}
        </div>
      </div>
      <div class="panel" id="dbPreview"></div>
    </div>`;

    if (!state.ui.dbTable || !schema.tables.some(t => t.name === state.ui.dbTable)) {
      state.ui.dbTable = schema.tables[0]?.name || null;
    }
    if (state.ui.dbTable) loadTablePreview(state.ui.dbTable);
    return;
  }

  const queries = state.ui.dbQueries || [];
  host.innerHTML = `<div class="sql-layout">
    <div class="panel">
      <h4 class="panel-title" style="margin-bottom:8px">Curated queries</h4>
      <div class="query-list" id="dbQueryList">
        ${queries.map(q => `<button type="button" data-action="db-query" data-key="${esc(q.key)}" class="${state.ui.dbQueryKey === q.key ? 'active' : ''}">
          <b>${esc(q.title)}</b><small>${esc(q.description)}</small>
        </button>`).join('') || '<p class="tiny muted">No curated queries found.</p>'}
      </div>
      <div class="note" style="margin-top:10px">${ico('i-check-circle')}Only these read-only statements are executed. User SQL is never accepted.</div>
    </div>
    <div class="panel" id="dbQueryHost">
      ${emptyState('i-play', 'Choose a query', 'Pick a curated statement to see the SQL and its live result.')}
    </div>
  </div>`;

  if (queries.length) {
    const key = state.ui.dbQueryKey && queries.some(q => q.key === state.ui.dbQueryKey)
      ? state.ui.dbQueryKey
      : queries[0].key;
    loadQuery(key);
  }
}

async function loadTablePreview(name) {
  state.ui.dbTable = name;
  $$('#dbTableList button').forEach(btn => btn.classList.toggle('active', btn.dataset.name === name));
  const host = $('#dbPreview');
  if (!host) return;
  host.innerHTML = `<div class="loading"><div class="spinner"></div>Reading ${esc(name)}…</div>`;
  try {
    const preview = await api(`/api/meta/tables/${encodeURIComponent(name)}?limit=10`);
    if (state.ui.dbTable !== name) return;
    const meta = state.ui.dbSchema?.tables.find(t => t.name === name);
    host.innerHTML = `<div class="panel-head">
        <div><h4 class="panel-title">${esc(name)}</h4>
        <p class="panel-sub">${preview.totalRows} rows · showing ${preview.rows.length}</p></div>
        <span class="tag rowcount">${esc(state.ui.dbSchema?.database || 'Uptime')}</span>
      </div>
      ${resultTable(preview.columns, preview.rows, preview.totalRows)}
      ${meta ? `<div class="divider-line"></div><div class="meter-list">${meta.columns.slice(0, 8).map(c => `
        <div class="meter-head"><b>${esc(c.name)}</b><span>${esc(c.type)}${c.isPrimaryKey ? ' · PK' : ''}${c.references ? ' · → ' + esc(c.references) : ''}</span></div>`).join('')}</div>` : ''}`;
  } catch (err) {
    host.innerHTML = emptyState('i-alert', 'Could not read the table', err.message);
  }
}

async function loadQuery(key) {
  state.ui.dbQueryKey = key;
  $$('#dbQueryList button').forEach(btn => btn.classList.toggle('active', btn.dataset.key === key));
  const host = $('#dbQueryHost');
  if (!host) return;
  host.innerHTML = `<div class="loading"><div class="spinner"></div>Running query…</div>`;
  try {
    const result = await api(`/api/meta/queries/${encodeURIComponent(key)}`);
    if (state.ui.dbQueryKey !== key) return;
    host.innerHTML = `<div class="panel-head">
        <div><h4 class="panel-title">${esc(result.title)}</h4>
        <p class="panel-sub">Executed in ${Number(result.elapsedMs).toFixed(1)} ms on ${esc(state.ui.dbSchema?.provider || 'the database')}</p></div>
        <button class="btn btn-sm btn-outline-primary" data-action="copy-text" data-clipboard="${esc(result.sql)}" data-label="SQL copied">${ico('i-copy')}Copy SQL</button>
      </div>
      <pre class="code" style="margin-bottom:13px">${esc(result.sql)}</pre>
      ${resultTable(result.columns, result.rows)}`;
  } catch (err) {
    host.innerHTML = emptyState('i-alert', 'Query failed', err.message);
  }
}

act('db-tab', el => { state.ui.dbTab = el.dataset.tab; renderDbTab(); });
act('db-table', el => loadTablePreview(el.dataset.name));
act('db-query', el => loadQuery(el.dataset.key));
act('db-refresh', () => {
  state.ui.dbSchema = null;
  state.ui.dbTable = null;
  refreshPage();
});
act('copy-mermaid', () => copyText(erdMermaid(), 'Mermaid ERD copied'));

/* ---------- API workflow ---------- */

const API_GROUPS = [
  {
    title: 'Health and profiles',
    desc: 'Create a student, read it back, inspect settings.',
    endpoints: [
      ['GET', '/health', 'API and database availability'],
      ['GET', '/api/students', 'List every profile'],
      ['POST', '/api/students', 'Create a profile'],
      ['GET', '/api/students/{id}', 'Read one profile'],
      ['PUT', '/api/students/{id}', 'Update a profile'],
      ['GET', '/api/students/{id}/settings', 'Read preferences'],
      ['PUT', '/api/students/{id}/settings', 'Save preferences'],
      ['POST', '/api/students/{id}/photo', 'Upload a profile photo (multipart, field “file”)'],
      ['DELETE', '/api/students/{id}/photo', 'Remove the profile photo'],
      ['GET', '/api/students/{id}/export', 'Download a full JSON backup']
    ]
  },
  {
    title: 'Planning',
    desc: 'Timetable, calendar events and tasks.',
    endpoints: [
      ['GET', '/api/students/{id}/dashboard', 'Dashboard summary'],
      ['GET', '/api/students/{id}/classes', 'List weekly classes'],
      ['POST', '/api/students/{id}/classes', 'Add a class'],
      ['PUT', '/api/students/{id}/classes/{itemId}', 'Edit a class'],
      ['DELETE', '/api/students/{id}/classes/{itemId}', 'Delete a class'],
      ['GET', '/api/students/{id}/events', 'List calendar events'],
      ['POST', '/api/students/{id}/events', 'Add an event'],
      ['GET', '/api/students/{id}/tasks', 'List tasks'],
      ['POST', '/api/students/{id}/tasks', 'Add a task'],
      ['PUT', '/api/students/{id}/tasks/{itemId}', 'Update a task'],
      ['DELETE', '/api/students/{id}/tasks/{itemId}', 'Delete a task']
    ]
  },
  {
    title: 'Calendar sync',
    desc: 'Interoperability with Google, Outlook and Apple calendars.',
    endpoints: [
      ['GET', '/api/students/{id}/calendar/ics', 'Live iCalendar feed (subscribe)'],
      ['GET', '/api/students/{id}/calendar/ics/download', 'Download the .ics file'],
      ['POST', '/api/students/{id}/calendar/import', 'Import an .ics file'],
      ['GET', '/api/students/{id}/calendar/clashes', 'Detect overlapping classes and events']
    ]
  },
  {
    title: 'Student life',
    desc: 'Money, focus sessions, alarms and ringtones.',
    endpoints: [
      ['GET', '/api/students/{id}/expenses', 'List expenses'],
      ['POST', '/api/students/{id}/expenses', 'Record an expense'],
      ['GET', '/api/students/{id}/study-sessions', 'Recent focus sessions'],
      ['POST', '/api/students/{id}/study-sessions', 'Save a session'],
      ['GET', '/api/students/{id}/insights', 'Focus analytics and streaks'],
      ['GET', '/api/students/{id}/alarms', 'List alarms'],
      ['POST', '/api/students/{id}/alarms', 'Create an alarm'],
      ['PATCH', '/api/students/{id}/alarms/{itemId}/enabled', 'Toggle an alarm'],
      ['GET', '/api/ringtones', 'Active ringtone library']
    ]
  },
  {
    title: 'Metadata and demo',
    desc: 'The endpoints that drive the database and presentation pages.',
    endpoints: [
      ['GET', '/api/meta/schema', 'Live schema, row counts and relationships'],
      ['GET', '/api/meta/tables/{table}?limit=10', 'Allow-listed table preview'],
      ['GET', '/api/meta/queries', 'Curated SQL library'],
      ['GET', '/api/meta/queries/{key}', 'Run one curated query'],
      ['POST', '/api/demo/seed', 'Create the classroom demo profile'],
      ['POST', '/api/demo/reset', 'Rebuild the demo profile']
    ]
  }
];

function apiPath(path) {
  return path
    .replace('{id}', String(sid() || 1))
    .replace('{itemId}', '1')
    .replace('{table}', 'UptimeStudentProfiles')
    .replace('{key}', 'budget-by-category');
}

function apiUrl(path) {
  return location.origin + apiPath(path);
}

function endpointHtml(method, path, note) {
  const verb = method.toLowerCase();
  const canTry = method === 'GET';
  return `<div class="endpoint">
    <span class="method ${verb}">${method}</span>
    <div class="endpoint-main">
      <code>${esc(path)}</code>
      <small>${esc(note)}</small>
    </div>
    <div class="endpoint-actions">
      ${canTry ? `<button class="btn btn-sm btn-outline-primary" type="button" data-action="api-try" data-path="${esc(path)}">${ico('i-play')}Try</button>` : ''}
      <button class="icon-btn" type="button" data-action="copy-curl" data-method="${method}" data-path="${esc(path)}" aria-label="Copy curl">${ico('i-copy')}</button>
    </div>
  </div>`;
}

async function apiTry(path) {
  const card = openModal({
    title: 'Live API response',
    subtitle: path,
    size: 'wide',
    body: `<div class="loading"><div class="spinner"></div>Calling the API…</div>`,
    footer: `<button class="btn btn-primary" type="button" data-action="modal-close">Close</button>`
  });
  const body = card.querySelector('.modal-body');
  try {
    const data = await api(apiPath(path));
    body.innerHTML = `<pre class="code" style="max-height:56vh">${esc(JSON.stringify(data, null, 2))}</pre>`;
  } catch (err) {
    body.innerHTML = `<div class="alert-strip">${ico('i-alert')}${esc(err.message)}</div>`;
  }
}

act('api-try', el => apiTry(el.dataset.path));
act('copy-curl', el => {
  const method = el.dataset.method;
  const url = apiUrl(el.dataset.path);
  const curl = method === 'GET'
    ? `curl -X GET "${url}" -H "Accept: application/json"`
    : `curl -X ${method} "${url}" -H "Content-Type: application/json" -d '{}'`;
  copyText(curl, 'curl command copied');
});

PAGE_RENDER['API Workflow'] = async function renderApiWorkflow() {
  const flow = [
    ['Profile', 'Create or load a student', 'i-grid'],
    ['Timetable', 'Add weekly classes', 'i-week'],
    ['Calendar', 'Subscribe or import', 'i-calendar'],
    ['Tasks', 'Plan the work', 'i-check'],
    ['Budget', 'Track spending', 'i-wallet'],
    ['Focus', 'Record sessions', 'i-timer'],
    ['Present', 'Show the live data', 'i-present']
  ];

  $('#content').innerHTML = `<div class="page-stack">
    ${panel('The API workflow', 'One resource graph, seven demo steps', `
      <div class="flow-rail">
        ${flow.map(([title, detail, icon], i) => `<div class="flow-step">
          <span>${i + 1}</span><b>${esc(title)}</b><small>${esc(detail)}</small>
        </div>`).join('')}
      </div>
      <div class="alert-strip info" style="margin-top:14px">${ico('i-api')}Every screen in this app is powered by these endpoints. Swagger is the fastest way to prove it in Q&amp;A.
        <a class="btn btn-sm btn-outline-primary" href="/swagger" target="_blank" rel="noopener noreferrer">${ico('i-external')}Open Swagger UI</a>
      </div>`, `<span class="chip blue">${API_GROUPS.reduce((n, g) => n + g.endpoints.length, 0)} endpoints</span>`)}

    <div class="grid-2 even">
      ${panel('Base URL and headers', 'Local development', `
        <div class="code">${esc(location.origin)}</div>
        <div class="hero-actions">
          <button class="btn btn-sm btn-primary" data-action="copy-text" data-clipboard="${esc(location.origin)}" data-label="Base URL copied">${ico('i-copy')}Copy base URL</button>
          <a class="btn btn-sm btn-outline-primary" href="/swagger" target="_blank" rel="noopener noreferrer">${ico('i-external')}Swagger</a>
          <a class="btn btn-sm btn-outline-primary" href="/health" target="_blank" rel="noopener noreferrer">${ico('i-check-circle')}Health</a>
        </div>
        <div class="divider-line"></div>
        <p class="small muted" style="margin:0">Requests and responses use JSON. Dates are ISO <code>yyyy-MM-dd</code>; times are <code>HH:mm:ss</code>; money is a JSON number. There is no authentication in this local build.</p>`)}
      ${panel('Suggested walkthrough', 'A story your audience can follow', `
        <div class="check-list">
          ${[
            'GET /api/students — show the profile row.',
            'GET /api/students/{id}/classes — show the timetable.',
            'GET /api/students/{id}/calendar/ics — subscribe from Google Calendar.',
            'POST /api/students/{id}/tasks — add a task, then GET it back.',
            'GET /api/students/{id}/insights — show computed study analytics.',
            'GET /api/meta/schema — prove the database tables exist.',
            'POST /api/demo/reset — restore a clean demo in seconds.'
          ].map((text, i) => `<div class="check-item" style="cursor:default">
            <span class="planner-num">${i + 1}</span><span>${esc(text)}</span>
          </div>`).join('')}
        </div>`)}
    </div>

    ${API_GROUPS.map(group => panel(group.title, group.desc,
      group.endpoints.map(([method, path, note]) => endpointHtml(method, path, note)).join(''),
      `<span class="chip outline">${group.endpoints.length}</span>`)).join('')}
  </div>`;
};

/* ---------- presentation kit ---------- */

const RUN_SHEET = [
  ['0:00', 'Open with the student problem', 'Six apps, missed deadlines, no single source of truth.'],
  ['1:00', 'Show the dashboard', 'One profile ties the whole day together.'],
  ['2:30', 'Timetable and calendar sync', 'Show the weekly board, then the .ics feed.'],
  ['4:00', 'Tasks and assignment planner', 'Generate milestones, push them to the board.'],
  ['5:30', 'Budget and focus timer', 'Record an expense, run a session, show insights.'],
  ['7:00', 'Live database', 'Database tab: ERD, previews, SQL Lab. SSMS or pgAdmin is a second view.'],
  ['8:30', 'Swagger walkthrough', 'Call GET /api/students and /api/meta/schema.'],
  ['10:00', 'Architecture and close', 'ASP.NET Core → EF Core → database. Questions.'],
  ['12:00', 'Reset the demo', 'One click restores a clean dataset.']
];

const PREFLIGHT = [
  'The database answers on the configured server (SQL Server locally, PostgreSQL on Render).',
  'The API starts with F5 or scripts/run.ps1 without errors.',
  '/health shows API + database online.',
  'The demo profile is loaded from the Presentation Kit.',
  'Swagger opens at /swagger and Try it out works.',
  'Browser zoom is at 100% and notifications are allowed.',
  'A fallback screenshot folder is ready in case Wi-Fi fails.'
];

const QA = [
  ['Which database does it use?', 'The same EF Core model runs on SQL Server 2019 on the campus network — Windows Authentication means no password in code or config — and on PostgreSQL for the public Render demo. UPTIME_DB_PROVIDER picks the provider, so one codebase serves both.'],
  ['How are the tables related?', 'UptimeStudentProfiles is the parent. Classes, events, tasks, expenses, study sessions, alarms and settings each carry a StudentId foreign key with cascade delete. Alarms also reference UptimeRingtones with a restricted delete.'],
  ['How does Google Calendar sync work?', 'The API generates a standards-compliant iCalendar feed (RFC 5545). Google Calendar, Outlook and Apple Calendar subscribe to that URL. Classes become weekly recurring events and tasks become all-day events. We can also import an .ics export.'],
  ['Is the SQL Lab dangerous?', 'No. It only executes a fixed allow-list of curated SELECT statements. Table previews are limited to an allow-list of known tables and 50 rows. No user-supplied SQL is executed.'],
  ['How are photos stored?', 'The browser sends multipart/form-data. The API validates the extension, MIME type and magic bytes, rejects anything over 2 MB, renames the file with a GUID and stores it under wwwroot/uploads/avatars.'],
  ['What would you add next?', 'Authentication with ASP.NET Core Identity, push notifications for alarms, a mobile client against the same API, and automated tests around the calendar clash logic.'],
  ['Where is the connection string?', 'In .NET user-secrets locally or the UPTIME_DB_CONNECTION environment variable in hosting. scripts/connect-sqlserver.ps1 saves the campus SQL Server connection (Windows Authentication); on Render the same variable is injected from the managed PostgreSQL database. Credentials are never committed to source control.']
];

function renderRunSheet() {
  const host = $('#runSheet');
  if (!host) return;
  const done = LS.get('runSheet', {});
  host.innerHTML = RUN_SHEET.map(([time, title, detail], i) => `<label class="run-item ${done[i] ? 'done' : ''}">
    <input type="checkbox" ${done[i] ? 'checked' : ''} data-change="run-toggle" data-index="${i}">
    <div><b>${esc(title)}</b><small>${esc(detail)}</small></div>
    <span class="run-time">${esc(time)}</span>
  </label>`).join('');
}

function renderPreflight() {
  const host = $('#preflight');
  if (!host) return;
  const done = LS.get('preflight', {});
  host.innerHTML = PREFLIGHT.map((text, i) => `<label class="check-item ${done[i] ? 'done' : ''}">
    <input type="checkbox" ${done[i] ? 'checked' : ''} data-change="preflight-toggle" data-index="${i}">
    <span>${esc(text)}</span>
  </label>`).join('');
}

PAGE_RENDER['Presentation Kit'] = async function renderPresentationKit() {
  const links = [
    ['Swagger UI', '/swagger', 'Interactive API explorer'],
    ['Health check', '/health', 'API and database status'],
    ['Download .ics', `/api/students/${sid()}/calendar/ics/download`, 'Calendar feed file'],
    ['JSON backup', `/api/students/${sid()}/export`, 'Every row for this student'],
    ['Schema JSON', '/api/meta/schema', 'Tables, columns and relationships']
  ];

  $('#content').innerHTML = `<div class="page-stack">
    <section class="welcome">
      <div class="welcome-copy">
        <p class="eyebrow">DEMO DAY</p>
        <h2>Present Uptime with confidence.</h2>
        <p>A twelve-minute run sheet, the exact talking points, and a clean demo dataset you can rebuild in one click.</p>
        <div class="welcome-tags"><span>.NET 10</span><span>PostgreSQL 15</span><span>Swagger</span><span>RFC 5545</span></div>
        <div class="hero-actions">
          <button class="btn btn-primary btn-sm" data-action="demo-seed">${ico('i-spark')}Load demo profile</button>
          <button class="btn btn-outline-primary btn-sm" data-action="goto" data-page="Database">${ico('i-database')}Open live ERD</button>
        </div>
      </div>
      <div class="hero-panel">
        <div><b>${esc(displayName(state.student))}</b><small>${esc(state.student?.institutionName || '')}</small></div>
      </div>
    </section>

    <div class="grid-2">
      ${panel('Run sheet', 'Tick as you go — saved in this browser', `<div class="run-list" id="runSheet"></div>`,
        `<button class="btn btn-sm btn-outline-primary" data-action="copy-run-sheet">${ico('i-copy')}Copy outline</button>`)}
      <div>
        ${panel('Demo data', 'A clean dataset in one click', `
          <p class="small muted" style="margin:0 0 11px">The demo profile is identified by <b>demo@uptime.local</b>. Resetting only affects seeded data.</p>
          <div class="hero-actions" style="margin-top:0">
            <button class="btn btn-primary btn-sm" data-action="demo-seed">${ico('i-spark')}Seed demo</button>
            <button class="btn btn-outline-danger btn-sm" data-action="demo-reset">${ico('i-refresh')}Reset demo</button>
            <button class="btn btn-outline-primary btn-sm" data-action="export-json">${ico('i-download')}JSON backup</button>
          </div>
          <div class="divider-line"></div>
          <div class="item-list">
            ${links.map(([label, href, note]) => `<div class="item-row">
              <div class="item-main"><b>${esc(label)}</b><small>${esc(note)}</small></div>
              <a class="btn btn-sm btn-outline-primary" href="${href}" target="_blank" rel="noopener noreferrer">${ico('i-external')}Open</a>
            </div>`).join('')}
          </div>`)}
      </div>
    </div>

    <div class="grid-3">
      <div class="say-card"><b>${ico('i-spark')}Opening line</b>
        <p>“Students do not lack apps. They lack one place where the timetable, the deadline and the money all agree with each other.”</p></div>
      <div class="say-card"><b>${ico('i-database')}Database line</b>
        <p>“This is not a mock-up. Every table you see is a live database table, read through INFORMATION_SCHEMA seconds ago.”</p></div>
      <div class="say-card"><b>${ico('i-api')}API line</b>
        <p>“The same data powers the interface and the API. Here it is in Swagger: I will call it once and you will see the row come back.”</p></div>
    </div>

    <div class="grid-2 even">
      ${panel('Pre-flight checklist', 'Run this five minutes before you present', `<div class="check-list" id="preflight"></div>`)}
      ${panel('Q&A preparation', 'Answers to the questions lecturers ask', `
        ${QA.map(([q, a]) => `<details class="qa"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}`)}
    </div>

    ${panel('If something breaks', 'Stay calm, stay credible', `
      <div class="grid-3">
        <div class="say-card"><b>${ico('i-alert')}API will not start</b><p>Check the terminal for the database error. Run <b>scripts/setup-database.ps1</b> again, then <b>scripts/run.ps1 -Open</b>.</p></div>
        <div class="say-card"><b>${ico('i-alert')}Pages look empty</b><p>Open <b>/health</b>. If the database is offline, start it (SQL Server service locally, Render dashboard in the cloud); if the API is offline, press F5 in VS Code.</p></div>
        <div class="say-card"><b>${ico('i-alert')}Live demo fails</b><p>Switch to the screenshots and walk through the ERD and Swagger documents. The architecture story still lands.</p></div>
      </div>`)}
  </div>`;

  renderRunSheet();
  renderPreflight();
};

act('run-toggle', el => {
  const done = LS.get('runSheet', {});
  done[el.dataset.index] = el.checked;
  LS.set('runSheet', done);
  el.closest('.run-item')?.classList.toggle('done', el.checked);
});
act('preflight-toggle', el => {
  const done = LS.get('preflight', {});
  done[el.dataset.index] = el.checked;
  LS.set('preflight', done);
  el.closest('.check-item')?.classList.toggle('done', el.checked);
});
act('copy-run-sheet', () => {
  copyText(RUN_SHEET.map(([time, title, detail]) => `${time} — ${title}: ${detail}`).join('\n'), 'Run sheet copied');
});
act('demo-reset', async () => {
  const yes = await askConfirm(
    'Reset the demo profile',
    'This deletes and rebuilds the demo student (demo@uptime.local) and every row linked to it. Other profiles are untouched.',
    'Reset demo'
  );
  if (!yes) return;
  const result = await api('/api/demo/reset', { method: 'POST' });
  state.students = await api('/api/students');
  state.student = state.students.find(s => s.id === result.studentId) || state.students[0] || null;
  if (state.student) LS.set('studentId', state.student.id);
  updateChrome();
  toast('Demo profile rebuilt from scratch.', 'success');
  refreshPage();
});
act('export-json', () => {
  if (!state.student) return;
  window.location.href = `/api/students/${sid()}/export`;
});

/* ---------- settings ---------- */

async function uploadPhoto(file) {
  if (!file) return;
  if (!/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error('Choose a JPG, PNG or WebP image.');
  if (file.size > 2 * 1024 * 1024) throw new Error('Profile photos must be 2 MB or smaller.');
  const data = new FormData();
  data.append('file', file);
  const result = await api(`/api/students/${sid()}/photo`, { method: 'POST', body: data });
  state.student.photoUrl = result.photoUrl;
  updateChrome();
  toast('Profile photo updated.', 'success');
  refreshPage();
}

act('remove-photo', async () => {
  const yes = await askConfirm('Remove photo', 'Your initials will be shown instead. This does not delete the profile.');
  if (!yes) return;
  const profile = await api(`/api/students/${sid()}/photo`, { method: 'DELETE' });
  state.student.photoUrl = profile?.photoUrl || null;
  updateChrome();
  toast('Photo removed.', 'success');
  refreshPage();
});

act('pick-photo', () => $('#photoInput')?.click());
act('switch-profile', async () => {
  const students = await api('/api/students');
  state.students = students;
  openModal({
    title: 'Switch profile',
    subtitle: 'Each profile owns a separate set of rows in PostgreSQL.',
    body: `<div class="item-list">${students.map(s => `<div class="item-row">
        ${avatarHtml(s)}
        <div class="item-main"><b>${esc(displayName(s))}</b><small>${esc(s.institutionName)} · ${esc(s.email || 'no email')}</small></div>
        <div class="item-side">${s.id === state.student?.id
          ? '<span class="chip green">Current</span>'
          : `<button class="btn btn-sm btn-outline-primary" data-action="select-student" data-id="${s.id}">Use</button>`}</div>
      </div>`).join('')}</div>
      <div class="divider">or</div>
      <button class="btn btn-outline-primary w-100" data-action="new-profile">${ico('i-plus')}Create another profile</button>`,
    footer: `<button class="btn btn-outline-secondary" data-action="modal-close">Close</button>`
  });
});

act('select-student', async el => {
  const student = state.students.find(s => s.id === Number(el.dataset.id));
  if (!student) return;
  state.student = student;
  state.settings = await api(`/api/students/${student.id}/settings`).catch(() => null);
  LS.set('studentId', student.id);
  updateChrome();
  closeModal();
  toast(`Switched to ${displayName(student)}.`, 'success');
  showPage('Settings', { pushHash: false });
});

act('new-profile', () => {
  closeModal();
  LS.del('studentId');
  state.student = null;
  state.settings = null;
  updateChrome();
  showPage('Dashboard', { pushHash: false });
});

act('forget-profile', async () => {
  const yes = await askConfirm('Forget this browser profile', 'Uptime will ask you to choose or create a profile again. Nothing is deleted from PostgreSQL.', 'Forget', false);
  if (!yes) return;
  LS.del('studentId');
  state.student = null;
  state.students = [];
  updateChrome();
  showPage('Dashboard', { pushHash: false });
});

PAGE_RENDER.Settings = async function renderSettings() {
  const settings = await api(`/api/students/${sid()}/settings`).catch(() => ({
    reminderMinutes: 60,
    notificationsEnabled: true,
    ringtoneEnabled: true,
    volume: 70,
    monthlyBudgetLimit: 500
  }));
  state.settings = settings;
  const profile = state.student;

  $('#content').innerHTML = `<div class="page-stack">
    <div class="grid-2 even">
      ${panel('Student profile', 'Shown across the application and the API', `
        <div class="profile-block">
          ${avatarHtml(profile)}
          <div>
            <h3>${esc(displayName(profile))}</h3>
            <p>${esc(profile.firstName)} ${esc(profile.lastName)} · ${esc(profile.institutionName)}</p>
            <p>${esc(profile.email || 'No email on file')}</p>
            <div class="profile-actions">
              <button class="btn btn-sm btn-outline-primary" data-action="pick-photo">${ico('i-camera')}Change photo</button>
              ${profile.photoUrl ? `<button class="btn btn-sm btn-ghost" data-action="remove-photo">${ico('i-trash')}Remove</button>` : ''}
              <button class="btn btn-sm btn-ghost" data-action="switch-profile">${ico('i-refresh')}Switch</button>
            </div>
          </div>
        </div>
        <div class="divider-line"></div>
        <div class="dropzone" id="photoDrop">
          ${ico('i-camera')}
          <div><b>Drop a photo here</b><small>JPG, PNG or WebP · maximum 2 MB · cropped to a circle</small></div>
        </div>
        <input type="file" id="photoInput" accept="image/jpeg,image/png,image/webp" hidden>
        <p class="tiny muted" style="margin:8px 0 0">The API checks the file signature, not just the extension, before saving.</p>`,
        `<button class="btn btn-sm btn-outline-primary" data-action="export-json">${ico('i-download')}Backup</button>`)}

      ${panel('Profile details', 'Updates the UptimeStudentProfiles row', `
        <form id="profileForm">
          <div class="form-grid">
            <div class="field"><label for="pfFirst">First name *</label>
              <input class="form-control" id="pfFirst" name="firstName" required maxlength="80" value="${esc(profile.firstName)}"></div>
            <div class="field"><label for="pfLast">Last name *</label>
              <input class="form-control" id="pfLast" name="lastName" required maxlength="80" value="${esc(profile.lastName)}"></div>
            <div class="field"><label for="pfPref">Preferred name</label>
              <input class="form-control" id="pfPref" name="preferredName" maxlength="80" value="${esc(profile.preferredName || '')}"></div>
            <div class="field"><label for="pfInst">Institution *</label>
              <input class="form-control" id="pfInst" name="institutionName" required minlength="2" maxlength="150" value="${esc(profile.institutionName)}"></div>
            <div class="field span-2"><label for="pfMail">Email</label>
              <input class="form-control" id="pfMail" name="email" type="email" maxlength="150" value="${esc(profile.email || '')}"></div>
          </div>
          <button class="btn btn-primary" style="margin-top:12px" type="submit">${ico('i-check')}Save profile</button>
        </form>`)}
    </div>

    <div class="grid-2 even">
      ${panel('Preferences', 'Stored in UptimeStudentSettings', `
        <form id="prefsForm">
          <div class="form-grid">
            <div class="field"><label for="prReminder">Reminder lead time (minutes)</label>
              <input class="form-control" id="prReminder" name="reminderMinutes" type="number" min="1" max="1440" value="${settings.reminderMinutes}"></div>
            <div class="field"><label for="prBudget">Monthly budget limit (N$)</label>
              <input class="form-control" id="prBudget" name="monthlyBudgetLimit" type="number" min="0.01" step="0.01" value="${settings.monthlyBudgetLimit}"></div>
            <div class="field span-2"><label for="prVolume">Alarm volume: <span id="volumeValue">${settings.volume}</span>%</label>
              <input class="form-control" id="prVolume" name="volume" type="range" min="0" max="100" value="${settings.volume}" data-input="volume-label"></div>
          </div>
          <div class="divider-line"></div>
          <div class="setting-row">
            <div><b>Desktop notifications</b><small>Show alarms and reminders as system notifications.</small></div>
            <label class="switch"><input type="checkbox" name="notificationsEnabled" ${settings.notificationsEnabled ? 'checked' : ''}><span></span></label>
          </div>
          <div class="setting-row">
            <div><b>Ringtone sound</b><small>Play the selected ringtone when an alarm fires.</small></div>
            <label class="switch"><input type="checkbox" name="ringtoneEnabled" ${settings.ringtoneEnabled ? 'checked' : ''}><span></span></label>
          </div>
          <button class="btn btn-primary" style="margin-top:13px" type="submit">${ico('i-check')}Save preferences</button>
        </form>`)}
      <div>
        ${panel('Appearance', 'Choose a theme for this browser', `
          <div class="theme-picker">
            <button class="theme-option ${document.documentElement.dataset.theme !== 'dark' ? 'active' : ''}" type="button" data-action="theme-set" data-theme="light">
              <span class="theme-swatch light"></span>Light
            </button>
            <button class="theme-option ${document.documentElement.dataset.theme === 'dark' ? 'active' : ''}" type="button" data-action="theme-set" data-theme="dark">
              <span class="theme-swatch dark"></span>Dark
            </button>
          </div>
          <div class="divider-line"></div>
          <p class="small muted" style="margin:0">The theme is saved in localStorage and applied instantly. It does not change your database records.</p>`)}

        ${panel('Data and demo', 'Backup, switch or reset', `
          <div class="item-list">
            <div class="item-row"><div class="item-main"><b>JSON backup</b><small>Every related row for this student.</small></div>
              <button class="btn btn-sm btn-outline-primary" data-action="export-json">${ico('i-download')}Download</button></div>
            <div class="item-row"><div class="item-main"><b>Calendar export</b><small>Download the .ics file.</small></div>
              <a class="btn btn-sm btn-outline-primary" href="/api/students/${sid()}/calendar/ics/download">${ico('i-download')}.ics</a></div>
            <div class="item-row"><div class="item-main"><b>Switch profile</b><small>Choose another student in the database.</small></div>
              <button class="btn btn-sm btn-outline-primary" data-action="switch-profile">${ico('i-refresh')}Switch</button></div>
            <div class="item-row"><div class="item-main"><b>Forget this browser</b><small>Does not delete anything from PostgreSQL.</small></div>
              <button class="btn btn-sm btn-ghost" data-action="forget-profile">Forget</button></div>
          </div>`)}
      </div>
    </div>

    ${panel('About Uptime', 'Built for the classroom demo', `
      <div class="grid-3">
        <div><b class="small">Stack</b><p class="tiny muted" style="margin:3px 0 0">ASP.NET Core 10 · EF Core 10 · SQL Server 2019 / PostgreSQL · Swagger/OpenAPI · vanilla JS</p></div>
        <div><b class="small">Developer</b><p class="tiny muted" style="margin:3px 0 0">Reinhold IT Solutions · Reinhold Shilongo</p></div>
        <div><b class="small">Version</b><p class="tiny muted" style="margin:3px 0 0">1.0 · local development build · ${new Date().getFullYear()}</p></div>
      </div>`)}
  </div>`;

  bindForm('#profileForm', async el => {
    const d = Object.fromEntries(new FormData(el));
    const updated = await api(`/api/students/${sid()}`, { method: 'PUT', body: d });
    state.student = updated;
    updateChrome();
    toast('Profile saved.', 'success');
  });

  bindForm('#prefsForm', async el => {
    const fd = new FormData(el);
    const body = {
      reminderMinutes: Number(fd.get('reminderMinutes')),
      monthlyBudgetLimit: Number(fd.get('monthlyBudgetLimit')),
      volume: Number(fd.get('volume')),
      notificationsEnabled: el.querySelector('[name=notificationsEnabled]').checked,
      ringtoneEnabled: el.querySelector('[name=ringtoneEnabled]').checked
    };
    state.settings = await api(`/api/students/${sid()}/settings`, { method: 'PUT', body });
    toast('Preferences saved.', 'success');
  });

  const drop = $('#photoDrop');
  const input = $('#photoInput');
  if (drop && input) {
    drop.addEventListener('click', () => input.click());
    input.addEventListener('change', () => uploadPhoto(input.files?.[0]).catch(err => toast(err.message, 'error')));
    drop.addEventListener('dragover', ev => { ev.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', ev => {
      ev.preventDefault();
      drop.classList.remove('dragover');
      uploadPhoto(ev.dataTransfer.files?.[0]).catch(err => toast(err.message, 'error'));
    });
  }
};

act('volume-label', el => {
  const out = $('#volumeValue');
  if (out) out.textContent = el.value;
});

/* ---------- global events ---------- */

function onGlobalClick(ev) {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'modal-close') {
    closeModal();
    return;
  }
  const fn = ACTIONS[action];
  if (!fn) return;
  ev.preventDefault();
  fn(el, ev);
}

function onGlobalChange(ev) {
  const el = ev.target.closest('[data-change]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.change];
  if (fn) fn(el, ev);
}

function onGlobalInput(ev) {
  const el = ev.target.closest('[data-input]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.input];
  if (fn) fn(el, ev);
}

function onGlobalKey(ev) {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
    ev.preventDefault();
    openCommandPalette();
    return;
  }
  if (ev.key === 'Escape') {
    if (!$('#commandPalette')?.hidden) { closeCommandPalette(); return; }
    if ($('#modalRoot')?.innerHTML) { closeModal(); return; }
    closeDrawer();
  }
  if (ev.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) {
    ev.preventDefault();
    openCommandPalette();
  }
}

function bindGlobalEvents() {
  document.addEventListener('click', onGlobalClick);
  document.addEventListener('change', onGlobalChange);
  document.addEventListener('input', onGlobalInput);
  document.addEventListener('keydown', onGlobalKey);
  window.addEventListener('hashchange', routeFromHash);

  $('#navigation')?.addEventListener('click', ev => {
    const btn = ev.target.closest('.nav-link[data-page]');
    if (btn) showPage(btn.dataset.page);
  });
  $('#paletteInput')?.addEventListener('input', ev => renderPalette(ev.target.value));
  $('#paletteInput')?.addEventListener('keydown', onPaletteKey);
  $('#paletteList')?.addEventListener('click', ev => {
    const btn = ev.target.closest('[data-palette-index]');
    if (!btn) return;
    const entry = paletteRows[Number(btn.dataset.paletteIndex)];
    closeCommandPalette();
    if (entry) entry.run();
  });
}

/* ---------- bootstrap ---------- */

async function init() {
  applyTheme(LS.get('theme', 'light'));
  updateTodayLabel();
  bindGlobalEvents();

  try {
    state.ringtones = await api('/api/ringtones');
  } catch {
    state.ringtones = [];
  }

  try {
    state.students = await api('/api/students');
    const saved = Number(LS.get('studentId', 0));
    state.student = state.students.find(s => s.id === saved) || state.students[0] || null;
    if (state.student) {
      LS.set('studentId', state.student.id);
      state.settings = await api(`/api/students/${state.student.id}/settings`).catch(() => null);
    }
  } catch (err) {
    state.students = [];
    state.student = null;
    toast('Could not reach the API. Start the project, then reload this page.', 'error');
  }

  updateChrome();
  await checkHealth();
  restoreTimer();
  startAlarmChecker();
  updateFloatingTimer();

  const initial = location.hash
    ? nameFromSlug(location.hash.replace(/^#\/?/, '').split('?')[0])
    : 'Dashboard';
  showPage(initial, { pushHash: false });

  setInterval(checkHealth, 60000);
}

init();



