import { useState, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { useContacts } from "./hooks";
import { ViewMode } from "./types";
import ContactList from "./components/ContactList";

const { defaultView } = getPreferenceValues<Preferences>();

export default function SearchContacts() {
  const [viewMode, setViewMode] = useState<ViewMode>((defaultView as ViewMode) ?? "detail");
  const { data: contacts, isLoading, revalidate } = useContacts();

  const handleRefresh = useCallback(() => revalidate(), [revalidate]);

  return (
    <ContactList
      contacts={contacts ?? []}
      isLoading={isLoading}
      viewMode={viewMode}
      onViewModeChange={(v) => setViewMode(v as ViewMode)}
      onRefresh={handleRefresh}
    />
  );
}
