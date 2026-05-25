import { Action, ActionPanel, Icon } from "@raycast/api";
import { UnifiedContact } from "../types";
import { getContactUrl } from "../helpers";

interface ContactActionsProps {
  contact: UnifiedContact;
  onRefresh: () => void;
}

export default function ContactActions({ contact, onRefresh }: ContactActionsProps) {
  const primaryEmail = contact.emails[0]?.value;
  const primaryPhone = contact.phones[0]?.value;
  const googleUrl = getContactUrl(contact);

  return (
    <ActionPanel>
      <ActionPanel.Section title={contact.displayName}>
        {primaryEmail && (
          <Action.Open
            title="Compose Email"
            icon={Icon.Envelope}
            target={`mailto:${primaryEmail}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          />
        )}
        {primaryPhone && (
          <Action.Open
            title="Call"
            icon={Icon.Phone}
            target={`tel:${primaryPhone}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        )}
        {contact.source === "apple" && (
          <Action.Open
            title="Open in Contacts"
            icon={Icon.TwoPeople}
            target="addressbook://"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        )}
        {googleUrl && (
          <Action.OpenInBrowser
            title="Open in Google Contacts"
            url={googleUrl}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Name"
          content={contact.displayName}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        />
        {contact.emails.map((e) => (
          <Action.CopyToClipboard
            key={e.value}
            title={`Copy Email${e.type ? ` (${e.type})` : ""}`}
            content={e.value}
          />
        ))}
        {contact.phones.map((p) => (
          <Action.CopyToClipboard
            key={p.value}
            title={`Copy Phone${p.type ? ` (${p.type})` : ""}`}
            content={p.value}
          />
        ))}
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
