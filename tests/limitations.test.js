import { describe, it, expect } from 'vitest';
import {
  setLimitations,
  currentLimitations,
  limitationsForWeek,
  hasEquipment,
  DEFAULT_LIMITATIONS,
  AREAS,
} from '../src/logic/limitations.js';
import { at, newProfile } from './helpers.js';

const knees = { areas: ['knees'], equipment: 'gym', experience: 'beginner' };

describe('R13.1 limitations', () => {
  it('R13.1: a profile with no saved limitations uses the defaults', () => {
    expect(DEFAULT_LIMITATIONS).toEqual({ areas: [], equipment: 'gym', experience: 'beginner' });
    expect(currentLimitations(newProfile())).toEqual(DEFAULT_LIMITATIONS);
  });

  it('R13.1: the six protectable areas', () => {
    expect(AREAS).toEqual(['knees', 'hips', 'lowerBack', 'shoulders', 'elbows', 'wrists']);
  });

  it('R13.1: saving stores a dated record; areas keep a fixed order and drop repeats', () => {
    const r = setLimitations(newProfile(), { areas: ['wrists', 'knees', 'wrists'], equipment: 'dumbbells', experience: 'advanced' }, at(24));
    expect(r.ok).toBe(true);
    expect(r.profile.limitations).toEqual([
      { at: at(24).toISOString(), areas: ['knees', 'wrists'], equipment: 'dumbbells', experience: 'advanced' },
    ]);
    expect(currentLimitations(r.profile)).toEqual({ areas: ['knees', 'wrists'], equipment: 'dumbbells', experience: 'advanced' });
  });

  it('R13.1: a single area string (one ticked box) is accepted', () => {
    const r = setLimitations(newProfile(), { areas: 'hips', equipment: 'gym', experience: 'beginner' }, at(24));
    expect(currentLimitations(r.profile).areas).toEqual(['hips']);
  });

  it('R13.1: unknown values are rejected and nothing is saved', () => {
    const p = newProfile();
    const bad = [
      [{ ...knees, areas: ['neck'] }, /area/i],
      [{ ...knees, equipment: 'bands' }, /equipment/i],
      [{ ...knees, experience: 'pro' }, /experience/i],
    ];
    for (const [input, msg] of bad) {
      const r = setLimitations(p, input, at(24));
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(msg);
      expect(r.profile).toBe(p);
    }
  });

  it('R13.1: a save in the same week replaces the latest record; a later week adds one', () => {
    let p = setLimitations(newProfile(), knees, at(24)).profile;
    p = setLimitations(p, { ...knees, areas: [] }, at(26)).profile;
    expect(p.limitations).toHaveLength(1);
    expect(p.limitations[0]).toMatchObject({ at: at(26).toISOString(), areas: [] });
    p = setLimitations(p, knees, at(30)).profile;
    expect(p.limitations).toHaveLength(2);
  });

  it('R13.1: the limitations in force for a week are the latest saved before it ended', () => {
    let p = setLimitations(newProfile(), knees, at(24)).profile;
    p = setLimitations(p, { ...knees, equipment: 'bodyweight' }, at(31)).profile;
    expect(limitationsForWeek(p, '2026-11-16')).toEqual(DEFAULT_LIMITATIONS);
    expect(limitationsForWeek(p, '2026-11-23')).toEqual(knees);
    expect(limitationsForWeek(p, '2026-11-30').equipment).toBe('bodyweight');
    expect(limitationsForWeek(p, '2026-12-07').equipment).toBe('bodyweight');
  });

  it('R13.1: each equipment level includes the ones before it', () => {
    const dumbbells = { ...knees, equipment: 'dumbbells' };
    expect(hasEquipment(dumbbells, 'bodyweight')).toBe(true);
    expect(hasEquipment(dumbbells, 'dumbbells')).toBe(true);
    expect(hasEquipment(dumbbells, 'gym')).toBe(false);
  });
});
