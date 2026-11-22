// UI wiring only. Rules live in ./logic; persistence in ./storage.js.
import { exerciseSuggestions } from './logic/entries.js';
import { logEntry, deleteEntry, feedbackFor, summarize } from './logic/progression.js';
import {
  activeProfile,
  createProfile,
  deleteProfile,
  profileStats,
  replaceProfile,
  switchProfile,
  updateProfile,
} from './logic/profiles.js';
import { fromKg, roundTenth } from './logic/units.js';
import { loadApp, saveApp } from './storage.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};
const NEW_PROFILE = '__new__';

let app = loadApp(window.localStorage);
let lastProfileId = null; // to reset per-profile form defaults on switch (R1.6)

function commit(next) {
  app = next;
  saveApp(window.localStorage, app); // R4.1
  render();
}

// ---------- routing ----------
function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  if (!activeProfile(app) || hash === 'new') return 'new';
  return hash === 'profile' ? 'profile' : 'log';
}

// ---------- rendering ----------
function fmtWhen(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function entryItem(e, isPb, withDelete) {
  const li = el('li');
  const what = el('span', 'what');
  what.append(`${e.exercise} `, el('span', 'num', `${e.sets} × ${e.reps} @ ${e.weight} ${e.unit}`));
  if (isPb) what.append(el('span', 'tag-pb', 'PB'));
  li.append(what, el('span', 'when', fmtWhen(e.loggedAt)));
  if (withDelete) {
    const x = el('button', 'btn-x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', `Delete ${e.exercise} from ${fmtWhen(e.loggedAt)}`);
    x.addEventListener('click', () => {
      const p = activeProfile(app);
      commit(replaceProfile(app, deleteEntry(p, e.id))); // R1.4
    });
    li.append(x);
  }
  return li;
}

function renderSwitcher(profile) {
  const sel = $('profile-switch');
  const opts = app.profiles.map((p) => {
    const o = el('option', null, p.name);
    o.value = p.id;
    return o;
  });
  const add = el('option', null, '+ New profile');
  add.value = NEW_PROFILE;
  sel.replaceChildren(...opts, add);
  sel.value = profile ? profile.id : NEW_PROFILE;
}

function renderStatus(stats) {
  $('level').textContent = stats.level;
  $('xp-current').textContent = stats.xp.current;
  $('xp-needed').textContent = stats.xp.needed;
  $('xp-total').textContent = stats.totalXp;
  $('pb-levels').textContent = stats.pbLevels;
  $('xp-fill').style.width = `${(stats.xp.current / stats.xp.needed) * 100}%`;
  $('xp-bar').setAttribute('aria-valuenow', String(stats.xp.current));
}

function renderLog(profile) {
  if (profile.id !== lastProfileId) {
    $('unit').value = profile.unit; // R1.6
    $('log-form').reset();
    $('unit').value = profile.unit;
    $('log-error').textContent = '';
    $('pb-alert').hidden = true;
  }
  $('exercise-list').replaceChildren(
    ...exerciseSuggestions(profile.entries).map((name) => {
      const o = el('option');
      o.value = name;
      return o;
    }),
  );
  const { pbIds } = summarize(profile.entries);
  const recent = [...profile.entries].reverse().slice(0, 6);
  $('recent').replaceChildren(...recent.map((e) => entryItem(e, pbIds.has(e.id), false)));
  $('recent-empty').hidden = recent.length > 0;
}

function renderProfile(profile, stats) {
  $('profile-title').textContent = profile.name;
  $('profile-goal').textContent = profile.goal ? `Goal: ${profile.goal}` : '';
  $('st-level').textContent = stats.level;
  $('st-xp').textContent = stats.totalXp;
  $('st-entries').textContent = stats.entryCount;
  $('st-sets').textContent = stats.totalSets;
  $('st-bw').textContent =
    profile.bodyWeightKg == null ? '—' : `${roundTenth(fromKg(profile.bodyWeightKg, profile.unit))} ${profile.unit}`;

  $('records').replaceChildren(
    ...stats.records.map((r) => {
      const li = el('li');
      li.append(el('span', null, r.name), el('span', 'num', r.display));
      return li;
    }),
  );
  $('records-empty').hidden = stats.records.length > 0;

  const { pbIds } = summarize(profile.entries);
  const all = [...profile.entries].reverse();
  $('history').replaceChildren(...all.map((e) => entryItem(e, pbIds.has(e.id), true)));
  $('history-empty').hidden = all.length > 0;

  const form = $('edit-profile-form');
  if (profile.id !== lastProfileId || !form.contains(document.activeElement)) {
    form.elements.name.value = profile.name;
    form.elements.unit.value = profile.unit;
    form.elements.bodyWeight.value =
      profile.bodyWeightKg == null ? '' : roundTenth(fromKg(profile.bodyWeightKg, profile.unit));
    form.elements.goal.value = profile.goal;
  }
  $('bw-unit').textContent = `(${form.elements.unit.value}, optional)`;
}

function render() {
  const page = route();
  const profile = activeProfile(app);
  renderSwitcher(profile);

  $('onboard-page').hidden = page !== 'new';
  $('log-page').hidden = page !== 'log';
  $('profile-page').hidden = page !== 'profile';
  $('status').hidden = !profile;
  $('nav').querySelectorAll('a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === page);
    a.hidden = !profile;
  });

  if (profile) {
    const stats = profileStats(profile);
    renderStatus(stats);
    renderLog(profile);
    renderProfile(profile, stats);
  }
  lastProfileId = profile ? profile.id : null;
}

