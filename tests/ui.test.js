// @vitest-environment happy-dom
// Static checks on the page markup and stylesheet for R5 and R7.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');
const html = read('../index.html');
const css = read('../src/style.css');
// Drop <link> tags so happy-dom doesn't try to fetch stylesheets.
const doc = new DOMParser().parseFromString(html.replace(/<link[^>]*>/g, ''), 'text/html');

/** Innermost CSS rules as { selectors: string[], body: string }. */
function cssRules(text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
    selectors: sel.split(',').map((s) => s.trim()).filter(Boolean),
    body,
  }));
}

/** Smallest pixel size a font-size value can produce (16px = 1rem). */
function minPx(value) {
  const v = value.trim();
  const clamp = v.match(/^clamp\(([^,]+),/);
  if (clamp) return minPx(clamp[1]);
  const m = v.match(/^([\d.]+)(px|rem)$/);
  if (!m) return null;
  return m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16;
}

describe('R5 readable type', () => {
  it('R5.1: the display font is applied only to h1-h3', () => {
    const users = cssRules(css).filter((r) => /var\(--font-display\)/.test(r.body));
    expect(users.length).toBeGreaterThan(0);
    for (const r of users) {
      for (const sel of r.selectors) {
        expect(sel, `"${sel}" uses the display font`).toMatch(/(^|[\s>+~])h[1-3]$/);
      }
    }
  });

  it('R5.2: body text uses the readable body font, not the display font', () => {
    const body = cssRules(css).find((r) => r.selectors.includes('body'));
    expect(body.body).toMatch(/font-family:\s*var\(--font-body\)/);
    const bodyFont = css.match(/--font-body:\s*([^;]+);/)[1];
    expect(bodyFont).not.toMatch(/Unifraktur|Fraktur|Blackletter/i);
  });

  it('R5.2: no font size is smaller than 16px', () => {
    const sizes = [...css.matchAll(/font-size:\s*([^;]+);/g)].map((m) => m[1]);
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) {
      const px = minPx(size);
      expect(px, `unsupported font-size "${size}"`).not.toBeNull();
      expect(px, `font-size ${size}`).toBeGreaterThanOrEqual(16);
    }
  });
});

describe('R7 simple logging form', () => {
  const page = doc.getElementById('log-page');

  it('R7.1: the log page has exactly one form and one button', () => {
    expect(page).not.toBeNull();
    expect(page.querySelectorAll('form')).toHaveLength(1);
    expect(page.querySelectorAll('button')).toHaveLength(1);
    expect(page.querySelector('form button[type="submit"]')).not.toBeNull();
  });

  it('R7.1: the form has five inputs: exercise, sets, reps, weight, unit', () => {
    const fields = [...page.querySelectorAll('form input, form select')].map((f) => f.name);
    expect(fields).toEqual(['exercise', 'sets', 'reps', 'weight', 'unit']);
    const unit = page.querySelector('select[name="unit"]');
    expect([...unit.querySelectorAll('option')].map((o) => o.value)).toEqual(['kg', 'lb']);
  });
});

describe('R12 streak markup', () => {
  const page = doc.getElementById('log-page');

  it('R12.3: the log page has a tough-love banner above the form, with no button', () => {
    const banner = page.querySelector('#streak-banner');
    expect(banner).not.toBeNull();
    expect(banner.querySelectorAll('button')).toHaveLength(0);
    const form = page.querySelector('form');
    expect(banner.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('R12.7: the status bar has a current-streak line', () => {
    expect(doc.querySelector('#status #streak')).not.toBeNull();
  });

  it('R8.4: the profile stats show current and best streak', () => {
    expect(doc.querySelector('#profile-page #st-streak')).not.toBeNull();
    expect(doc.querySelector('#profile-page #st-best-streak')).not.toBeNull();
  });
});

describe('R13 train page and limitations markup', () => {
  it('R13.13: the nav has a Train link to the train page', () => {
    const link = doc.querySelector('#nav a[data-route="train"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('#/train');
    expect(link.textContent.trim()).toBe('Train');
  });

  it('R13.13: the train page has challenges, warnings, suggestions, and a safety note', () => {
    const page = doc.getElementById('train-page');
    expect(page).not.toBeNull();
    for (const id of ['challenge-list', 'train-warnings', 'suggestion-list', 'train-goal-prompt']) {
      expect(page.querySelector(`#${id}`), id).not.toBeNull();
    }
    expect(page.querySelector('#train-safety').textContent).toMatch(/professional/i);
  });

  it('R13.1: the profile page has a limitations form with every area, equipment, and experience', () => {
    const form = doc.querySelector('#profile-page #limits-form');
    expect(form).not.toBeNull();
    const areas = [...form.querySelectorAll('input[type="checkbox"][name="areas"]')].map((b) => b.value);
    expect(areas).toEqual(['knees', 'hips', 'lowerBack', 'shoulders', 'elbows', 'wrists']);
    const opts = (name) => [...form.querySelectorAll(`select[name="${name}"] option`)].map((o) => o.value);
    expect(opts('equipment')).toEqual(['bodyweight', 'dumbbells', 'gym']);
    expect(opts('experience')).toEqual(['beginner', 'intermediate', 'advanced']);
  });
});

describe('R14 fuel page and diet markup', () => {
  it('R13.1 / R14.1: the limitations form has a diet pick-list and no free-text health field', () => {
    const form = doc.querySelector('#profile-page #limits-form');
    const diet = [...form.querySelectorAll('input[type="checkbox"][name="diet"]')].map((b) => b.value);
    expect(diet).toEqual(['vegetarian', 'vegan', 'noDairy', 'noNuts', 'noGluten', 'noPork']);
    expect(form.querySelectorAll('textarea, input[type="text"], input:not([type])')).toHaveLength(0);
  });

  it('R14.5: the nav has a Fuel link to the fuel page', () => {
    const link = doc.querySelector('#nav a[data-route="fuel"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('#/fuel');
    expect(link.textContent.trim()).toBe('Fuel');
  });

  it('R14.5: the fuel page has meals, the diet summary, a goal prompt, and a not-medical-advice note', () => {
    const page = doc.getElementById('fuel-page');
    expect(page).not.toBeNull();
    for (const id of ['meal-list', 'fuel-diet', 'fuel-goal-prompt']) {
      expect(page.querySelector(`#${id}`), id).not.toBeNull();
    }
    const safety = page.querySelector('#fuel-safety').textContent;
    expect(safety).toMatch(/not medical advice/i);
    expect(safety).toMatch(/traces/i);
    expect(safety).toMatch(/doctor or dietitian/i);
  });

  it('R14.6: the fuel page has no form or button (suggest only, no meal log)', () => {
    const page = doc.getElementById('fuel-page');
    expect(page.querySelectorAll('form, button, input')).toHaveLength(0);
  });
});
