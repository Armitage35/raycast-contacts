/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Google OAuth Client ID - Optional. Add a Google OAuth Client ID (iOS type, bundle ID: com.raycast) to also search Google Contacts. Apple Contacts always work without this. */
  "googleClientId"?: string,
  /** Default View - Default view mode for the contact list. */
  "defaultView": "list" | "detail"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-contacts` command */
  export type SearchContacts = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-contacts` command */
  export type SearchContacts = {}
}

