import { useCachedPromise, getAccessToken } from "@raycast/utils";
import { fetchAppleContacts } from "./apple-contacts";
import { fetchGoogleContacts } from "./google-api";
import { UnifiedContact } from "./types";

export function useAppleContacts() {
  return useCachedPromise(fetchAppleContacts, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to load Apple Contacts" },
  });
}

export function useGoogleContacts(enabled: boolean) {
  return useCachedPromise(
    async (isEnabled: boolean): Promise<UnifiedContact[]> => {
      if (!isEnabled) return [];
      const { token } = getAccessToken();
      return fetchGoogleContacts(token);
    },
    [enabled],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Failed to load Google Contacts" },
    },
  );
}
