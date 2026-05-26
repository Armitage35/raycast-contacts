import { runAppleScript } from "run-applescript";
import { UnifiedContact } from "./types";

// ASCII control characters used as delimiters — unlikely to appear in contact data
const FS = "\x1d"; // Field Separator (Group Separator, ASCII 29)
const RS = "\x1e"; // Record Separator (ASCII 30)
const VS = "\x1c"; // Value Separator within a field (File Separator, ASCII 28)

const FETCH_SCRIPT = `
set fs to (ASCII character 29)
set rs to (ASCII character 30)
set vs to (ASCII character 28)
set records to {}

tell application "Contacts"
  repeat with p in every person
    try
      set pId to (id of p) as string

      set pName to ""
      try
        set pName to (name of p) as string
      end try

      set fnStr to ""
      try
        if first name of p is not missing value then
          set fnStr to (first name of p) as string
        end if
      end try

      set lnStr to ""
      try
        if last name of p is not missing value then
          set lnStr to (last name of p) as string
        end if
      end try

      set emailStr to ""
      repeat with e in (emails of p)
        try
          set et to ""
          try
            set et to (label of e) as string
          end try
          set emailStr to emailStr & (value of e as string) & vs & et & ","
        end try
      end repeat

      set phoneStr to ""
      repeat with ph in (phones of p)
        try
          set pt to ""
          try
            set pt to (label of ph) as string
          end try
          set phoneStr to phoneStr & (value of ph as string) & vs & pt & ","
        end try
      end repeat

      set orgStr to ""
      try
        if organization of p is not missing value then
          set orgStr to (organization of p) as string
        end if
      end try

      set jobStr to ""
      try
        if job title of p is not missing value then
          set jobStr to (job title of p) as string
        end if
      end try

      set noteStr to ""
      try
        if note of p is not missing value then
          set noteStr to (note of p) as string
        end if
      end try

      set bdStr to ""
      try
        if birth date of p is not missing value then
          set bd to birth date of p
          set bdStr to (year of bd as string) & "-" & ((month of bd as integer) as string) & "-" & (day of bd as string)
        end if
      end try

      set addrStr to ""
      repeat with a in (addresses of p)
        try
          set addrLabel to ""
          try
            set addrLabel to (label of a) as string
          end try
          set fmtAddr to ""
          try
            set fmtAddr to (formatted address of a) as string
          end try
          if fmtAddr is not "" then
            set addrStr to addrStr & fmtAddr & vs & addrLabel & ","
          end if
        end try
      end repeat

      set end of records to (pId & fs & pName & fs & fnStr & fs & lnStr & fs & emailStr & fs & phoneStr & fs & orgStr & fs & jobStr & fs & noteStr & fs & bdStr & fs & addrStr)
    end try
  end repeat
end tell

set AppleScript's text item delimiters to (ASCII character 30)
set output to records as string
set AppleScript's text item delimiters to ""
return output
`;

function parseFields(raw: string): string[] {
  return raw.split(VS);
}

function parseRepeatedField(raw: string): { value: string; type?: string }[] {
  if (!raw) return [];
  return raw
    .split(",")
    .filter(Boolean)
    .map((entry) => {
      const [value, type] = parseFields(entry);
      return { value: value?.trim() ?? "", type: type?.trim() || undefined };
    })
    .filter((e) => e.value);
}

function parseAddresses(raw: string): { formattedValue: string; type?: string }[] {
  if (!raw) return [];
  return raw
    .split(",")
    .filter(Boolean)
    .map((entry) => {
      const [value, type] = parseFields(entry);
      const formatted = value?.trim().replace(/\r?\n/g, ", ") ?? "";
      return { formattedValue: formatted, type: type?.trim() || undefined };
    })
    .filter((a) => a.formattedValue);
}

export async function fetchAppleContacts(): Promise<UnifiedContact[]> {
  const output = await runAppleScript(FETCH_SCRIPT);
  if (!output?.trim()) return [];

  const contacts: UnifiedContact[] = [];
  for (const record of output.split(RS)) {
    const trimmed = record.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(FS);
    const [id, name, firstName, lastName, emailsRaw, phonesRaw, org, jobTitle, notes, birthday, addrsRaw] = parts;

    if (!id) continue;

    const emails = parseRepeatedField(emailsRaw ?? "");
    const phones = parseRepeatedField(phonesRaw ?? "");
    const addresses = parseAddresses(addrsRaw ?? "");

    contacts.push({
      id: `apple:${id}`,
      displayName: name?.trim() || firstName?.trim() || lastName?.trim() || emails[0]?.value || id,
      firstName: firstName?.trim() || undefined,
      lastName: lastName?.trim() || undefined,
      emails,
      phones,
      company: org?.trim() || undefined,
      jobTitle: jobTitle?.trim() || undefined,
      notes: notes?.trim() || undefined,
      birthday: birthday?.trim() || undefined,
      addresses: addresses.length > 0 ? addresses : undefined,
    });
  }

  return contacts.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
