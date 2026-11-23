# @franciscodlxdev/capacitor-auth-core

<p align="center"><img src="https://raw.githubusercontent.com/franciscodlx/capacitor-social-login/main/.github/assets/demo.gif" width="260" alt="Demo: iniciar sesión en el navegador del sistema y volver a la app"></p>

OAuth 2.0 + PKCE para Capacitor e Ionic (iOS, Android) en el navegador del sistema: `ASWebAuthenticationSession` en iOS y Custom Tabs en Android. Sin WebView y sin `clientSecret` en la app. Es el núcleo de la familia: cada proveedor (LinkedIn, X, GitHub, …) es un paquete aparte que solo aporta endpoints, scopes y el mapeo del perfil.

## Compatibilidad

| Paquete | Capacitor   | Framework web                                | iOS    | Android        | Web                          |
| ------- | ----------- | -------------------------------------------- | ------ | -------------- | ---------------------------- |
| 0.1.x   | 8 (probado) | Angular (probado), React, Vue, sin framework | ≥ 15.0 | ≥ 7.0 (API 24) | Popup, redirect al mismo origen |

## Instalación

```sh
npm i @franciscodlxdev/capacitor-auth-core
npx cap sync
```

**iOS**: nada más. `ASWebAuthenticationSession` recibe el redirect `miapp://…` sin registrar el esquema en `Info.plist`. Funciona con Swift Package Manager (por defecto en Capacitor 8) y con CocoaPods.

**Android**: declara qué esquemas llegan a la actividad de redirect, en `android/app/src/main/AndroidManifest.xml`, dentro de `<application>`:

```xml
<activity
    android:name="dev.franciscodlx.capauthcore.AuthRedirectActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="miapp" />
    </intent-filter>
</activity>
```

Puedes listar varios `<data android:scheme="…"/>`, o agregar otro `intent-filter` para un App Link https. Si falta, `signIn` falla de inmediato con `INVALID_CONFIG` en lugar de dejar el navegador abierto sin regreso.

**`fetch` nativo**: el canje en el dispositivo (`exchangeCode: true`) y las llamadas a tu backend salen del WebView, cuyo origen (`capacitor://localhost`, `https://localhost`) casi ningún proveedor acepta por CORS. Activa el HTTP nativo de Capacitor en `capacitor.config.ts`:

```ts
plugins: {
  CapacitorHttp: { enabled: true },
},
```

## Configurar el proveedor

1. Crea la app en el portal del proveedor como cliente **público / nativo** (sin secret).
2. Registra el redirect URI: `miapp://callback`, o un Universal Link / App Link.
3. Anota el `clientId` y los scopes.

## Uso

```ts
import { createProviderLogin } from '@franciscodlxdev/capacitor-auth-core';

const login = createProviderLogin({
  id: 'mi-idp',
  authorizationEndpoint: 'https://idp.example.com/authorize',
  tokenEndpoint: 'https://idp.example.com/token', // solo si el proveedor admite clientes públicos
  userInfoEndpoint: 'https://idp.example.com/userinfo',
  issuer: 'https://idp.example.com',
  defaultScopes: ['openid', 'profile', 'email'],
  useNonce: true,
});

const { code, codeVerifier, nonce, redirectUri } = await login.signIn({
  clientId: 'TU_CLIENT_ID',
  redirectUri: 'miapp://callback',
});
// Envía code + codeVerifier + redirectUri a tu backend.
```

Con Angular, envuélvelo en un servicio o en un `signal`; con React o Vue, en tu propio estado. El paquete no depende de ningún framework.

### API

