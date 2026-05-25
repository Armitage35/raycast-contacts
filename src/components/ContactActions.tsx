import { Action, ActionPanel, Icon } from "@raycast/api";
import { UnifiedContact } from "../types";

interface ContactActionsProps {
  contact: UnifiedContact;
  onRefresh: () => void;
}

export default function ContactActions({ contact, onRefresh }: ContactActionsProps) {
  const primaryEmail = contact.emails[0]?.value;
  const primaryPhone = contact.phones[0]?.value;

  return (
    <ActionPanel>
      {/* Primary action (⏎): email if available, otherwise open in Contacts */}
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
  );
}

function formatType(type: string | undefined): string {
  if (!type) return "";
  const clean = type.replace(/^_\$!<(.+)>!\$_$/, "$1");
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}
