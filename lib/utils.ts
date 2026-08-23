export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function toLocalDateInputValue(date = new Date()) {
  return date.toLocaleDateString("en-CA");
}

export function toLocalTimeInputValue(date = new Date()) {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  });
}
