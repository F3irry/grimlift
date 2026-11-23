// UI wiring only. Rules live in ./logic; persistence in ./storage.js.
import { exerciseSuggestions } from './logic/entries.js';
import { logEntry, deleteEntry, feedbackFor, summarize, progressChange } from './logic/progression.js';
import {
  activeProfile,
  createProfile,
  deleteProfile,
  profileStats,
  replaceProfile,
  switchProfile,
  updateAccount,
} from './logic/profiles.js';
import { formatWeight } from './logic/units.js';
import { addWeighIn, deleteWeighIn, weighInHistory } from './logic/bodyweight.js';
import { addGoal, deleteGoal, goalStatus, setGoalNote, toggleHabitDay, GOAL_GROUPS } from './logic/goals.js';
import { dayKey, weekDays, parseDayKey } from './logic/dates.js';
import { toughLove } from './logic/streaks.js';
import { currentChallenges, paceWarnings, CHALLENGE_XP } from './logic/challenges.js';
import { suggestions, blockedGoals } from './logic/exercises.js';
import { setLimitations, currentLimitations, AREA_LABELS, EQUIPMENT_LABELS, DIET_LABELS } from './logic/limitations.js';
import { mealSuggestions } from './logic/meals.js';
import { loadApp, saveApp } from './storage.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};
const NEW_PROFILE = '__new__';
const weeks = (n) => `${n} week${n === 1 ? '' : 's'}`;
const GROUP_ORDER = ['Muscle growth', 'How I want to look', 'Health habits'];

let app = loadApp(window.localStorage);
let lastProfileId = null; // to reset per-profile form defaults on switch (R1.6)

function commit(next) {
  app = next;
  saveApp(window.localStorage, app); // R4.1
  render();
}

/** Save a changed profile and play any rewards it earned (R6). `anchor` is where the XP pops. */
function commitProfile(before, after, result = progressChange(before, after), anchor = $('log-btn')) {
  commit(replaceProfile(app, after));
  playFeedback(feedbackFor(result), anchor);
}

function setMsg(id, ok, text) {
  const node = $(id);
  node.textContent = text;
  node.classList.toggle('ok', ok);
}

// ---------- routing ----------
function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  if (!activeProfile(app) || hash === 'new') return 'new';
  if (hash === 'profile' || hash === 'train' || hash === 'fuel') return hash;
  return 'log';
}

