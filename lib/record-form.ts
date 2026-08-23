export type RecordFormValues = {
  id?: string;
  recordType: "citation" | "warning" | "chalk";
  date: string;
  time: string;
  locationId: string;
  chalkTime: string;
  violationId: string;
  fineAmount: string;
  plateState: string;
  plateNumber: string;
  comment: string;
};

export type WorkspaceRecord = {
  id: string;
  recordType: "citation" | "warning" | "chalk";
  occurredAt: string;
  officerNumber: string;
  locationId: string;
  locationName: string;
  violationId: string;
  violationLabel: string;
  chalkTime: string | null;
  fineAmount: string;
  plateState: string;
  plateNumber: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  voidedAt: string | null;
  voidReason: string | null;
  createdByUserId: string;
  createdByName: string;
};

export type DuplicateCandidate = {
  id: string;
  occurredAt: string;
  locationName: string;
  violationLabel: string;
};

export type RecordFormState = {
  success?: string;
  error?: string;
  duplicateWarning?: string;
  duplicateRecordId?: string;
  requiresDuplicateConfirmation?: boolean;
  fieldErrors?: Partial<Record<keyof RecordFormValues, string>>;
  values: RecordFormValues;
  savedRecord?: WorkspaceRecord;
};

export const emptyRecordValues: RecordFormValues = {
  recordType: "citation",
  date: "",
  time: "",
  locationId: "",
  chalkTime: "",
  violationId: "",
  fineAmount: "",
  plateState: "",
  plateNumber: "",
  comment: ""
};
