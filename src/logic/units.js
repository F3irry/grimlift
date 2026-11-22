// kg/lb conversion and display (spec R3.1, R3.5).

export const UNITS = ['kg', 'lb'];
export const KG_PER_LB = 0.45359237;

export function toKg(weight, unit) {
  return unit === 'lb' ? weight * KG_PER_LB : weight;
}

export function fromKg(kg, unit) {
  return unit === 'lb' ? kg / KG_PER_LB : kg;
}

/** Round to 0.1 and drop a trailing ".0": 220.46 → "220.5", 100 → "100". */
export function roundTenth(n) {
  return String(Math.round(n * 10) / 10);
}

/** R3.5: show a kg value in `unit`, rounded to 0.1. */
export function formatWeight(kg, unit) {
  return `${roundTenth(fromKg(kg, unit))} ${unit}`;
}
