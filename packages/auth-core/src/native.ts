import { AuthCore } from './plugin';

/**
 * What the TypeScript core needs from the platform. Kept as a narrow
 * interface so the flow (authorize, provider) is identical in every
 * framework of the family and easy to fake in tests.
 */
export interface AuthNative {
  isAvailable(): Promise<boolean>;
  randomBase64Url(byteLength: number): Promise<string>;
  sha256Base64Url(input: string): Promise<string>;
  openAuthSession(
    url: string,
    redirectUri: string,
    prefersEphemeralSession: boolean
  ): Promise<string>;
  cancelAuthSession(): Promise<void>;
}

const capacitorNative: AuthNative = {
  isAvailable: async () => (await AuthCore.isAvailable()).available,
  randomBase64Url: async (byteLength) =>
    (await AuthCore.randomBase64Url({ byteLength })).value,
  sha256Base64Url: async (input) =>
    (await AuthCore.sha256Base64Url({ input })).value,
  openAuthSession: async (url, redirectUri, prefersEphemeralSession) =>
    (
      await AuthCore.openAuthSession({
        url,
        redirectUri,
        prefersEphemeralSession,
      })
    ).url,
  cancelAuthSession: () => AuthCore.cancelAuthSession(),
};

let current: AuthNative = capacitorNative;

export function getNative(): AuthNative {
  return current;
}

/** Replaces the platform layer. For tests only. */
export function setNativeForTesting(native: AuthNative | null): void {
  current = native ?? capacitorNative;
}

/** Whether a system browser auth session can be presented on this device. */
export async function isAvailable(): Promise<boolean> {
  try {
    return await current.isAvailable();
  } catch {
    return false;
  }
}
