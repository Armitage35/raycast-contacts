import { execFile } from "child_process";
import { promisify } from "util";
import { formatPhoneNumber } from "./format-phone";
import { UnifiedContact } from "./types";

export interface ContactFormValues {
  firstName: string;
  lastName: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  notes: string;
}

const execFileAsync = promisify(execFile);

async function runJXA(script: string): Promise<string> {
  const { stdout } = await execFileAsync("osascript", [
    "-l",
    "JavaScript",
    "-e",
    script,
  ]);
  return stdout.trim();
}

// ─── Fast list fetch (bulk-only, no per-person bridge calls) ──────────────────

const LIST_SCRIPT = `
var app = Application("Contacts");
var people = app.people;
var ids        = people.id();
var names      = people.name();
var firstNames = people.firstName();
var lastNames  = people.lastName();
var orgs       = people.organization();
var phoneVals  = people.phones.value();
var emailVals  = people.emails.value();
var out = [];
for (var i = 0; i < ids.length; i++) {
  var pvs = phoneVals[i];
  var evs = emailVals[i];
  out.push({
    id:           ids[i]        || "",
    name:         names[i]      || "",
    firstName:    firstNames[i] || "",
    lastName:     lastNames[i]  || "",
    org:          orgs[i]       || "",
    primaryPhone: (pvs && pvs.length > 0) ? pvs[0] || "" : "",
    primaryEmail: (evs && evs.length > 0) ? evs[0] || "" : ""
  });
}
JSON.stringify(out);
`;

export function normalizeKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function mergeContacts(
  a: UnifiedContact,
  b: UnifiedContact,
): UnifiedContact {
  return {
    ...a,
    firstName: a.firstName || b.firstName,
    lastName: a.lastName || b.lastName,
    company: a.company || b.company,
    primaryPhone: a.primaryPhone || b.primaryPhone,
    primaryEmail: a.primaryEmail || b.primaryEmail,
    jobTitle: a.jobTitle || b.jobTitle,
    emails: a.emails.length ? a.emails : b.emails,
    phones: a.phones.length ? a.phones : b.phones,
  };
}

export function deduplicateContacts(
  contacts: UnifiedContact[],
): UnifiedContact[] {
  const seen = new Map<string, UnifiedContact>();
  for (const contact of contacts) {
    const raw = contact.displayName;
    if (!raw || !raw.trim()) {
      // Don't deduplicate contacts with no display name — use id as key
      seen.set(contact.id, contact);
      continue;
    }
    const key = normalizeKey(raw);
    if (!seen.has(key)) {
      seen.set(key, contact);
    } else {
      seen.set(key, mergeContacts(seen.get(key)!, contact));
    }
  }
  return Array.from(seen.values());
}

