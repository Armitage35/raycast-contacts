import { getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

let _google: OAuthService | undefined;

export function google(): OAuthService {
  if (!_google) {
    const { googleClientId } = getPreferenceValues<Preferences>();
    _google = OAuthService.google({
      clientId: (googleClientId ?? "").trim(),
      scope: "https://www.googleapis.com/auth/contacts.readonly",
    });
  }
  return _google;
}
