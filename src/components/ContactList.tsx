import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fetchContactDetail } from "../apple-contacts";
import { formatBirthday, groupByLetter } from "../helpers";
import { UnifiedContact } from "../types";
import ContactActions from "./ContactActions";

function formatType(type: string | undefined): string {
  if (!type) return "";
  const clean = type.replace(/^_\$!<(.+)>!\$_$/, "$1");
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function buildMarkdown(c: UnifiedContact): string {
  const birthday = formatBirthday(c.birthday);
  const lines: string[] = [`# ${c.displayName}`];
  if (c.company || c.jobTitle) {
    lines.push([c.jobTitle, c.company].filter(Boolean).join(" · "));
  }
  lines.push("");

  if (c.phones.length > 0) {
    lines.push("### Phone");
    for (const p of c.phones) {
      lines.push(`- ${p.value}${p.type ? `  *(${formatType(p.type)})*` : ""}`);
    }
    lines.push("");
  }
  if (c.emails.length > 0) {
    lines.push("### Email");
    for (const e of c.emails) {
      lines.push(`- ${e.value}${e.type ? `  *(${formatType(e.type)})*` : ""}`);
    }
    lines.push("");
  }
  if ((c.addresses ?? []).length > 0) {
    lines.push("### Address");
    for (const a of c.addresses!) {
      lines.push(
        `- ${a.formattedValue.replace(/\n/g, ", ")}${a.type ? `  *(${formatType(a.type)})*` : ""}`,
      );
    }
    lines.push("");
  }
  if (birthday) lines.push(`### Birthday\n- 🎂 ${birthday}\n`);
  if (c.notes) lines.push(`### Notes\n${c.notes}`);

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
  const sections = groupByLetter(contacts);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedContact = contacts.find((c) => c.id === selectedId) ?? null;

  const { data: detailContact, isLoading: isLoadingDetail } = useCachedPromise(
    fetchContactDetail,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
      navigationTitle="Search Contacts"
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
            const icon = contact.photoUrl
              ? { source: contact.photoUrl, mask: Image.Mask.Circle }
              : getAvatarIcon(contact.displayName);

            const isSelected = contact.id === selectedId;
            const displayContact =
              isSelected && detailContact ? detailContact : contact;

            return (
              <List.Item
                key={contact.id}
                id={contact.id}
                title={contact.displayName}
                subtitle={contact.company ?? ""}
                icon={icon}
                keywords={[
                  contact.firstName ?? "",
                  contact.lastName ?? "",
                  contact.company ?? "",
                ]}
                detail={
                  <List.Item.Detail
                    markdown={buildMarkdown(displayContact)}
                    isLoading={isSelected && isLoadingDetail}
                  />
                }
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
