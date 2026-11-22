// UI wiring only. Game rules live in ./logic; persistence in ./storage.js.
import { addSet, removeSet, exerciseSuggestions } from './logic/workout.js';
import { completeWorkout, levelOf, xpProgress } from './logic/progression.js';
import { loadState, saveState } from './storage.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

let state = loadState(window.localStorage);

function commit(next) {
  state = next;
  saveState(window.localStorage, state);
  render();
}

function fmtSet(s) {
  return `${s.weight} × ${s.reps}`;
}

function renderStats() {
  const { current, needed } = xpProgress(state.totalXp);
  $('level').textContent = levelOf(state);
  $('xp-current').textContent = current;
  $('xp-needed').textContent = needed;
  $('xp-total').textContent = state.totalXp;
  $('pb-levels').textContent = state.pbLevels;
  $('xp-fill').style.width = `${(current / needed) * 100}%`;
  $('xp-bar').setAttribute('aria-valuenow', String(current));
}

function renderDraft() {
  const list = $('draft-sets');
  list.replaceChildren(
    ...state.draft.sets.map((s, i) => {
      const li = el('li');
      const what = el('span', 'what');
      what.append(`${s.exercise} — `, el('span', 'num', fmtSet(s)));
      const x = el('button', 'btn-x', '×');
      x.type = 'button';
      x.title = `Remove ${s.exercise} set`;
      x.setAttribute('aria-label', `Remove set ${i + 1}`);
      x.addEventListener('click', () => commit(removeSet(state, i)));
      li.append(what, x);
      return li;
    }),
  );
  const empty = state.draft.sets.length === 0;
  $('draft-empty').hidden = !empty;
  $('complete').disabled = empty;
}

function renderBests() {
  const entries = Object.values(state.bests).sort((a, b) => a.name.localeCompare(b.name));
  $('bests').replaceChildren(
    ...entries.map((b) => {
      const li = el('li');
      li.append(el('span', null, b.name), el('span', 'num', fmtSet(b)));
      return li;
    }),
  );
  $('bests-empty').hidden = entries.length > 0;
  $('exercise-list').replaceChildren(
    ...exerciseSuggestions(state).map((name) => {
      const o = el('option');
      o.value = name;
      return o;
    }),
  );
}

function renderHistory() {
  const items = [...state.workouts].reverse().slice(0, 30);
  $('history').replaceChildren(
    ...items.map((w) => {
      const li = el('li');
      const when = new Date(w.completedAt).toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
      li.append(el('span', 'when', when), el('span', 'xp-gain', `+${w.xp} XP`));
      const names = [...new Set(w.sets.map((s) => s.exercise))];
      li.append(el('div', 'detail', `${w.sets.length} set${w.sets.length === 1 ? '' : 's'}: ${names.join(', ')}`));
      return li;
    }),
  );
  $('history-empty').hidden = state.workouts.length > 0;
}

function render() {
  renderStats();
  renderDraft();
  renderBests();
  renderHistory();
}

function showOmen(result) {
  const omen = $('omen');
  const title = result.levelAfter > result.levelBefore
    ? `Ascended to Level ${result.levelAfter}`
    : 'Rite complete';
  const list = el('ul');
  list.append(el('li', null, `+${result.xpEarned} XP`));
  for (const pb of result.personalBests) {
    list.append(el('li', null, `New record: ${pb.name} ${fmtSet(pb)} — +1 level`));
  }
  omen.replaceChildren(el('strong', null, title), list);
  omen.hidden = false;
}

$('set-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const r = addSet(state, {
    exercise: $('exercise').value,
    weight: $('weight').value,
    reps: $('reps').value,
  });
  $('form-error').textContent = r.ok ? '' : r.error;
  if (!r.ok) return;
  commit(r.state);
  // Keep exercise and weight for the next set; most people repeat them.
  $('reps').value = '';
  $('reps').focus();
});

$('complete').addEventListener('click', () => {
  const r = completeWorkout(state);
  if (!r.ok) {
    $('form-error').textContent = r.error;
    return;
  }
  $('form-error').textContent = '';
  commit(r.state);
  showOmen(r.result);
  $('exercise').value = '';
  $('weight').value = '';
});

render();
