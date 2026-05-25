import { useMemo, useState, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { google } from "./oauth";
import { useAppleContacts, useGoogleContacts } from "./hooks";
import { ViewMode } from "./types";
import ContactList from "./components/ContactList";

const { googleClientId, defaultView } = getPreferenceValues<Preferences>();
const googleEnabled = Boolean(googleClientId?.trim());

function SearchContacts() {
  const [viewMode, setViewMode] = useState<ViewMode>((defaultView as ViewMode) ?? "detail");

  const { data: appleContacts, isLoading: appleLoading, revalidate: revalidateApple } = useAppleContacts();
  const { data: googleContacts, isLoading: googleLoading, revalidate: revalidateGoogle } = useGoogleContacts(googleEnabled);

  const contacts = useMemo(() => {
    const apple = appleContacts ?? [];
    const goog = googleContacts ?? [];
    const merged = [...apple, ...goog];
    return merged.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [appleContacts, googleContacts]);

  const handleRefresh = useCallback(() => {
    revalidateApple();
    if (googleEnabled) revalidateGoogle();
  }, [revalidateApple, revalidateGoogle]);

  return (
    <ContactList
      contacts={contacts}
      isLoading={appleLoading || (googleEnabled && googleLoading)}
      viewMode={viewMode}
      onViewModeChange={(v) => setViewMode(v as ViewMode)}
      onRefresh={handleRefresh}
      googleEnabled={googleEnabled}
    />
  );
}

export default googleEnabled ? withAccessToken(google())(SearchContacts) : SearchContacts;
