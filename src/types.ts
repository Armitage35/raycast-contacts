export type ContactSource = "apple" | "google";
export type ViewMode = "list" | "detail";

export interface ContactField {
  value: string;
  type?: string;
}

export interface ContactAddress {
  formattedValue: string;
  type?: string;
}

export interface UnifiedContact {
  id: string;
  source: ContactSource;
  displayName: string;
  firstName?: string;
  lastName?: string;
  emails: ContactField[];
  phones: ContactField[];
  company?: string;
  jobTitle?: string;
  addresses?: ContactAddress[];
  birthday?: string;
  notes?: string;
  photoUrl?: string;
  /** Google People API resource name, used for deep-linking */
  resourceName?: string;
}
