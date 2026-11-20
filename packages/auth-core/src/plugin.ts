import { registerPlugin } from '@capacitor/core';
import type { AuthCorePlugin } from './definitions';

export const AuthCore = registerPlugin<AuthCorePlugin>('AuthCore', {
  web: () => import('./web').then((m) => new m.AuthCoreWeb()),
});
