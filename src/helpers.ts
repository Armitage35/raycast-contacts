import { UnifiedContact } from "./types";

export function getContactUrl(contact: UnifiedContact): string | undefined {
  if (contact.source === "google" && contact.resourceName) {
    const id = contact.resourceName.replace("people/", "");
    return `https://contacts.google.com/person/${id}`;
  }
  return undefined;
}

export function formatBirthday(birthday: string | undefined): string | undefined {
  if (!birthday) return undefined;
  const parts = birthday.split("-").map(Number);
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}${year > 1 ? `-${year}` : ""}`;
  }
  if (parts.length === 2) {
    const [month, day] = parts;
    return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return birthday;
}

export function groupByLetter(contacts: UnifiedContact[]): [string, UnifiedContact[]][] {
  const groups: Record<string, UnifiedContact[]> = {};
  for (const contact of contacts) {
    const ch = contact.displayName.charAt(0).toUpperCase();
    const key = /[A-Z]/.test(ch) ? ch : "#";
    (groups[key] ??= []).push(contact);
  }
  return Object.entries(groups).sort(([a], [b]) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });
}
