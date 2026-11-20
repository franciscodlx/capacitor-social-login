# capacitor-social-login

Plugins de login social para Capacitor e Ionic con un núcleo compartido: OAuth 2.0 + PKCE en el navegador del sistema, sin `clientSecret` en la app y con la misma API en todos los proveedores. Es la versión para Capacitor de [rn-social-login](https://github.com/franciscodlx/rn-social-login) y [flutter_social_login](https://github.com/franciscodlx/flutter_social_login).

```ts
const { code, codeVerifier } = await linkedInLogin.signIn({ clientId, redirectUri });
```

## Paquetes

| Paquete                                                                  | Qué hace                                                           | Estado             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------ |
| [`@franciscodlxdev/capacitor-auth-core`](packages/auth-core)              | PKCE, `state`/`nonce`, navegador del sistema, errores normalizados | Probado con mock   |
| [`@franciscodlxdev/capacitor-linkedin-login`](packages/linkedin-login)    | LinkedIn con OpenID Connect                                        | Probado con mock   |
| [`@franciscodlxdev/capacitor-x-login`](packages/x-login)                  | X con OAuth 2.0 + PKCE                                             | Probado con mock   |
| [`@franciscodlxdev/capacitor-mercadolibre-login`](packages/mercadolibre-login) | Mercado Libre con selector de país                            | Probado con mock   |
| [`@franciscodlxdev/capacitor-twitch-login`](packages/twitch-login)        | Twitch con OIDC                                                    | Probado con mock   |
| [`@franciscodlxdev/capacitor-oauth-presets`](packages/oauth-presets)      | GitHub, Discord, Slack y Strava                                    | Probado con mock   |
| [`@franciscodlxdev/capacitor-telegram-login`](packages/telegram-login)    | Telegram con OpenID Connect                                        | Probado con mock   |
| [`@franciscodlxdev/capacitor-tiktok-login`](packages/tiktok-login)        | TikTok Login Kit (flujo web)                                       | Probado con mock   |
| [`@franciscodlxdev/capacitor-entra-native-auth`](packages/entra-native-auth) | Entra External ID: alta, login y reset sin navegador            | Probado con mock   |

"Probado con mock": iOS (simulador) contra `tools/mock-idp` y los backends de `tools/`. El flujo es el mismo que ya se probó con cuentas reales en React Native y Flutter.

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

## Licencia

MIT
