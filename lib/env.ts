function stripAccidentalAssignmentPrefix(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("DATABASE_URL=")) {
    return trimmed.slice("DATABASE_URL=".length);
  }

  return trimmed;
}

export function getDatabaseUrl() {
  const raw = process.env.DATABASE_URL ?? "";

  return stripAccidentalAssignmentPrefix(raw);
}
