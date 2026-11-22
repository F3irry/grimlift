// Draft-workout rules: validating and editing sets (spec R1).

/** R1.3: key used to match exercise names regardless of case and spacing. */
export function normalizeName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function toNumber(value) {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'string' && value.trim() === '') return NaN;
  return Number(value);
}

/** R1.1, R1.2: check raw form input and return a clean set or an error message. */
export function validateSet({ exercise, weight, reps } = {}) {
  const name = String(exercise ?? '').trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: 'Name the exercise.' };

  const w = toNumber(weight);
  if (!Number.isFinite(w) || w < 0) {
    return { ok: false, error: 'Weight must be a number of 0 or more.' };
  }

  const r = toNumber(reps);
  if (!Number.isInteger(r) || r < 1) {
    return { ok: false, error: 'Reps must be a whole number of 1 or more.' };
  }

  return { ok: true, set: { exercise: name, weight: w, reps: r } };
}

/** R1.4: add a validated set to the draft. Returns { ok, state, error? }. */
export function addSet(state, input) {
  const v = validateSet(input);
  if (!v.ok) return { ok: false, state, error: v.error };
  return {
    ok: true,
    state: { ...state, draft: { ...state.draft, sets: [...state.draft.sets, v.set] } },
  };
}

/** R1.4: remove the draft set at `index`; out-of-range indexes change nothing. */
export function removeSet(state, index) {
  const sets = state.draft.sets;
  if (index < 0 || index >= sets.length) return state;
  return {
    ...state,
    draft: { ...state.draft, sets: sets.filter((_, i) => i !== index) },
  };
}

/** R1.6: display names of every exercise recorded so far, sorted. */
export function exerciseSuggestions(state) {
  return Object.values(state.bests)
    .map((b) => b.name)
    .sort((a, b) => a.localeCompare(b));
}
