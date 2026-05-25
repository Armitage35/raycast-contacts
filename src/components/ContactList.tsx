import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { UnifiedContact, ViewMode } from "../types";
import { formatBirthday, groupByLetter } from "../helpers";
import ContactActions from "./ContactActions";

interface ContactListProps {
  contacts: UnifiedContact[];
  isLoading: boolean;
  viewMode: ViewMode;
  onViewModeChange: (value: string) => void;
  onRefresh: () => void;
}

function ViewModeDropdown({ value, onChange }: { value: ViewMode; onChange: (value: string) => void }) {
  return (
    <List.Dropdown tooltip="View" storeValue value={value} onChange={onChange}>
      <List.Dropdown.Item title="List" value="list" icon={Icon.AppWindowList} />
      <List.Dropdown.Item title="Detail" value="detail" icon={Icon.AppWindowSidebarRight} />
    </List.Dropdown>
  );
}

export default function ContactList({ contacts, isLoading, viewMode, onViewModeChange, onRefresh }: ContactListProps) {
  const isDetail = viewMode === "detail";
  const sections = groupByLetter(contacts);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isDetail}
      navigationTitle="Search Contacts"
      searchBarPlaceholder="Search contacts..."
      searchBarAccessory={<ViewModeDropdown value={viewMode} onChange={onViewModeChange} />}
    >
      <List.EmptyView
        title={isLoading ? "Loading Contacts…" : "No Contacts Found"}
        description={isLoading ? undefined : "Try a different search, or press ⌘O to open the Contacts app."}
        icon={Icon.TwoPeople}
        actions={
          !isLoading ? (
            <ActionPanel>
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
        <List.Section key={letter} title={letter} subtitle={`${sectionContacts.length}`}>
          {sectionContacts.map((contact) => {
            const primaryPhone = contact.phones[0]?.value;
            const primaryEmail = contact.emails[0]?.value;
            const icon = contact.photoUrl
              ? { source: contact.photoUrl, mask: Image.Mask.Circle }
              : getAvatarIcon(contact.displayName);

            const emails = contact.emails;
            const phones = contact.phones;
            const addresses = contact.addresses ?? [];
            const birthday = formatBirthday(contact.birthday);

            return (
              <List.Item
                key={contact.id}
                title={contact.displayName}
                subtitle={isDetail ? "" : (contact.company ?? "")}
                icon={icon}
                accessories={
                  isDetail
                    ? undefined
                    : [
                        ...(primaryPhone ? [{ text: primaryPhone, icon: Icon.Phone }] : []),
                        ...(primaryEmail ? [{ text: primaryEmail, icon: Icon.Envelope }] : []),
                      ]
                }
                keywords={[
                  contact.firstName ?? "",
                  contact.lastName ?? "",
                  primaryEmail ?? "",
                  primaryPhone ?? "",
                  contact.company ?? "",
                ]}
                detail={
                  isDetail ? (
                    <List.Item.Detail
                      markdown={[
                        `## ${contact.displayName}`,
                        ...(contact.company ? [`**${contact.company}**`] : []),
                        ...(contact.jobTitle ? [`*${contact.jobTitle}*`] : []),
                      ].join("\n\n")}
                      metadata={
                        <List.Item.Detail.Metadata>
                          {phones.map((p) => (
                            <List.Item.Detail.Metadata.Link
                              key={p.value}
                              title={formatType(p.type)}
                              text={p.value}
                              target={`tel:${p.value}`}
                            />
                          ))}
                          {emails.map((e) => (
                            <List.Item.Detail.Metadata.Link
                              key={e.value}
                              title={formatType(e.type)}
                              text={e.value}
                              target={`mailto:${e.value}`}
                            />
                          ))}
                          {addresses.map((a, i) => (
                            <List.Item.Detail.Metadata.Label
                              key={i}
                              title={formatType(a.type)}
                              text={a.formattedValue}
                            />
                          ))}
                          {birthday && <List.Item.Detail.Metadata.Label title="Birthday" text={birthday} />}
                          {contact.notes && (
                            <>
                              <List.Item.Detail.Metadata.Separator />
                              <List.Item.Detail.Metadata.Label title="Notes" text={contact.notes} />
                            </>
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  ) : undefined
                }
                actions={<ContactActions contact={contact} onRefresh={onRefresh} />}
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function formatType(type: string | undefined): string {
  if (!type) return "Other";
  // Strip AppleScript label wrappers like "_$!<Home>!$_"
  const clean = type.replace(/^_\$!<(.+)>!\$_$/, "$1");
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}
