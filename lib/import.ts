import { normalizeFineAmount } from "@/lib/validation";
import { parseEasternDateTime } from "@/lib/utils";

export type ImportedSheetRow = {
  date: string;
  time: string;
  officerNumber: string;
  locationName: string;
  chalkTime: string;
  violationLabel: string;
  fineAmount: string;
  plateState: string;
  plateNumber: string;
  comment: string;
};

export type ParsedImport = {
  rows: ImportedSheetRow[];
  warnings: string[];
};

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeCell(value: string) {
  return value.replace(/^"|"$/g, "").trim();
}

export function parseGoogleSheetCsv(input: string): ParsedImport {
  const normalizedInput = input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedInput.split("\n").filter((line) => line.trim().length > 0);

  if (lines.length <= 1) {
    return {
      rows: [],
      warnings: ["The CSV file must include a header row and at least one data row."]
    };
  }

  const rows: ImportedSheetRow[] = [];
  const warnings: string[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const cells = splitCsvLine(lines[index]).map(normalizeCell);

    if (cells.every((cell) => !cell)) {
      continue;
    }

    // Column A is intentionally ignored, so skip rows where the importable columns are blank.
    if (cells.slice(1, 11).every((cell) => !cell)) {
      continue;
    }

    const rowNumber = index + 1;
    const row: ImportedSheetRow = {
      date: cells[1] ?? "",
      time: cells[2] ?? "",
      officerNumber: cells[3] ?? "",
      locationName: cells[4] ?? "",
      chalkTime: cells[5] ?? "",
      violationLabel: cells[6] ?? "",
      fineAmount: cells[7] ?? "",
      plateState: (cells[8] ?? "").toUpperCase().trim(),
      plateNumber: (cells[9] ?? "").toUpperCase().trim(),
      comment: cells[10] ?? ""
    };

    if (!row.date || !row.time || !row.locationName || !row.plateState || !row.plateNumber) {
      warnings.push(`Row ${rowNumber} was skipped because it is missing Date, Time, Location, State, or Plate.`);
      continue;
    }

    rows.push(row);
  }

  return { rows, warnings };
}

export function inferRecordType(row: ImportedSheetRow) {
  if (row.chalkTime && !row.violationLabel) {
    return "chalk" as const;
  }

  const fine = normalizeFineAmount(row.fineAmount, "citation");
  const numericFine = fine.success ? Number(fine.value) : Number((row.fineAmount || "0").replace(/[$,\s]/g, ""));

  if (!Number.isNaN(numericFine) && numericFine <= 0) {
    return "warning" as const;
  }

  return "citation" as const;
}

export function normalizeImportedDateTime(date: string, time: string) {
  const parsed = parseEasternDateTime(date, time);

  if (parsed) {
    return parsed;
  }

  const fallback = new Date(`${date} ${time}`);

  if (Number.isNaN(fallback.getTime())) {
    throw new Error(`Invalid date/time combination: ${date} ${time}`);
  }

  return fallback;
}
