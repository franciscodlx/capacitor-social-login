/**
 * Native side of the core (Swift on iOS, Kotlin on Android, a popup on the
 * web). Apps use the TypeScript API on top of it (`authorize`,
 * `createProviderLogin`, …), not this interface directly.
 */
export interface AuthCorePlugin {
  /** Whether the device can present a system browser auth session. */
  isAvailable(): Promise<{ available: boolean }>;
  /** `byteLength` cryptographically secure random bytes, base64url without padding. */
  randomBase64Url(options: { byteLength: number }): Promise<{ value: string }>;
  /** SHA-256 of the UTF-8 `input`, base64url without padding. */
  sha256Base64Url(options: { input: string }): Promise<{ value: string }>;
  /**
   * Opens `url` in the system browser (ASWebAuthenticationSession on iOS,
   * Custom Tabs on Android) and resolves with the full redirect URL once the
   * provider redirects back to `redirectUri`.
   * Rejects with code `CANCELLED`, `NOT_SUPPORTED`, `INVALID_CONFIG` or `PROVIDER_ERROR`.
   */
  openAuthSession(options: {
    url: string;
    redirectUri: string;
    prefersEphemeralSession?: boolean;
  }): Promise<{ url: string }>;
  /** Dismisses the auth session in progress, if any. */
  cancelAuthSession(): Promise<void>;
}
