import {
  Action,
  ActionPanel,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
} from "@raycast/api";
import { deleteAppleContact } from "../apple-contacts";
import { UnifiedContact } from "../types";

interface ContactActionsProps {
  contact: UnifiedContact;
  onRefresh: () => void;
  onContactDeleted: () => void;
}

export default function ContactActions({
  contact,
  onRefresh,
  onContactDeleted,
}: ContactActionsProps) {
  const primaryEmail = contact.emails[0]?.value;
  const primaryPhone = contact.phones[0]?.value;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {/* Primary action priority: Compose Email > Call > Open in Contacts */}
        {primaryEmail && (
          <Action.Open
            title="Compose Email"
            icon={Icon.Envelope}
            target={`mailto:${primaryEmail}`}
          />
        )}
        {primaryPhone && (
          <Action.Open
            title="Call"
            icon={Icon.Phone}
            target={`tel:${primaryPhone}`}
            shortcut={
              primaryEmail
                ? { modifiers: ["cmd", "shift"], key: "c" }
                : undefined
            }
          />
        )}
        <Action.Open
          title="Open in Contacts"
          icon={Icon.TwoPeople}
          target="addressbook://"
          shortcut={
            primaryEmail || primaryPhone
              ? { modifiers: ["cmd"], key: "o" }
              : undefined
          }
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        {contact.phones.map((p, i) => (
          <Action.CopyToClipboard
            key={p.value}
            title={`Copy ${formatType(p.type)} Phone`}
            content={p.value}
            shortcut={
              i === 0 ? { modifiers: ["cmd", "shift"], key: "p" } : undefined
            }
          />
        ))}
        {contact.emails.map((e) => (
          <Action.CopyToClipboard
            key={e.value}
            title={`Copy ${formatType(e.type)} Email`}
            content={e.value}
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

      <ActionPanel.Section>
        <Action
          title="Delete Contact"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Delete Contact",
              message: `Are you sure you want to delete "${contact.displayName}"? This cannot be undone.`,
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
              },
            });
            if (!confirmed) return;
            try {
              const appleId = contact.id.replace("apple:", "");
              await deleteAppleContact(appleId);
              await showToast({
                style: Toast.Style.Success,
                title: "Contact deleted",
              });
              onContactDeleted();
            } catch (err) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to delete contact",
                message: err instanceof Error ? err.message : String(err),
              });
            }
          }}
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
