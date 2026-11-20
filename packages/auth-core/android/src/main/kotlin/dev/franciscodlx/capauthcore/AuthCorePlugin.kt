package dev.franciscodlx.capauthcore

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.security.MessageDigest
import java.security.SecureRandom

/**
 * System browser sign-in for the TypeScript core: Custom Tabs plus the
 * CSPRNG and SHA-256 that PKCE needs.
 */
@CapacitorPlugin(name = "AuthCore")
class AuthCorePlugin : Plugin() {
  private val secureRandom = SecureRandom()

  @PluginMethod
  fun isAvailable(call: PluginCall) {
    val probe = Intent(Intent.ACTION_VIEW, Uri.parse("https://example.com"))
      .addCategory(Intent.CATEGORY_BROWSABLE)
    call.resolve(JSObject().put("available", probe.resolveActivity(context.packageManager) != null))
  }

  @PluginMethod
  fun randomBase64Url(call: PluginCall) {
    val bytes = ByteArray((call.getInt("byteLength") ?: 32).coerceIn(1, 1024))
    secureRandom.nextBytes(bytes)
    call.resolve(JSObject().put("value", base64Url(bytes)))
  }

  @PluginMethod
  fun sha256Base64Url(call: PluginCall) {
    val input = call.getString("input") ?: ""
    val digest = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8))
    call.resolve(JSObject().put("value", base64Url(digest)))
  }

  @PluginMethod
  fun openAuthSession(call: PluginCall) {
    val url = call.getString("url")
    val redirectUri = call.getString("redirectUri")
    val authUri = url?.let(Uri::parse)
    val redirect = redirectUri?.let(Uri::parse)
    // The TypeScript layer already restricts plain http to loopback hosts.
    if (authUri == null || redirect == null || authUri.scheme !in listOf("https", "http") || redirect.scheme.isNullOrEmpty()) {
      call.reject("The authorization URL must be http(s) and the redirect URI absolute", AuthSession.INVALID_CONFIG)
      return
    }
    if (!handlesRedirect(redirect)) {
      // Without an intent-filter the browser would have nowhere to go back to.
      call.reject(
        "No intent-filter for \"${redirect.scheme}\": add one to AuthRedirectActivity in AndroidManifest.xml (see the README)",
        AuthSession.INVALID_CONFIG
      )
      return
    }

    val started = AuthSession.begin(redirect, object : AuthSession.Listener {
      override fun onRedirect(url: String) = call.resolve(JSObject().put("url", url))
      override fun onError(code: String, message: String) = call.reject(message, code)
    })
    if (!started) {
      call.reject("Another sign-in is already in progress", AuthSession.INVALID_CONFIG)
      return
    }

    try {
      val intent = AuthSessionActivity.startIntent(context, url, call.getBoolean("prefersEphemeralSession") ?: false)
      val current = activity
      if (current != null) {
        current.startActivity(intent)
      } else {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    } catch (e: Exception) {
      AuthSession.fail(AuthSession.NOT_SUPPORTED, e.message ?: "Could not start the sign-in")
    }
  }

  @PluginMethod
  fun cancelAuthSession(call: PluginCall) {
    if (AuthSession.isActive) {
      val intent = AuthSessionActivity.cancelIntent(context)
      val current = activity
      if (current != null) {
        current.startActivity(intent)
      } else {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }
    call.resolve()
  }

  /** Whether this app's AuthRedirectActivity receives [redirect]. */
  private fun handlesRedirect(redirect: Uri): Boolean {
    val intent = Intent(Intent.ACTION_VIEW, redirect)
      .addCategory(Intent.CATEGORY_BROWSABLE)
      .setPackage(context.packageName)
    @Suppress("DEPRECATION")
    val matches = context.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
    return matches.any { it.activityInfo.name == AuthRedirectActivity::class.java.name }
  }

  private fun base64Url(bytes: ByteArray): String =
    Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
}
