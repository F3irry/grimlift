import { describe, it, expect } from 'vitest';
import {
  addWeighIn,
  deleteWeighIn,
  currentBodyWeightKg,
  weighInHistory,
} from '../src/logic/bodyweight.js';
import { dayKey, weekDays } from '../src/logic/dates.js';
import { at, newProfile } from './helpers.js';

describe('R10 personal info: body weight', () => {
  it('R10.1: saves a weigh-in in kg with the time, from the preferred unit', () => {
    const p = newProfile({ unit: 'lb' });
    const r = addWeighIn(p, '200', at(24));
    expect(r.ok).toBe(true);
    expect(r.profile.weighIns).toHaveLength(1);
    expect(r.profile.weighIns[0].kg).toBeCloseTo(90.718474, 6);
    expect(r.profile.weighIns[0].at).toBe(at(24).toISOString());
    expect(typeof r.profile.weighIns[0].id).toBe('string');
  });

  it('R10.1: rejects blank, zero, negative, non-numeric, or over 700 kg', () => {
    const p = newProfile();
    for (const v of ['', '0', '-5', 'heavy', '700.1', undefined]) {
      const r = addWeighIn(p, v, at(24));
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/body weight/i);
      expect(r.profile).toBe(p);
    }
    expect(addWeighIn(p, '700', at(24)).ok).toBe(true);
    // 700 kg is about 1543.2 lb
    expect(addWeighIn(newProfile({ unit: 'lb' }), '1544', at(24)).ok).toBe(false);
  });

  it('R10.2: current body weight is the most recent weigh-in', () => {
    let p = newProfile();
    expect(currentBodyWeightKg(p)).toBeNull();
    p = addWeighIn(p, '82', at(23)).profile;
    p = addWeighIn(p, '81.4', at(25)).profile;
    expect(currentBodyWeightKg(p)).toBe(81.4);
  });

  it('R10.2: history is newest first and a weigh-in can be deleted', () => {
    let p = newProfile();
    p = addWeighIn(p, '82', at(23)).profile;
    p = addWeighIn(p, '81', at(24)).profile;
    p = addWeighIn(p, '80', at(25)).profile;
    expect(weighInHistory(p).map((w) => w.kg)).toEqual([80, 81, 82]);
    p = deleteWeighIn(p, p.weighIns[2].id);
    expect(currentBodyWeightKg(p)).toBe(81);
    expect(weighInHistory(p)).toHaveLength(2);
  });

  it('R8.2: a body weight given at profile creation becomes the first weigh-in', () => {
    const p = newProfile({ bodyWeight: '90' }, at(23, 8));
    expect(p.weighIns).toEqual([{ id: expect.any(String), at: at(23, 8).toISOString(), kg: 90 }]);
    expect(newProfile({ bodyWeight: '' }).weighIns).toEqual([]);
  });
});

describe('local days and weeks (used by R11.4, R11.5)', () => {
  it('R11.4: day keys are local calendar dates', () => {
    expect(dayKey(new Date(2026, 10, 23, 0, 5))).toBe('2026-11-23');
    expect(dayKey(new Date(2026, 10, 23, 23, 55))).toBe('2026-11-23');
  });

  it('R11.4: weeks run Monday to Sunday', () => {
    expect(weekDays(at(26))).toEqual([
      '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29',
    ]);
    expect(weekDays(at(29, 23))[0]).toBe('2026-11-23'); // Sunday belongs to the week before
    expect(weekDays(at(30))[0]).toBe('2026-11-30');
  });
});
