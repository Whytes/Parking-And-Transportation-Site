export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const APP_TIME_ZONE = "America/New_York";

const easternDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

function getEasternParts(date: Date) {
  const parts = easternDateTimeFormatter.formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute")),
    second: Number(values.get("second"))
  };
}

function getEasternOffsetMilliseconds(date: Date) {
  const parts = getEasternParts(date);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

  return asUtc - date.getTime();
}

export function parseEasternDateTime(date: string, time: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time.trim());

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText] = timeMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const baseUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let offset = getEasternOffsetMilliseconds(new Date(baseUtc));
  let parsed = new Date(baseUtc - offset);
  const nextOffset = getEasternOffsetMilliseconds(parsed);

  if (nextOffset !== offset) {
    offset = nextOffset;
    parsed = new Date(baseUtc - offset);
  }

  const parts = getEasternParts(parsed);

  if (parts.year !== year || parts.month !== month || parts.day !== day || parts.hour !== hour || parts.minute !== minute) {
    return null;
  }

  return parsed;
}

export function formatCurrency(amount: number | string) {
  const numericAmount = typeof amount === "string" ? Number(amount) : amount;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number.isNaN(numericAmount) ? 0 : numericAmount);
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function toLocalDateInputValue(date = new Date()) {
  const parts = getEasternParts(date);

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function toLocalTimeInputValue(date = new Date()) {
  const parts = getEasternParts(date);

  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}
