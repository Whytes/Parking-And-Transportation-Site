import { z } from "zod";

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const trimmedText = (label: string, max = 255) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or less.`);

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email."),
  password: z.string().min(1, "Enter your password.")
});

export const locationSchema = z.object({
  name: trimmedText("Location name", 200)
});

export const violationSchema = z.object({
  label: trimmedText("Violation", 200),
  defaultFine: z.string().trim().default("0")
});

export const archiveRecordSchema = z.object({
  id: z.string().uuid("Invalid record id."),
  archiveReason: trimmedText("Archive reason", 500)
});

export const itemIdSchema = z.object({
  id: z.string().uuid("Invalid id.")
});

export const recordSchema = z
  .object({
    id: z.string().uuid().optional(),
    recordType: z.enum(["citation", "warning", "chalk"]),
    date: z.string().trim().min(1, "Date is required."),
    time: z.string().trim().regex(hhmmRegex, "Enter a valid time."),
    locationId: z.string().uuid("Select a location."),
    chalkTime: z.union([z.literal(""), z.string().trim().regex(hhmmRegex, "Enter a valid chalk time.")]),
    violationId: z.string().trim(),
    fineAmount: z.string().trim(),
    plateState: trimmedText("Plate state", 10).transform((value) => value.toUpperCase()),
    plateNumber: trimmedText("Plate number", 20).transform((value) => value.toUpperCase()),
    comment: z.string().trim().max(2000, "Comment must be 2000 characters or less.")
  })
  .superRefine((value, ctx) => {
    const fine = normalizeFineAmount(value.fineAmount, value.recordType);

    if (!fine.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fineAmount"],
        message: fine.message
      });
    }

    if (Number.isNaN(Date.parse(`${value.date}T${value.time}:00`))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Enter a valid date and time."
      });
    }

    if (value.recordType !== "chalk") {
      if (!z.string().uuid().safeParse(value.violationId).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["violationId"],
          message: "Select a violation."
        });
      }
    }
  });

export function normalizeFineAmount(value: string, recordType: "citation" | "warning" | "chalk") {
  const normalized = value.replace(/[$,\s]/g, "");

  if (!normalized) {
    return recordType === "warning" || recordType === "chalk"
      ? { success: true as const, value: "0.00" }
      : { success: false as const, message: "Fine amount is required for citations." };
  }

  const amount = Number(normalized);

  if (Number.isNaN(amount) || amount < 0) {
    return { success: false as const, message: "Fine amount must be zero or greater." };
  }

  if ((recordType === "warning" || recordType === "chalk") && amount !== 0) {
    return { success: false as const, message: `${recordType === "chalk" ? "Chalk records" : "Warnings"} must have a fine amount of $0.` };
  }

  return { success: true as const, value: amount.toFixed(2) };
}

export function normalizeRecordInput(input: z.infer<typeof recordSchema>) {
  const fine = normalizeFineAmount(input.fineAmount, input.recordType);

  if (!fine.success) {
    throw new Error(fine.message);
  }

  return {
    ...input,
    comment: input.comment.trim(),
    chalkTime: input.chalkTime || null,
    fineAmount: fine.value,
    occurredAt: new Date(`${input.date}T${input.time}:00`)
  };
}
