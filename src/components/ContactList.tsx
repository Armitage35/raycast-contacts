import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { UnifiedContact } from "../types";
import { groupByLetter } from "../helpers";
import ContactActions from "./ContactActions";

interface ContactListProps {
  contacts: UnifiedContact[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function ContactList({ contacts, isLoading, onRefresh }: ContactListProps) {
  const sections = groupByLetter(contacts);

  return (
    <List isLoading={isLoading} navigationTitle="Search Contacts" searchBarPlaceholder="Search contacts…">
      <List.EmptyView
        title={isLoading ? "Loading Contacts…" : "No Contacts Found"}
        description={isLoading ? undefined : "Try a different search, or press ⌘O to open the Contacts app."}
        icon={Icon.TwoPeople}
        actions={
          !isLoading ? (
            <ActionPanel>
              <Action.Open title="Open Contacts App" icon={Icon.TwoPeople} target="addressbook://" shortcut={{ modifiers: ["cmd"], key: "o" }} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={onRefresh} />
            </ActionPanel>
          ) : undefined
        }
      />
      {sections.map(([letter, sectionContacts]) => (
        <List.Section key={letter} title={letter} subtitle={`${sectionContacts.length}`}>
          {sectionContacts.map((contact) => {
            const primaryPhone = contact.phones[0]?.value;
            const primaryEmail = contact.emails[0]?.value;
            const icon = contact.photoUrl
              ? { source: contact.photoUrl, mask: Image.Mask.Circle }
              : getAvatarIcon(contact.displayName);

            return (
              <List.Item
                key={contact.id}
                title={contact.displayName}
                subtitle={contact.company ?? ""}
                icon={icon}
                accessories={[
                  ...(primaryPhone ? [{ text: primaryPhone, icon: Icon.Phone }] : []),
                  ...(primaryEmail ? [{ text: primaryEmail, icon: Icon.Envelope }] : []),
                ]}
                keywords={[
                  contact.firstName ?? "",
                  contact.lastName ?? "",
                  primaryEmail ?? "",
                  primaryPhone ?? "",
                  contact.company ?? "",
                ]}
                actions={<ContactActions contact={contact} onRefresh={onRefresh} />}
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
