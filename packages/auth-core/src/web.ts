import { WebPlugin } from '@capacitor/core';
import type { AuthCorePlugin } from './definitions';

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const POLL_MS = 250;

/**
 * Browser fallback (`ionic serve`, PWAs): the sign-in runs in a popup and
 * the redirect must land on a page of this same origin, which is the only
 * way a page can read where the popup ended up.
 */
export class AuthCoreWeb extends WebPlugin implements AuthCorePlugin {
  private popup: Window | null = null;
  private finish: ((error?: { code: string; message: string }) => void) | null =
    null;

  async isAvailable(): Promise<{ available: boolean }> {
    return {
      available: typeof window !== 'undefined' && !!window.crypto?.subtle,
    };
  }

  async randomBase64Url(options: {
    byteLength: number;
  }): Promise<{ value: string }> {
    const bytes = new Uint8Array(
      Math.min(Math.max(options.byteLength, 1), 1024)
    );
    crypto.getRandomValues(bytes);
    return { value: base64Url(bytes) };
  }

  async sha256Base64Url(options: {
    input: string;
  }): Promise<{ value: string }> {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(options.input)
    );
    return { value: base64Url(new Uint8Array(digest)) };
  }

  openAuthSession(options: {
    url: string;
    redirectUri: string;
  }): Promise<{ url: string }> {
    let redirect: URL;
    try {
      redirect = new URL(options.redirectUri);
    } catch {
      return Promise.reject(
        this.error('INVALID_CONFIG', 'The redirect URI must be absolute')
      );
    }
    if (redirect.origin !== window.location.origin) {
      return Promise.reject(
        this.error(
          'NOT_SUPPORTED',
          `On the web the redirect URI must be a page of ${window.location.origin}`
        )
      );
    }
    if (this.popup) {
      return Promise.reject(
        this.error('INVALID_CONFIG', 'Another sign-in is already in progress')
      );
    }

    const popup = window.open(
      options.url,
      'franciscodlxdev-auth',
      'popup,width=520,height=720'
    );
    if (!popup) {
      return Promise.reject(
        this.error('NOT_SUPPORTED', 'The browser blocked the sign-in popup')
      );
    }
    this.popup = popup;

    return new Promise((resolve, reject) => {
      const timer = window.setInterval(() => {
        if (popup.closed) {
          done({ code: 'CANCELLED', message: 'The user closed the browser' });
          return;
        }
        let href: string;
        try {
          // Throws while the popup is on the provider's origin.
          href = popup.location.href;
        } catch {
          return;
        }
        const path = (value: string) => value.replace(/\/+$/, '');
        if (
          href.startsWith(redirect.origin) &&
          path(href.split(/[?#]/)[0] ?? '') ===
            path(redirect.origin + redirect.pathname)
        ) {
          done();
          resolve({ url: href });
        }
      }, POLL_MS);

      const done = (error?: { code: string; message: string }) => {
        window.clearInterval(timer);
        this.popup = null;
        this.finish = null;
        if (!popup.closed) {
          popup.close();
        }
        if (error) {
          reject(this.error(error.code, error.message));
        }
      };
      this.finish = done;
    });
  }

  async cancelAuthSession(): Promise<void> {
    this.finish?.({ code: 'CANCELLED', message: 'The sign-in was cancelled' });
  }

  private error(code: string, message: string): Error & { code: string } {
    return Object.assign(new Error(message), { code });
  }
}
