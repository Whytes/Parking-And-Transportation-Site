export type LocationActionState = {
  error?: string;
  item?: {
    id: string;
    name: string;
  };
  success?: string;
  deletedId?: string;
};

export type ViolationActionState = {
  error?: string;
  item?: {
    id: string;
    code: string;
    label: string;
    defaultFine: string;
  };
  success?: string;
  deletedId?: string;
};

export type ArchiveActionState = {
  error?: string;
  success?: string;
  archivedId?: string;
};

export type LocationViolationActionState = {
  error?: string;
  success?: string;
  locationId?: string;
  violationIds?: string[];
};
