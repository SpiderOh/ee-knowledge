export function startOfLocalDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addLocalDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export function toLocalDateKey(value: Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
