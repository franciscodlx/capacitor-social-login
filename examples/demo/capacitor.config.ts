import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.franciscodlx.socialauth.capdemo',
  appName: 'Social Login Demo',
  webDir: 'www',
  plugins: {
    // fetch() goes through native HTTP: the backends and token endpoints do
    // not send CORS headers for the WebView's origin.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
