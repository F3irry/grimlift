import { describe, it, expect } from 'vitest';
import { normalizeName, validateEntry, exerciseSuggestions } from '../src/logic/entries.js';
import { toKg, fromKg, formatWeight } from '../src/logic/units.js';

const entry = (over = {}) => ({
  exercise: 'Squat', sets: '3', reps: '5', weight: '100', unit: 'kg', ...over,
});

describe('R1 entry validation', () => {
  it('R1.1: accepts exercise, sets, reps, weight, and unit, converting numbers', () => {
    const r = validateEntry(entry());
    expect(r.ok).toBe(true);
    expect(r.entry).toEqual({ exercise: 'Squat', sets: 3, reps: 5, weight: 100, unit: 'kg' });
  });

  it('R1.1: trims and collapses spaces in the exercise name', () => {
    expect(validateEntry(entry({ exercise: '  Bench   Press ' })).entry.exercise).toBe('Bench Press');
  });

  it('R1.1: rejects a blank exercise name', () => {
    for (const exercise of ['', '   ', undefined]) {
      const r = validateEntry(entry({ exercise }));
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/exercise/i);
    }
  });

  it('R1.2: sets must be a whole number from 1 to 50', () => {
    expect(validateEntry(entry({ sets: 1 })).ok).toBe(true);
    expect(validateEntry(entry({ sets: 50 })).ok).toBe(true);
    for (const sets of [0, 51, 2.5, '', 'x', undefined]) {
      const r = validateEntry(entry({ sets }));
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/sets/i);
    }
  });

  it('R1.2: reps must be a whole number from 1 to 1000', () => {
    expect(validateEntry(entry({ reps: 1000 })).ok).toBe(true);
    for (const reps of [0, 1001, -3, 4.5, '', 'ten']) {
      const r = validateEntry(entry({ reps }));
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/reps/i);
    }
  });

  it('R1.2: weight may be 0 or a decimal but not negative or missing', () => {
    expect(validateEntry(entry({ weight: 0 })).ok).toBe(true);
    expect(validateEntry(entry({ weight: '22.5' })).entry.weight).toBe(22.5);
    for (const weight of [-1, '', 'heavy', undefined, NaN, Infinity]) {
      const r = validateEntry(entry({ weight }));
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/weight/i);
    }
  });

  it('R1.2: unit must be kg or lb', () => {
    expect(validateEntry(entry({ unit: 'lb' })).entry.unit).toBe('lb');
    for (const unit of ['', 'stone', 'KG ', undefined]) {
      const r = validateEntry(entry({ unit }));
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/unit/i);
    }
  });

  it('R1.3: names match ignoring case and repeated spaces', () => {
    expect(normalizeName('  Bench   Press ')).toBe(normalizeName('bench press'));
  });

  it('R1.5: suggestions list each exercise once, using the first typed name, sorted', () => {
    const entries = [
      { exercise: 'Squat' }, { exercise: 'Bench Press' }, { exercise: 'squat' }, { exercise: 'BENCH  press' },
    ];
    expect(exerciseSuggestions(entries)).toEqual(['Bench Press', 'Squat']);
  });
});

describe('R3.1 / R3.5 units', () => {
  it('R3.1: converts lb to kg with 1 lb = 0.45359237 kg', () => {
    expect(toKg(100, 'lb')).toBeCloseTo(45.359237, 9);
    expect(toKg(80, 'kg')).toBe(80);
    expect(fromKg(45.359237, 'lb')).toBeCloseTo(100, 9);
  });

  it('R3.5: formats a kg value in the chosen unit rounded to 0.1', () => {
    expect(formatWeight(100, 'kg')).toBe('100 kg');
    expect(formatWeight(100, 'lb')).toBe('220.5 lb');
    expect(formatWeight(22.46, 'kg')).toBe('22.5 kg');
  });
});
