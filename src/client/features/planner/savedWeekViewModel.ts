import type { SavedWeekSummary } from "../../../domain/planner/planner";

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateParts(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return {
    day: date.getUTCDate(),
    month: new Intl.DateTimeFormat("es", {
      month: "long",
      timeZone: "UTC",
    }).format(date),
  };
}

export function formatWeekRange(weekStart: string) {
  const start = dateParts(weekStart);
  const end = dateParts(addDays(weekStart, 6));
  return start.month === end.month
    ? `${start.day} al ${end.day} de ${end.month}`
    : `${start.day} de ${start.month} al ${end.day} de ${end.month}`;
}

export function defaultSavedWeekTitle(weekStart: string) {
  return `Semana del ${formatWeekRange(weekStart)}`;
}

export function nextAvailableWeekStart(
  currentWeekStart: string,
  savedWeeks: ReadonlyArray<Pick<SavedWeekSummary, "weekStart">>,
) {
  const occupied = new Set(savedWeeks.map((week) => week.weekStart));
  const latestWeekStart = savedWeeks.reduce(
    (latest, week) =>
      week.weekStart.localeCompare(latest) > 0 ? week.weekStart : latest,
    currentWeekStart,
  );
  let candidate = addDays(latestWeekStart, 7);
  while (occupied.has(candidate)) candidate = addDays(candidate, 7);
  return candidate;
}
