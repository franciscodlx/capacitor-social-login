import AuthenticationServices
import Capacitor
import CryptoKit
import Foundation
import Security
import UIKit

/// System browser sign-in for the TypeScript core: ASWebAuthenticationSession
/// plus the CSPRNG and SHA-256 that PKCE needs.
@objc(AuthCorePlugin)
public class AuthCorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AuthCorePlugin"
    public let jsName = "AuthCore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "randomBase64Url", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sha256Base64Url", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openAuthSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAuthSession", returnType: CAPPluginReturnPromise)
    ]

    private var session: ASWebAuthenticationSession?
    private let anchorProvider = PresentationAnchorProvider()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": true])
    }

    @objc func randomBase64Url(_ call: CAPPluginCall) {
        let length = min(max(call.getInt("byteLength") ?? 32, 1), 1024)
        var bytes = [UInt8](repeating: 0, count: length)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            call.reject("Could not generate random bytes", "NOT_SUPPORTED")
            return
        }
        call.resolve(["value": Self.base64Url(Data(bytes))])
    }

    @objc func sha256Base64Url(_ call: CAPPluginCall) {
        let input = call.getString("input") ?? ""
        call.resolve(["value": Self.base64Url(Data(SHA256.hash(data: Data(input.utf8))))])
    }

    @objc func openAuthSession(_ call: CAPPluginCall) {
        // The TypeScript layer already restricts plain http to loopback hosts.
        guard let url = call.getString("url"), let authURL = URL(string: url),
              ["https", "http"].contains(authURL.scheme ?? ""),
              let redirectUri = call.getString("redirectUri"),
              let redirect = URLComponents(string: redirectUri),
              let scheme = redirect.scheme?.lowercased(), !scheme.isEmpty
        else {
            call.reject("The authorization URL must be http(s) and the redirect URI absolute", "INVALID_CONFIG")
            return
        }
        let ephemeral = call.getBool("prefersEphemeralSession") ?? false

        DispatchQueue.main.async {
            if self.session != nil {
                call.reject("Another sign-in is already in progress", "INVALID_CONFIG")
                return
            }

            let completion: ASWebAuthenticationSession.CompletionHandler = { callbackURL, error in
                // Clearing the session also breaks the session → handler → self cycle.
                self.session = nil
                if let callbackURL {
                    call.resolve(["url": callbackURL.absoluteString])
                    return
                }
                let nsError = error as NSError?
                if nsError?.domain == ASWebAuthenticationSessionErrorDomain,
                   nsError?.code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                    call.reject("The user closed the browser", "CANCELLED")
                } else if nsError?.domain == ASWebAuthenticationSessionErrorDomain {
                    call.reject(nsError?.localizedDescription ?? "The sign-in could not be presented", "NOT_SUPPORTED")
                } else {
                    call.reject(nsError?.localizedDescription ?? "The sign-in failed", "PROVIDER_ERROR")
                }
            }

            let session: ASWebAuthenticationSession
            if scheme == "https" {
                // Universal Link redirect: only ASWebAuthenticationSession can
                // intercept it, starting with iOS 17.4.
                guard #available(iOS 17.4, *), let host = redirect.host else {
                    call.reject("https redirect URIs need iOS 17.4 or later; use a custom scheme", "NOT_SUPPORTED")
                    return
                }
                session = ASWebAuthenticationSession(
                    url: authURL,
                    callback: .https(host: host, path: redirect.path.isEmpty ? "/" : redirect.path),
                    completionHandler: completion
                )
            } else {
                session = ASWebAuthenticationSession(
                    url: authURL,
                    callbackURLScheme: scheme,
                    completionHandler: completion
                )
            }

            session.presentationContextProvider = self.anchorProvider
            session.prefersEphemeralWebBrowserSession = ephemeral
            self.session = session
            if !session.start() {
                self.session = nil
                call.reject("The sign-in could not be presented", "NOT_SUPPORTED")
            }
        }
    }

    @objc func cancelAuthSession(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // The completion handler runs with `canceledLogin` and rejects the sign-in.
            self.session?.cancel()
            call.resolve()
        }
    }

    private static func base64Url(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

private final class PresentationAnchorProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let active = scenes.first { $0.activationState == .foregroundActive } ?? scenes.first
        if let window = active?.windows.first(where: { $0.isKeyWindow }) ?? active?.windows.first {
            return window
        }
        if let active {
            return ASPresentationAnchor(windowScene: active)
        }
        return ASPresentationAnchor()
    }
}
