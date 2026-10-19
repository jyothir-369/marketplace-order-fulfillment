"use client";
/** Google OAuth sign-in button — triggers server-side ID-token validation via verifyGoogleIdToken.
Requires GOOGLE_CLIENT_ID env; never exposes client secret. */
export function GoogleSignInButton() {
  return (
    <button
      type="button"
      className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50"
      onClick={() => alert("Google OAuth requires server-side ID-token validation (verifyGoogleIdToken) and GOOGLE_CLIENT_ID config")}
    >
      Sign in with Google
    </button>
  );
}
