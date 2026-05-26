import {
  Action,
  ActionPanel,
  Icon,
  Image,
  List,
  useNavigation,
} from "@raycast/api";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fetchContactDetail } from "../apple-contacts";
import { formatBirthday, groupByLetter } from "../helpers";
import { ContactAddress, UnifiedContact } from "../types";
import ContactActions from "./ContactActions";
import ContactForm from "./ContactForm";

function formatType(type: string | undefined): string {
  if (!type) return "";
  const clean = type.replace(/^_\$!<(.+)>!\$_$/, "$1");
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function formatAddress(a: ContactAddress): string {
  return a.formattedValue.replace(/\n/g, ", ");
}

function buildHeaderMarkdown(c: UnifiedContact): string {
  const lines: string[] = [];

  if (c.photoUrl) lines.push(`![](${c.photoUrl})\n`);

  lines.push(`# ${c.displayName}`);

  if (c.jobTitle || c.company) {
    const subtitle = [c.jobTitle, c.company].filter(Boolean).join(" at ");
    lines.push(`*${subtitle}*`);
  }

  return lines.join("\n");
}

interface ContactListProps {
  contacts: UnifiedContact[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function ContactList({
  contacts,
  isLoading,
  onRefresh,
}: ContactListProps) {
  const { push } = useNavigation();
  const sections = groupByLetter(contacts);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedContact = contacts.find((c) => c.id === selectedId) ?? null;

  const { data: detailContact, isLoading: isLoadingDetail } = useCachedPromise(
    fetchContactDetail,

    [selectedContact!],
    {
      keepPreviousData: true,
      execute: selectedContact !== null,
    },
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search contacts…"
      onSelectionChange={(id) => setSelectedId(id ?? null)}
    >
      <List.EmptyView
        title={isLoading ? "Loading Contacts…" : "No Contacts Found"}
        description={
          isLoading
            ? undefined
            : "Try a different search, or press ⌘O to open the Contacts app."
        }
        icon={Icon.TwoPeople}
        actions={
          !isLoading ? (
            <ActionPanel>
              <Action
                title="New Contact"
                icon={Icon.PersonCircle}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => push(<ContactForm onSaved={onRefresh} />)}
              />
              <Action.Open
                title="Open Contacts App"
                icon={Icon.TwoPeople}
                target="addressbook://"
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={onRefresh}
              />
            </ActionPanel>
          ) : undefined
        }
      />
      {sections.map(([letter, sectionContacts]) => (
        <List.Section
          key={letter}
          title={letter}
          subtitle={`${sectionContacts.length}`}
        >
          {sectionContacts.map((contact) => {
            const isSelected = contact.id === selectedId;
            const displayContact =
              isSelected && detailContact ? detailContact : contact;

            const photoUrl = displayContact.photoUrl ?? contact.photoUrl;
            const icon = photoUrl
              ? { source: photoUrl, mask: Image.Mask.Circle }
              : getAvatarIcon(contact.displayName);

            return (
              <List.Item
                key={contact.id}
                id={contact.id}
                title={contact.displayName}
                icon={icon}
                keywords={[
                  contact.firstName ?? "",
                  contact.lastName ?? "",
                  contact.company ?? "",
                  contact.primaryPhone ?? "",
                  contact.primaryEmail ?? "",
                ]}
                detail={(() => {
                  const phones = displayContact.phones ?? [];
                  const emails = displayContact.emails ?? [];
                  const addresses = displayContact.addresses ?? [];
                  const birthday = formatBirthday(displayContact.birthday);
                  const notes = displayContact.notes;

                  return (
                    <List.Item.Detail
                      markdown={buildHeaderMarkdown(displayContact)}
                      isLoading={isSelected && isLoadingDetail}
                      metadata={
                        <List.Item.Detail.Metadata>
                          {phones.map((p, i) => (
                            <List.Item.Detail.Metadata.Label
                              key={i}
                              title={i === 0 ? "Phone" : ""}
                              text={`${p.value}${p.type ? `  (${formatType(p.type)})` : ""}`}
                              icon={i === 0 ? Icon.Phone : undefined}
                            />
                          ))}

                          {phones.length > 0 && emails.length > 0 && (
                            <List.Item.Detail.Metadata.Separator />
                          )}

                          {emails.map((e, i) => (
                            <List.Item.Detail.Metadata.Label
                              key={i}
                              title={i === 0 ? "Email" : ""}
                              text={`${e.value}${e.type ? `  (${formatType(e.type)})` : ""}`}
                              icon={i === 0 ? Icon.Envelope : undefined}
                            />
                          ))}

                          {addresses.length > 0 && (
                            <List.Item.Detail.Metadata.Separator />
                          )}
                          {addresses.map((a, i) => (
                            <List.Item.Detail.Metadata.Label
                              key={i}
                              title={i === 0 ? "Address" : ""}
                              text={`${formatAddress(a)}${a.type ? `  (${formatType(a.type)})` : ""}`}
                            />
                          ))}

                          {birthday && <List.Item.Detail.Metadata.Separator />}
                          {birthday && (
                            <List.Item.Detail.Metadata.Label
                              title="Birthday"
                              text={birthday}
                              icon={Icon.Calendar}
                            />
                          )}

                          {notes && <List.Item.Detail.Metadata.Separator />}
                          {notes && (
                            <List.Item.Detail.Metadata.Label
                              title="Notes"
                              text={notes}
                            />
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  );
                })()}
                actions={
                  <ContactActions
                    contact={displayContact}
                    onRefresh={onRefresh}
                    onContactDeleted={onRefresh}
                  />
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
