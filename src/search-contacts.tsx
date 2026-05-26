import { execFile } from "child_process";
import { useCallback } from "react";
import { useContacts } from "./hooks";
import ContactList from "./components/ContactList";

// Fire-and-forget: wake the Contacts JXA bridge before the real fetch fires
execFile("osascript", [
  "-l",
  "JavaScript",
  "-e",
  'Application("Contacts").activate();',
]);

export default function SearchContacts() {
  const { data: contacts, isLoading, revalidate } = useContacts();
  const handleRefresh = useCallback(() => revalidate(), [revalidate]);

  return (
    <ContactList
      contacts={contacts ?? []}
      isLoading={isLoading}
      onRefresh={handleRefresh}
    />
  );
}