/** R13.13: "Log it" links use #/log/<exercise>; take the name and tidy the URL. */
function takePrefill() {
  const m = location.hash.match(/^#\/log\/(.+)$/);
  if (!m) return null;
  history.replaceState(null, '', '#/log');
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

// ---------- rendering ----------
function fmtWhen(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function deleteButton(label, onClick) {
  const x = el('button', 'btn-x', '×');
  x.type = 'button';
  x.setAttribute('aria-label', label);
  x.addEventListener('click', onClick);
  return x;
}

function entryItem(e, isPb, withDelete) {
  const li = el('li');
  const what = el('span', 'what');
  what.append(`${e.exercise} `, el('span', 'num', `${e.sets} × ${e.reps} @ ${e.weight} ${e.unit}`));
  if (isPb) what.append(el('span', 'tag-pb', 'PB'));
  li.append(what, el('span', 'when', fmtWhen(e.loggedAt)));
  if (withDelete) {
    li.append(deleteButton(`Delete ${e.exercise} from ${fmtWhen(e.loggedAt)}`, () => {
      const p = activeProfile(app);
      commit(replaceProfile(app, deleteEntry(p, e.id))); // R1.4
    }));
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
  $('pb-levels').textContent = stats.pbLevels + stats.goalLevels;
  $('xp-fill').style.width = `${(stats.xp.current / stats.xp.needed) * 100}%`;
  $('xp-bar').setAttribute('aria-valuenow', String(stats.xp.current));
  $('streak').textContent = `Streak: ${weeks(stats.streak)}`; // R12.7
}

/** R12.3: tough-love banner while a streak is broken; gone after the next log. */
function renderStreakBanner(stats) {
  $('streak-banner').hidden = !stats.streakBroken;
  if (!stats.streakBroken) return;
  const t = toughLove(stats.lostWeeks);
  $('streak-title').textContent = t.title;
  $('streak-message').textContent = t.message;
  $('streak-challenge').textContent = t.challenge;
}

function renderLog(profile, switched) {
  if (switched) {
    $('log-form').reset();
    $('unit').value = profile.unit; // R1.6
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

function habitDays(goal, now) {
  const wrap = el('div', 'habit-days');
  const today = dayKey(now);
  const created = dayKey(new Date(goal.createdAt));
  for (const day of weekDays(now)) {
    const label = el('label', `habit-day${day === today ? ' today' : ''}`);
    const box = el('input');
    box.type = 'checkbox';
    box.checked = goal.checks.includes(day);
    box.disabled = day < created || day > today;
    const name = parseDayKey(day).toLocaleDateString(undefined, { weekday: 'short' });
    box.setAttribute('aria-label', `${goal.name}: ${parseDayKey(day).toLocaleDateString(undefined, { weekday: 'long' })}`);
    box.addEventListener('change', () => {
      const before = activeProfile(app);
      const r = toggleHabitDay(before, goal.id, day, new Date());
      if (r.ok) commitProfile(before, r.profile, undefined, label);
      else render();
    });
    label.append(box, el('span', null, name.slice(0, 2)));
    wrap.append(label);
  }
  return wrap;
}

function goalCard(goal, profile, now) {
  const s = goalStatus(goal, profile, now);
  const card = el('div', `goal${s.reached ? ' reached' : ''}`);
  const head = el('div', 'goal-head');
  const title = el('span', 'goal-title', s.title);
  if (s.reached) title.append(el('span', 'badge', 'Reached'));
  head.append(title, deleteButton(`Delete goal ${s.title}`, () => {
    commit(replaceProfile(app, deleteGoal(activeProfile(app), goal.id))); // R11.7
  }));
  const bar = el('div', 'goal-bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', s.title);
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-valuenow', String(s.percent));
  const fill = el('div', 'goal-fill');
  fill.style.width = `${s.percent}%`;
  bar.append(fill);
  const meta = el('div', 'goal-meta');
  meta.append(el('span', 'pct', `${s.percent}%`), el('span', null, s.remaining));
  card.append(head, bar, meta);
  if (goal.type === 'habit') card.append(habitDays(goal, now));
  return card;
}

function renderGoals(profile) {
  const now = new Date();
  const nodes = [];
  for (const group of GROUP_ORDER) {
    const goals = profile.goals.filter((g) => GOAL_GROUPS[g.type] === group);
    if (!goals.length) continue;
    nodes.push(el('p', 'group-label', group), ...goals.map((g) => goalCard(g, profile, now)));
  }
  $('goal-list').replaceChildren(...nodes);
  $('goals-empty').hidden = profile.goals.length > 0;
  $('goal-bw-unit').textContent = `(${profile.unit})`;
}

function showGoalFields() {
  const type = $('goal-type').value;
  $('goal-form').querySelectorAll('[data-for]').forEach((node) => {
    node.hidden = !node.dataset.for.split(' ').includes(type);
  });
}

function renderProfile(profile, stats, switched) {
  $('profile-title').textContent = profile.name;
  $('st-level').textContent = stats.level;
  $('st-xp').textContent = stats.totalXp;
  $('st-entries').textContent = stats.entryCount;
  $('st-sets').textContent = stats.totalSets;
  $('st-bw').textContent = stats.bodyWeight ?? '—';
  $('st-goals').textContent = `${stats.goalsReached} / ${stats.goalCount}`;
  $('st-streak').textContent = weeks(stats.streak);
  $('st-best-streak').textContent = weeks(stats.bestStreak);

  renderGoals(profile);

  // R10: personal info
  $('bw-current').textContent = stats.bodyWeight ?? 'not set';
  $('bw-unit').textContent = `(${profile.unit})`;
  const weighIns = weighInHistory(profile);
  $('weigh-history').replaceChildren(
    ...weighIns.map((w) => {
      const li = el('li');
      li.append(el('span', 'what num', formatWeight(w.kg, profile.unit)), el('span', 'when', fmtWhen(w.at)));
      li.append(deleteButton(`Delete weigh-in from ${fmtWhen(w.at)}`, () => {
        commit(replaceProfile(app, deleteWeighIn(activeProfile(app), w.id)));
      }));
      return li;
    }),
  );
  $('weigh-empty').hidden = weighIns.length > 0;

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

  // Refill editable fields only when the profile changes or they aren't being edited.
  const account = $('account-form');
  if (switched || !account.contains(document.activeElement)) {
    account.elements.name.value = profile.name;
    account.elements.unit.value = profile.unit;
  }
  if (switched || !$('limits-form').contains(document.activeElement)) fillLimitsForm(profile);
  const note = $('note-form');
  if (switched || !note.contains(document.activeElement)) note.elements.goalNote.value = profile.goalNote;
  if (switched) {
    $('goal-form').reset();
    $('goal-form').elements.unit.value = profile.unit;
    showGoalFields();
    for (const id of ['goal-error', 'note-msg', 'account-msg', 'weigh-msg', 'limits-msg']) $(id).textContent = '';
  }
}

// ---------- R13 train page ----------
function challengeItem(c) {
  const li = el('li', `challenge${c.done ? ' done' : ''}`);
  const mark = el('span', 'mark');
  mark.setAttribute('aria-hidden', 'true');
  mark.append(el('span', null, '✓'));
  li.append(
    mark,
    el('span', 'c-title', c.title),
    el('span', 'c-xp', c.done ? `Done · +${CHALLENGE_XP} XP` : `+${CHALLENGE_XP} XP`),
    el('span', 'c-detail', c.detail),
  );
  return li;
}

function limitsSummary(profile) {
  const l = currentLimitations(profile);
  const areas = l.areas.length ? l.areas.map((a) => AREA_LABELS[a]).join(', ') : 'no areas';
  const link = el('a', null, 'Change');
  link.href = '#/profile';
  $('train-limits').replaceChildren(`Fitted to ${EQUIPMENT_LABELS[l.equipment]}, ${l.experience} level, protecting ${areas}. `, link);
}

function suggestionCard(part) {
  const card = el('div', 'part');
  card.append(el('h3', null, part.label));
  if (part.message) {
    card.append(el('p', 'none', part.message));
    return card;
  }
  const ul = el('ul');
  for (const item of part.items) {
    const li = el('li');
    const log = el('a', 'ex-log', 'Log it');
    log.href = `#/log/${encodeURIComponent(item.name)}`;
    log.setAttribute('aria-label', `Log ${item.name}`);
    li.append(el('span', 'ex-name', item.name), el('span', 'ex-dose num', item.prescription), log);
    ul.append(li);
  }
  card.append(ul);
  return card;
}

function renderTrain(profile) {
  const now = new Date();
  $('challenge-list').replaceChildren(...currentChallenges(profile, now).map(challengeItem));
  $('train-warnings').replaceChildren(...paceWarnings(profile).map((w) => el('p', 'note warn', w.text)));
  $('train-goal-prompt').hidden = profile.goals.length > 0;
  limitsSummary(profile);
  $('train-blocked').replaceChildren(...blockedGoals(profile).map((n) => el('p', 'note', n.text)));
  $('suggestion-list').replaceChildren(...suggestions(profile).map(suggestionCard));
}

// ---------- R14 fuel page ----------
function dietSummary(profile) {
  const { diet } = currentLimitations(profile);
  const link = el('a', null, 'Change');
  link.href = '#/profile';
  const text = diet.length ? `Fitted to your diet: ${diet.map((d) => DIET_LABELS[d]).join(', ')}. ` : 'No diet limits set. ';
  $('fuel-diet').replaceChildren(text, link);
}

function focusCard(f) {
  const card = el('div', `focus focus-${f.focus}`);
  card.append(el('h3', null, f.title));
  if (f.goals.length) card.append(el('p', 'for', `Goal${f.goals.length === 1 ? '' : 's'}: ${f.goals.join(', ')}`));
  card.append(el('p', 'why', f.why));
  const ul = el('ul');
  for (const m of f.meals) {
    const li = el('li');
    li.append(el('span', 'slot', m.slotLabel), el('span', 'meal-name', m.name));
    ul.append(li);
  }
  card.append(ul);
  return card;
}

function renderFuel(profile) {
  $('fuel-goal-prompt').hidden = profile.goals.length > 0;
  dietSummary(profile);
  $('meal-list').replaceChildren(...mealSuggestions(profile).map(focusCard));
}

function fillLimitsForm(profile) {
  const form = $('limits-form');
  const l = currentLimitations(profile);
  form.querySelectorAll('input[name="areas"]').forEach((box) => { box.checked = l.areas.includes(box.value); });
  form.querySelectorAll('input[name="diet"]').forEach((box) => { box.checked = l.diet.includes(box.value); });
  form.elements.equipment.value = l.equipment;
  form.elements.experience.value = l.experience;
}

function render() {
  const prefill = takePrefill();
  const page = route();
  const profile = activeProfile(app);
  renderSwitcher(profile);

  $('onboard-page').hidden = page !== 'new';
  $('log-page').hidden = page !== 'log';
  $('profile-page').hidden = page !== 'profile';
  $('train-page').hidden = page !== 'train';
  $('fuel-page').hidden = page !== 'fuel';
  $('status').hidden = !profile;
  $('nav').querySelectorAll('a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === page);
    a.hidden = !profile;
  });

  if (profile) {
    const switched = profile.id !== lastProfileId;
    const stats = profileStats(profile);
    renderStatus(stats);
    renderStreakBanner(stats);
    renderLog(profile, switched);
    renderTrain(profile);
    renderFuel(profile);
    renderProfile(profile, stats, switched);
    if (prefill && page === 'log') {
      $('exercise').value = prefill;
      $('sets').focus();
    }
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

/** R12.6: the comeback alert. */
function showComebackToast(event) {
  const toast = el('div', 'toast comeback');
  toast.append(el('strong', null, 'Comeback'), el('span', null, event.text.replace(/^Comeback: /, '')));
  $('toasts').append(toast);
  setTimeout(() => toast.remove(), 6000);
}

/** R13.12: the challenge alert. */
function showChallengeToast(event) {
  const toast = el('div', 'toast challenge');
  toast.append(el('strong', null, 'Challenge done'), el('span', null, `${event.title} · +${event.xp} XP`));
  $('toasts').append(toast);
  setTimeout(() => toast.remove(), 5000);
}

function showGoalToast(event) {
  const toast = el('div', 'toast');
  toast.append(el('strong', null, 'Goal reached'), el('span', null, `${event.title} · +1 level`));
  $('toasts').append(toast);
  setTimeout(() => toast.remove(), 5000);
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

function playFeedback(events, anchor = $('log-btn')) {
  if (!events.length) return;
  retrigger($('xp-bar'), 'flash');
  for (const ev of events) {
    if (ev.type === 'xp') {
      if (anchor === $('log-btn')) retrigger(anchor, 'struck');
      popXp(ev.text, anchor);
    }
    if (ev.type === 'comeback') showComebackToast(ev);
    if (ev.type === 'challenge') showChallengeToast(ev);
    if (ev.type === 'pb') showPb(ev);
    if (ev.type === 'goal') showGoalToast(ev);
    if (ev.type === 'level') setTimeout(() => showLevelUp(ev), reducedMotion() ? 0 : 450);
  }
}

// ---------- events ----------
function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

$('log-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const before = activeProfile(app);
  const r = logEntry(before, formValues(e.target));
  $('log-error').textContent = r.ok ? '' : r.error;
  if (!r.ok) return;
  commitProfile(before, r.profile, r.result);
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

// R9: account info
$('account-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const r = updateAccount(app, activeProfile(app).id, formValues(e.target));
  setMsg('account-msg', r.ok, r.ok ? 'Saved.' : r.error);
  if (!r.ok) return;
  document.activeElement?.blur();
  commit(r.app);
});

// R10: personal info
$('weigh-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const before = activeProfile(app);
  const r = addWeighIn(before, e.target.elements.bodyWeight.value);
  setMsg('weigh-msg', r.ok, r.ok ? 'Saved.' : r.error);
  if (!r.ok) return;
  e.target.reset();
  commitProfile(before, r.profile, undefined, e.submitter ?? e.target.querySelector('button'));
});

// R11: goals
$('goal-type').addEventListener('change', () => {
  showGoalFields();
  $('goal-error').textContent = '';
});

$('goal-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = formValues(e.target);
  const input = v.type === 'bodyweight' ? { ...v, targetWeight: v.targetBodyWeight } : v;
  const r = addGoal(activeProfile(app), input);
  setMsg('goal-error', r.ok, r.ok ? 'Goal added.' : r.error);
  if (!r.ok) return;
  const type = v.type;
  e.target.reset();
  e.target.elements.type.value = type;
  e.target.elements.unit.value = r.profile.unit;
  commit(replaceProfile(app, r.profile));
});

// R13.1: limitations
$('limits-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const before = activeProfile(app);
  const ticked = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((b) => b.value);
  const r = setLimitations(before, {
    areas: ticked('areas'),
    diet: ticked('diet'),
    equipment: form.elements.equipment.value,
    experience: form.elements.experience.value,
  });
  setMsg('limits-msg', r.ok, r.ok ? 'Saved. The Train and Fuel pages now fit these.' : r.error);
  if (!r.ok) return;
  document.activeElement?.blur();
  commitProfile(before, r.profile, undefined, e.submitter ?? form.querySelector('button'));
});

$('note-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const r = setGoalNote(activeProfile(app), e.target.elements.goalNote.value);
  setMsg('note-msg', r.ok, r.ok ? 'Saved.' : r.error);
  if (!r.ok) return;
  document.activeElement?.blur();
  commit(replaceProfile(app, r.profile));
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
  const ok = window.confirm(`Delete "${profile.name}" and all of its lifts, weigh-ins, goals, XP, and records? This cannot be undone.`);
  if (!ok) return;
  location.hash = '#/log';
  commit(deleteProfile(app, profile.id));
});

$('ascend').addEventListener('click', hideLevelUp);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideLevelUp();
});
window.addEventListener('hashchange', render);

showGoalFields();
render();
