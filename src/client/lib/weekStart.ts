export function mondayFor(date = new Date()) {
  const result = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = result.getUTCDay() || 7;
  result.setUTCDate(result.getUTCDate() - day + 1);
  return result.toISOString().slice(0, 10);
}

export function weekStartFromSearch(
  searchParams: URLSearchParams,
  fallback: string,
) {
  const candidate = searchParams.get("week");
  if (!candidate || !/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return fallback;

  const date = new Date(`${candidate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== candidate) {
    return fallback;
  }
  return date.getUTCDay() === 1 ? candidate : fallback;
}