// ---------- R6 feedback ----------
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function retrigger(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth; // restart the CSS animation
  node.classList.add(cls);
}

function popXp(text, anchor) {
  const layer = $('fx-layer');
  const box = anchor.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top;
  const pop = el('div', 'xp-pop', text);
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  layer.append(pop);
  setTimeout(() => pop.remove(), 1400);
  if (reducedMotion()) return;
  for (let i = 0; i < 14; i += 1) {
    const s = el('div', 'spark');
    const angle = (Math.PI * 2 * i) / 14;
    const dist = 50 + Math.random() * 50;
    s.style.left = `${x}px`;
    s.style.top = `${y + box.height / 2}px`;
    s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    layer.append(s);
    setTimeout(() => s.remove(), 900);
  }
}

let pbTimer;
function showPb(event) {
  const box = $('pb-alert');
  box.replaceChildren(
    el('strong', null, 'New personal best'),
    el('span', null, `${event.exercise}: ${event.weight} ${event.unit} × ${event.reps} · +1 level`),
  );
  box.hidden = false;
  retrigger(box, 'pb-alert');
  clearTimeout(pbTimer);
  pbTimer = setTimeout(() => { box.hidden = true; }, 4500);
}

let ascendTimer;
function showLevelUp(event) {
  $('ascend-level').textContent = `Level ${event.level}`;
  $('ascend').hidden = false;
  retrigger($('level-badge'), 'pulse');
  if (!reducedMotion()) retrigger(document.body, 'shake');
  clearTimeout(ascendTimer);
  ascendTimer = setTimeout(hideLevelUp, 2800);
}
function hideLevelUp() {
  $('ascend').hidden = true;
}

function playFeedback(events) {
  retrigger($('log-btn'), 'struck');
  retrigger($('xp-bar'), 'flash');
  for (const ev of events) {
    if (ev.type === 'xp') popXp(ev.text, $('log-btn'));
    if (ev.type === 'pb') showPb(ev);
    if (ev.type === 'level') setTimeout(() => showLevelUp(ev), reducedMotion() ? 0 : 450);
  }
}

// ---------- events ----------
function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

$('log-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const profile = activeProfile(app);
  const r = logEntry(profile, formValues(e.target));
  $('log-error').textContent = r.ok ? '' : r.error;
  if (!r.ok) return;
  commit(replaceProfile(app, r.profile));
  playFeedback(feedbackFor(r.result));
  // R7.2: keep exercise, weight, and unit so a repeat log is one click.
});

$('new-profile-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const r = createProfile(app, formValues(e.target));
  $('new-profile-error').textContent = r.ok ? '' : r.error;
  if (!r.ok) return;
  e.target.reset();
  location.hash = '#/log';
  commit(r.app);
});

$('edit-profile-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const profile = activeProfile(app);
  const r = updateProfile(app, profile.id, formValues(e.target));
  const msg = $('edit-profile-msg');
  msg.textContent = r.ok ? 'Saved.' : r.error;
  msg.classList.toggle('ok', r.ok);
  if (!r.ok) return;
  document.activeElement?.blur();
  commit(r.app);
});

$('edit-profile-form').elements.unit.addEventListener('change', (e) => {
  $('bw-unit').textContent = `(${e.target.value}, optional)`;
});

$('profile-switch').addEventListener('change', (e) => {
  if (e.target.value === NEW_PROFILE) {
    location.hash = '#/new';
    return;
  }
  if (location.hash === '#/new') location.hash = '#/log';
  commit(switchProfile(app, e.target.value));
});

$('delete-profile').addEventListener('click', () => {
  const profile = activeProfile(app);
  const ok = window.confirm(`Delete "${profile.name}" and all of its lifts, XP, and records? This cannot be undone.`);
  if (!ok) return;
  location.hash = '#/log';
  commit(deleteProfile(app, profile.id));
});

$('ascend').addEventListener('click', hideLevelUp);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideLevelUp();
});
window.addEventListener('hashchange', render);

render();