export async function fetchAppleContacts(): Promise<UnifiedContact[]> {
  const json = await runJXA(LIST_SCRIPT);
  const raw: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    org: string;
    primaryPhone: string;
    primaryEmail: string;
  }[] = JSON.parse(json || "[]");

  const contacts = raw
    .filter((r) => r.id)
    .map((r) => ({
      id: `apple:${r.id}`,
      displayName: r.name || r.firstName || r.lastName || r.id,
      firstName: r.firstName || undefined,
      lastName: r.lastName || undefined,
      emails: [],
      phones: [],
      company: r.org || undefined,
      primaryPhone: r.primaryPhone || undefined,
      primaryEmail: r.primaryEmail || undefined,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return deduplicateContacts(contacts);
}

// ─── Full detail fetch for a single contact ───────────────────────────────────

function detailScript(appleId: string): string {
  return `
var app = Application("Contacts");
app.includeStandardAdditions = true;
var p = app.people.whose({ id: { _equals: ${JSON.stringify(appleId)} } })[0];
var rec = {
  emails: [], phones: [], addresses: [], notes: "", jobTitle: "", birthday: "", photoPath: ""
};
try {
  var img = p.image();
  var tempPath = "/tmp/raycast-contact-" + ${JSON.stringify(appleId)} + ".jpg";
  var f = app.openForAccess(Path(tempPath), { writePermission: true });
  app.setEof(f, { to: 0 });
  app.write(img, { to: f });
  app.closeAccess(f);
  rec.photoPath = tempPath;
} catch(photoErr) {}
try {
  var ems = p.emails();
  for (var j = 0; j < ems.length; j++) {
    try {
      var ev = ems[j].value() || "";
      var el = ""; try { el = ems[j].label() || ""; } catch(e2) {}
      if (ev) rec.emails.push({ value: ev, type: el });
    } catch(e) {}
  }
} catch(e) {}
try {
  var phs = p.phones();
  for (var j = 0; j < phs.length; j++) {
    try {
      var pv = phs[j].value() || "";
      var pl = ""; try { pl = phs[j].label() || ""; } catch(e2) {}
      if (pv) rec.phones.push({ value: pv, type: pl });
    } catch(e) {}
  }
} catch(e) {}
try {
  var adds = p.addresses();
  for (var j = 0; j < adds.length; j++) {
    try {
      var al = ""; try { al = adds[j].label() || ""; } catch(e2) {}
      var parts = [];
      try { var s = adds[j].street();   if (s) parts.push(s); } catch(e2) {}
      try { var c = adds[j].city();     if (c) parts.push(c); } catch(e2) {}
      try { var st = adds[j].state();   if (st) parts.push(st); } catch(e2) {}
      try { var z = adds[j].zip();      if (z) parts.push(z); } catch(e2) {}
      try { var co = adds[j].country(); if (co) parts.push(co); } catch(e2) {}
      var fa = parts.join(", ");
      if (fa) rec.addresses.push({ formattedValue: fa, type: al });
    } catch(e) {}
  }
} catch(e) {}
try { rec.jobTitle = p.jobTitle() || ""; } catch(e) {}
try { rec.notes = p.note() || ""; } catch(e) {}
try {
  var bd = p.birthdate();
  if (bd) {
    var d = new Date(bd);
    rec.birthday = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
} catch(e) {}
JSON.stringify(rec);
`;
}

interface RawDetail {
  emails: { value: string; type: string }[];
  phones: { value: string; type: string }[];
  addresses: { formattedValue: string; type: string }[];
  jobTitle: string;
  notes: string;
  birthday: string;
  photoPath: string;
}

function formatLabel(type: string): string | undefined {
  if (!type) return undefined;
  const clean = type.replace(/^_\$!<(.+)>!\$_$/, "$1");
  return clean || undefined;
}

export async function fetchContactDetail(
  contact: UnifiedContact,
): Promise<UnifiedContact> {
  const appleId = contact.id.replace("apple:", "");
  const json = await runJXA(detailScript(appleId));
  const raw: RawDetail = JSON.parse(json || "{}");

  return {
    ...contact,
    emails: (raw.emails ?? []).map((e) => ({
      value: e.value,
      type: formatLabel(e.type),
    })),
    phones: (raw.phones ?? []).map((p) => ({
      value: formatPhoneNumber(p.value),
      type: formatLabel(p.type),
    })),
    addresses: (raw.addresses ?? []).map((a) => ({
      formattedValue: a.formattedValue,
      type: formatLabel(a.type),
    })),
    jobTitle: raw.jobTitle || undefined,
    notes: raw.notes || undefined,
    birthday: raw.birthday || undefined,
    photoUrl: raw.photoPath ? `file://${raw.photoPath}` : undefined,
  };
}

// ─── Delete a contact ─────────────────────────────────────────────────────────

export async function deleteAppleContact(appleId: string): Promise<void> {
  await runJXA(`
    var app = Application("Contacts");
    var matches = app.people.whose({ id: { _equals: ${JSON.stringify(appleId)} } });
    if (matches.length > 0) {
      app.delete(matches[0]);
      app.save();
    }
  `);
}

// ─── Create a new contact ─────────────────────────────────────────────────────

export async function createAppleContact(
  values: ContactFormValues,
): Promise<void> {
  const v = JSON.stringify(values);
  const script = `
var app = Application("Contacts");
var v = ${v};
var props = {};
if (v.firstName) props.firstName    = v.firstName;
if (v.lastName)  props.lastName     = v.lastName;
if (v.company)   props.organization = v.company;
if (v.jobTitle)  props.jobTitle     = v.jobTitle;
if (v.notes)     props.note         = v.notes;
var person = app.Person(props);
app.defaultAddressBook.people.push(person);
if (v.email) {
  var email = app.Email({ label: "work", value: v.email });
  person.emails.push(email);
}
if (v.phone) {
  var phone = app.Phone({ label: "mobile", value: v.phone });
  person.phones.push(phone);
}
app.save();
"ok";
`;
  await runJXA(script);
}

// ─── Update an existing contact ───────────────────────────────────────────────

export async function updateAppleContact(
  appleId: string,
  values: ContactFormValues,
): Promise<void> {
  const v = JSON.stringify(values);
  const id = JSON.stringify(appleId);
  const script = `
var app = Application("Contacts");
var v = ${v};
var p = app.people.whose({ id: { _equals: ${id} } })[0];
p.firstName    = v.firstName || "";
p.lastName     = v.lastName  || "";
p.organization = v.company   || "";
p.jobTitle     = v.jobTitle  || "";
p.note         = v.notes     || "";
var emailCount = p.emails().length;
for (var i = emailCount - 1; i >= 0; i--) { app.delete(p.emails[i]); }
if (v.email) {
  var email = app.Email({ label: "work", value: v.email });
  p.emails.push(email);
}
var phoneCount = p.phones().length;
for (var i = phoneCount - 1; i >= 0; i--) { app.delete(p.phones[i]); }
if (v.phone) {
  var phone = app.Phone({ label: "mobile", value: v.phone });
  p.phones.push(phone);
}
app.save();
"ok";
`;
  await runJXA(script);
}