| Función                                                              | Devuelve                                                                                                                                                           |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `signIn(options)`                                                    | `{ code, codeVerifier, state, nonce?, redirectUri, params }`; con `exchangeCode: true` agrega `accessToken`, `refreshToken`, `idToken`, `idTokenClaims`, `profile` |
| `signOut({ clientId, token })`                                       | Revoca el token si el proveedor tiene endpoint de revocación                                                                                                       |
| `isAvailable()`                                                      | `Promise<boolean>`: si se puede abrir el navegador del sistema                                                                                                     |
| `authorize(request)` / `cancelAuthorize()`                           | El flujo sin proveedor predefinido / cerrar el navegador abierto                                                                                                   |
| `exchangeCode`, `refreshAccessToken`, `revokeToken`, `fetchUserInfo` | Llamadas de cliente público al proveedor                                                                                                                           |
| `decodeIdToken`, `validateIdTokenClaims`                             | Claims del `id_token` y revisión de `iss`, `aud`, `exp`, `nonce`                                                                                                   |
| `createPkcePair()`, `randomString()`                                 | PKCE S256 y aleatorios del CSPRNG nativo (asíncronos)                                                                                                              |

Opciones de `signIn`: `clientId`, `redirectUri`, `callbackUri`, `scopes`, `extraParams`, `prefersEphemeralSession` (no comparte cookies con el navegador; en iOS además evita el aviso de confirmación), `exchangeCode`.

### Proveedores que solo aceptan redirect https

Si el proveedor no admite `miapp://…`, registra una URL https de tu backend como `redirectUri` y haz que reenvíe la query a tu app; `callbackUri` es la URL donde la app espera:

```ts
login.signIn({
  clientId,
  redirectUri: 'https://api.miapp.com/auth/callback', // lo ve el proveedor
  callbackUri: 'miapp://callback', // lo recibe la app
});
```

### Web (`ionic serve`, PWA)

En el navegador el inicio de sesión abre un popup y el `redirectUri` (o `callbackUri`) debe ser una página de tu mismo origen, por ejemplo `http://localhost:8100/auth/callback`: es la única forma de que la página lea a dónde volvió el popup.

## Backend (canje del código)

Si el proveedor exige `client_secret`, el canje va en tu servidor. Node/Express:

```js
app.post('/auth/exchange', async (req, res) => {
  const { code, codeVerifier, redirectUri } = req.body;
  const r = await fetch('https://idp.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    }),
  });
  res.status(r.status).json(await r.json());
});
```

## Errores normalizados

Todo falla con un `AuthError` cuyo `code` es uno de:

| Código           | Cuándo                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `CANCELLED`      | El usuario cerró el navegador o rechazó el permiso (`access_denied`)                           |
| `NETWORK`        | No se pudo contactar al proveedor                                                              |
| `INVALID_CONFIG` | Falta `clientId` / `redirectUri`, endpoint sin https, esquema sin `intent-filter` o login abierto |
| `PROVIDER_ERROR` | El proveedor devolvió un error, el `state` no coincide o el `id_token` no es válido            |
| `NOT_SUPPORTED`  | Sin navegador, popup bloqueado en web, o redirect https en iOS < 17.4                          |

`error.providerError` y `error.providerErrorDescription` traen lo que respondió el proveedor.

## Seguridad

- No hay `clientSecret` en la app: PKCE (S256) liga el código al dispositivo que lo pidió.
- `state` y `nonce` salen del CSPRNG nativo; un redirect con otro `state` se rechaza.
- En Android solo se acepta el redirect del inicio de sesión en curso (mismo esquema, host y ruta).
- El `id_token` se decodifica **sin verificar la firma**; verifícala en tu backend.
- La librería no guarda tokens. Usa Keychain / Keystore (p. ej. un plugin de almacenamiento seguro).
- http solo se acepta hacia `localhost`, `127.0.0.1` y `10.0.2.2`, para el servidor de pruebas.

Más en [SECURITY.md](../../SECURITY.md).

## Probar sin credenciales

`examples/demo` (Ionic + Angular) corre todos los proveedores contra `tools/mock-idp`, un proveedor OIDC local. Ver [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Licencia

MIT
