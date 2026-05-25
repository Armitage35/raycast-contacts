import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { UnifiedContact } from "../types";
import { formatBirthday } from "../helpers";

interface ContactDetailProps {
  contact: UnifiedContact;
  onRefresh: () => void;
}

export default function ContactDetail({ contact, onRefresh }: ContactDetailProps) {
  const primaryEmail = contact.emails[0]?.value;
  const primaryPhone = contact.phones[0]?.value;
  const birthday = formatBirthday(contact.birthday);

  const lines: string[] = [`# ${contact.displayName}`];
  if (contact.company || contact.jobTitle) {
    lines.push([contact.jobTitle, contact.company].filter(Boolean).join(" · "));
  }
  lines.push("");

  if (contact.phones.length > 0) {
    lines.push("### Phone");
    for (const p of contact.phones) lines.push(`- ${p.value}${p.type ? `  *(${formatType(p.type)})*` : ""}`);
    lines.push("");
  }
  if (contact.emails.length > 0) {
    lines.push("### Email");
    for (const e of contact.emails) lines.push(`- ${e.value}${e.type ? `  *(${formatType(e.type)})*` : ""}`);
    lines.push("");
  }
  if ((contact.addresses ?? []).length > 0) {
    lines.push("### Address");
    for (const a of contact.addresses!) {
      lines.push(`- ${a.formattedValue.replace(/\n/g, ", ")}${a.type ? `  *(${formatType(a.type)})*` : ""}`);
    }
    lines.push("");
  }
  if (birthday) {
    lines.push(`### Birthday\n- ${birthday}\n`);
  }
  if (contact.notes) {
    lines.push(`### Notes\n${contact.notes}`);
  }

  return (
    <Detail
      navigationTitle={contact.displayName}
      markdown={lines.join("\n")}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {primaryEmail && (
              <Action.Open title="Compose Email" icon={Icon.Envelope} target={`mailto:${primaryEmail}`} />
            )}
            {primaryPhone && (
              <Action.Open
                title="Call"
                icon={Icon.Phone}
                target={`tel:${primaryPhone}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
            <Action.Open
              title="Open in Contacts"
              icon={Icon.TwoPeople}
              target="addressbook://"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            {contact.phones.map((p, i) => (
              <Action.CopyToClipboard
                key={p.value}
                title={`Copy ${formatType(p.type)} Phone`}
                content={p.value}
                shortcut={i === 0 ? { modifiers: ["cmd", "shift"], key: "p" } : undefined}
              />
            ))}
            {contact.emails.map((e, i) => (
              <Action.CopyToClipboard
                key={e.value}
                title={`Copy ${formatType(e.type)} Email`}
                content={e.value}
                shortcut={i === 0 ? { modifiers: ["cmd", "shift"], key: "e" } : undefined}
              />
            ))}
            <Action.CopyToClipboard
              title="Copy Name"
              content={contact.displayName}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh Contacts"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function formatType(type: string | undefined): string {
  if (!type) return "";
  const clean = type.replace(/^_\$!<(.+)>!\$_$/, "$1");
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}
