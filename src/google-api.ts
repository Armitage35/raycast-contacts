import { UnifiedContact } from "./types";

const BASE_URL = "https://people.googleapis.com/v1";
const PERSON_FIELDS = "names,emailAddresses,phoneNumbers,photos,organizations,addresses,biographies,birthdays";

interface FieldMetadata {
  primary?: boolean;
}

interface Name {
  displayName?: string;
  givenName?: string;
  familyName?: string;
}

interface EmailAddress {
  value?: string;
  type?: string;
  metadata?: FieldMetadata;
}

interface PhoneNumber {
  value?: string;
  type?: string;
  metadata?: FieldMetadata;
}

interface Photo {
  url?: string;
  default?: boolean;
}

interface Organization {
  name?: string;
  title?: string;
}

interface Address {
  formattedValue?: string;
  type?: string;
}

interface Biography {
  value?: string;
}

interface Birthday {
  date?: { year?: number; month?: number; day?: number };
  text?: string;
}

interface Person {
  resourceName: string;
  names?: Name[];
  emailAddresses?: EmailAddress[];
  phoneNumbers?: PhoneNumber[];
  photos?: Photo[];
  organizations?: Organization[];
  addresses?: Address[];
  biographies?: Biography[];
  birthdays?: Birthday[];
}

interface ConnectionsListResponse {
  connections?: Person[];
  nextPageToken?: string;
}

async function fetchApi<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Google authentication expired — please re-authorize in preferences.");
    }
    const body = await response.text();
    if (response.status === 403 && body.includes("SERVICE_DISABLED")) {
      throw new Error(
        "Google People API is not enabled. Visit console.cloud.google.com/apis/library/people.googleapis.com and click Enable.",
      );
    }
    throw new Error(`Google API error ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

function personToUnified(person: Person): UnifiedContact {
  const name = person.names?.[0];
  const nameParts = [name?.givenName, name?.familyName].filter(Boolean).join(" ");
  const displayName =
    name?.displayName ??
    (nameParts || undefined) ??
    person.emailAddresses?.[0]?.value ??
    person.phoneNumbers?.[0]?.value ??
    person.resourceName;

  const emails = (person.emailAddresses ?? [])
    .filter((e) => e.value)
    .map((e) => ({ value: e.value!, type: e.type || undefined }));

  const phones = (person.phoneNumbers ?? [])
    .filter((p) => p.value)
    .map((p) => ({ value: p.value!, type: p.type || undefined }));

  const addresses = (person.addresses ?? [])
    .filter((a) => a.formattedValue)
    .map((a) => ({ formattedValue: a.formattedValue!, type: a.type || undefined }));

  const photo = person.photos?.find((p) => !p.default);
  const org = person.organizations?.[0];

  const bday = person.birthdays?.[0];
  let birthday: string | undefined;
  if (bday?.date) {
    const { year, month, day } = bday.date;
    if (month && day) {
      birthday = year
        ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        : `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    } else if (bday.text) {
      birthday = bday.text;
    }
  }

  return {
    id: `google:${person.resourceName}`,
    source: "google",
    displayName,
    firstName: name?.givenName,
    lastName: name?.familyName,
    emails,
    phones,
    company: org?.name,
    jobTitle: org?.title,
    addresses: addresses.length > 0 ? addresses : undefined,
    birthday,
    notes: person.biographies?.[0]?.value,
    photoUrl: photo?.url,
    resourceName: person.resourceName,
  };
}

export async function fetchGoogleContacts(token: string): Promise<UnifiedContact[]> {
  const all: Person[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      personFields: PERSON_FIELDS,
      pageSize: "1000",
      sortOrder: "FIRST_NAME_ASCENDING",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetchApi<ConnectionsListResponse>(`${BASE_URL}/people/me/connections?${params}`, token);
    if (res.connections) all.push(...res.connections);
    pageToken = res.nextPageToken;
  } while (pageToken);

  return all.map(personToUnified);
}
