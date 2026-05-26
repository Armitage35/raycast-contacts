import { execFile } from "child_process";
import { promisify } from "util";
import { UnifiedContact } from "./types";

const execFileAsync = promisify(execFile);

async function runJXA(script: string): Promise<string> {
  const { stdout } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", script]);
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
var out = [];
for (var i = 0; i < ids.length; i++) {
  out.push({
    id:        ids[i]        || "",
    name:      names[i]      || "",
    firstName: firstNames[i] || "",
    lastName:  lastNames[i]  || "",
    org:       orgs[i]       || ""
  });
}
JSON.stringify(out);
`;

export async function fetchAppleContacts(): Promise<UnifiedContact[]> {
  const json = await runJXA(LIST_SCRIPT);
  const raw: { id: string; name: string; firstName: string; lastName: string; org: string }[] =
    JSON.parse(json || "[]");

  return raw
    .filter((r) => r.id)
    .map((r) => ({
      id: `apple:${r.id}`,
      displayName: r.name || r.firstName || r.lastName || r.id,
      firstName: r.firstName || undefined,
      lastName: r.lastName || undefined,
      emails: [],
      phones: [],
      company: r.org || undefined,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
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

export async function fetchContactDetail(contact: UnifiedContact): Promise<UnifiedContact> {
  const appleId = contact.id.replace("apple:", "");
  const json = await runJXA(detailScript(appleId));
  const raw: RawDetail = JSON.parse(json || "{}");

  return {
    ...contact,
    emails: (raw.emails ?? []).map((e) => ({ value: e.value, type: formatLabel(e.type) })),
    phones: (raw.phones ?? []).map((p) => ({ value: p.value, type: formatLabel(p.type) })),
    addresses: (raw.addresses ?? []).map((a) => ({ formattedValue: a.formattedValue, type: formatLabel(a.type) })),
    jobTitle: raw.jobTitle || undefined,
    notes: raw.notes || undefined,
    birthday: raw.birthday || undefined,
    photoUrl: raw.photoPath ? `file://${raw.photoPath}` : undefined,
  };
}
