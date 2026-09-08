/** Whole days from `now` to `dateIso` - negative when `dateIso` is in the past. Undefined for a missing/unparseable date. */
export function daysUntil(dateIso: string | undefined, now: Date = new Date()): number | undefined {
  if (!dateIso) return undefined;
  const target = new Date(dateIso);
  if (Number.isNaN(target.getTime())) return undefined;
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startOfTarget.getTime() - startOfNow.getTime()) / msPerDay);
}

export function formatDateBR(dateIso: string): string {
  const [year, month, day] = dateIso.split("-");
  return `${day}/${month}/${year}`;
}
