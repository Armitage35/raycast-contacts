import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchContactDetail } from "../apple-contacts";
import { UnifiedContact } from "../types";
import { formatBirthday } from "../helpers";

interface ContactDetailProps {
  contact: UnifiedContact;
  onRefresh: () => void;
}

function formatType(type: string | undefined): string {
  if (!type) return "";
  const clean = type.replace(/^_\$!<(.+)>!\$_$/, "$1");
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

export default function ContactDetail({ contact, onRefresh }: ContactDetailProps) {
  const { data: full, isLoading } = useCachedPromise(fetchContactDetail, [contact], {
    keepPreviousData: true,
  });

  const c = full ?? contact;
  const primaryEmail = c.emails[0]?.value;
  const primaryPhone = c.phones[0]?.value;
  const birthday = formatBirthday(c.birthday);

  const lines: string[] = [`# ${c.displayName}`];
  if (c.company || c.jobTitle) {
    lines.push([c.jobTitle, c.company].filter(Boolean).join(" · "));
  }
  lines.push("");

  if (c.phones.length > 0) {
    lines.push("### Phone");
    for (const p of c.phones) lines.push(`- ${p.value}${p.type ? `  *(${formatType(p.type)})*` : ""}`);
    lines.push("");
  }
  if (c.emails.length > 0) {
    lines.push("### Email");
    for (const e of c.emails) lines.push(`- ${e.value}${e.type ? `  *(${formatType(e.type)})*` : ""}`);
    lines.push("");
  }
  if ((c.addresses ?? []).length > 0) {
    lines.push("### Address");
    for (const a of c.addresses!) {
      lines.push(`- ${a.formattedValue.replace(/\n/g, ", ")}${a.type ? `  *(${formatType(a.type)})*` : ""}`);
    }
    lines.push("");
  }
  if (birthday) lines.push(`### Birthday\n- ${birthday}\n`);
  if (c.notes) lines.push(`### Notes\n${c.notes}`);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={c.displayName}
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
            {c.phones.map((p, i) => (
              <Action.CopyToClipboard
                key={p.value}
                title={`Copy ${formatType(p.type)} Phone`}
                content={p.value}
                shortcut={i === 0 ? { modifiers: ["cmd", "shift"], key: "p" } : undefined}
              />
            ))}
            {c.emails.map((e, i) => (
              <Action.CopyToClipboard
                key={e.value}
                title={`Copy ${formatType(e.type)} Email`}
                content={e.value}
                shortcut={i === 0 ? { modifiers: ["cmd", "shift"], key: "e" } : undefined}
              />
            ))}
            <Action.CopyToClipboard
              title="Copy Name"
              content={c.displayName}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
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
