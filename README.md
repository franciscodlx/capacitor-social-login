# capacitor-social-login

<p align="center">
  <img src=".github/assets/demo.gif" width="280" alt="Demo en Android: iniciar sesión con GitHub y X">
</p>

<p align="center">

[![npm](https://img.shields.io/npm/v/@franciscodlxdev/capacitor-auth-core?label=npm&color=cb3837)](https://www.npmjs.com/package/@franciscodlxdev/capacitor-auth-core) [![CI](https://github.com/franciscodlx/capacitor-social-login/actions/workflows/ci.yml/badge.svg)](https://github.com/franciscodlx/capacitor-social-login/actions/workflows/ci.yml) [![Licencia MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)

</p>

**Agrega "Iniciar sesión con GitHub, X, LinkedIn, TikTok…" a tu app de Capacitor e Ionic con una sola API: navegador del sistema, PKCE y cero secrets en la app.**

Sin WebView: el usuario inicia sesión en `ASWebAuthenticationSession` (iOS) o Custom Tabs (Android), con las cookies y gestores de contraseñas que ya usa. El `client_secret` se queda en tu backend, y los errores llegan normalizados (`CANCELLED`, `NETWORK`, `PROVIDER_ERROR`…) sin importar el proveedor.

## Instalación

```sh
npm i @franciscodlxdev/capacitor-x-login @franciscodlxdev/capacitor-auth-core
npx cap sync
```

En Android declara el esquema de tu app en el `AndroidManifest.xml` y activa `CapacitorHttp`; son dos bloques que puedes copiar de [`capacitor-auth-core`](packages/auth-core#instalación). Funciona con Angular, React, Vue o sin framework.

## Ejemplo mínimo

```ts
import { xLogin } from '@franciscodlxdev/capacitor-x-login';

const { profile } = await xLogin.signIn({
  clientId: 'TU_CLIENT_ID',        // portal de X → OAuth 2.0, app tipo "Native App"
  redirectUri: 'miapp://callback', // regístrala tal cual en X
  exchangeCode: true,              // cliente público: el canje se hace en el dispositivo con PKCE
});

console.log(`Hola, @${profile?.username}`);
```

X es un cliente público, así que este ejemplo no necesita backend. LinkedIn, GitHub, TikTok y los demás devuelven un `code` que tu backend canjea con el secret; cada paquete trae el canje listo en Node y Laravel. Detalles de X en [`packages/x-login`](packages/x-login).

<sub>El GIF: App `examples/demo` (Ionic + Angular) en el emulador de Android contra el proveedor local (`tools/mock-idp`). Probado también con cuentas reales de LinkedIn, X, GitHub, Discord, Telegram y TikTok en iPhone.</sub>

## Paquetes

| Paquete                                                                  | Qué hace                                                           | Estado             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------ |
| [`@franciscodlxdev/capacitor-auth-core`](packages/auth-core)              | PKCE, `state`/`nonce`, navegador del sistema, errores normalizados | Probado en iPhone y Android |
| [`@franciscodlxdev/capacitor-linkedin-login`](packages/linkedin-login)    | LinkedIn con OpenID Connect                                        | Probado con mock   |
| [`@franciscodlxdev/capacitor-x-login`](packages/x-login)                  | X con OAuth 2.0 + PKCE                                             | Probado con X |
| [`@franciscodlxdev/capacitor-mercadolibre-login`](packages/mercadolibre-login) | Mercado Libre con selector de país                            | Probado con mock   |
| [`@franciscodlxdev/capacitor-twitch-login`](packages/twitch-login)        | Twitch con OIDC                                                    | Probado con mock   |
| [`@franciscodlxdev/capacitor-oauth-presets`](packages/oauth-presets)      | GitHub, Discord, Slack y Strava                                    | Probado con GitHub, Discord |
| [`@franciscodlxdev/capacitor-telegram-login`](packages/telegram-login)    | Telegram con OpenID Connect                                        | Probado con Telegram |
| [`@franciscodlxdev/capacitor-tiktok-login`](packages/tiktok-login)        | TikTok Login Kit (flujo web)                                       | Probado con TikTok (sandbox) |
| [`@franciscodlxdev/capacitor-entra-native-auth`](packages/entra-native-auth) | Entra External ID: alta, login y reset sin navegador            | Probado con mock   |

"Probado con mock": iOS (simulador) y Android (emulador) contra `tools/mock-idp` y los backends de `tools/`. "Probado con <proveedor>": además, con una cuenta real en iPhone.

Cada proveedor es un paquete independiente (versión, changelog y publicación propios) que solo aporta endpoints, scopes y mapeo de perfil; el flujo y la seguridad viven en el núcleo. Los paquetes no dependen de Angular: funcionan igual con React, Vue o sin framework.

## Estructura

```
packages/auth-core          núcleo (plugin de Capacitor: Swift + Kotlin + web)
packages/<proveedor>        un paquete TypeScript por proveedor sobre el núcleo
examples/demo               app Ionic + Angular con todos los proveedores
tools/mock-idp              proveedor OAuth/OIDC local, sin credenciales reales
tools/mock-entra            imita la API de native authentication de Entra
tools/<proveedor>-backend   backends de ejemplo: redirect https y canje con el secret
```

## Desarrollo

Requiere Node 24, pnpm 12, Xcode y Android SDK con JDK 21.

```sh
pnpm install
pnpm test          # pruebas unitarias (vitest)
pnpm typecheck
pnpm lint
pnpm build
```

Probar el flujo completo, sin cuenta en ningún proveedor: ver [CONTRIBUTING.md](CONTRIBUTING.md). Vulnerabilidades: [SECURITY.md](SECURITY.md).

## La familia

La misma API, los mismos proveedores y los mismos códigos de error en cada plataforma:

| Plataforma | Repositorio |
| ---------- | ----------- |
| React Native (y Expo) | [rn-social-login](https://github.com/franciscodlx/rn-social-login) |
| Flutter | [flutter_social_login](https://github.com/franciscodlx/flutter_social_login) |
| Capacitor / Ionic | **este repo** |
| NativeScript | [nativescript-social-login](https://github.com/franciscodlx/nativescript-social-login) |
| NativePHP Mobile | [nativephp-social-login](https://github.com/franciscodlx/nativephp-social-login) |

## Licencia

MIT
