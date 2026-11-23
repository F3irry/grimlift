// Local calendar days and Monday-start weeks (used by R11.4, R11.5).

const pad = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' for the local calendar date of `date`. */
export function dayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight for a 'YYYY-MM-DD' key. */
export function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The Monday day key of the week containing `date`. */
export function weekKey(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return dayKey(d);
}

/** The seven day keys, Monday to Sunday, of the week containing `date`. */
export function weekDays(date) {
  const monday = parseDayKey(weekKey(date));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return dayKey(d);
  });
}

/** The week key `n` weeks after (or before, if negative) the week key `week`. */
export function shiftWeek(week, n) {
  const d = parseDayKey(week);
  d.setDate(d.getDate() + 7 * n);
  return dayKey(d);
}
