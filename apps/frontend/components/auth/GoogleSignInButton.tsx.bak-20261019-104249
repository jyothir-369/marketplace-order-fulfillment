"use client";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { googleSignIn } from "@/lib/api";
import { setTokens } from "@/lib/auth-token";

export function GoogleSignInButton({ portal = "customer" }: { portal?: "customer" | "vendor" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const missingConfig = !clientId || clientId.includes("your-client-id") || clientId.includes("replace") || clientId.trim() === "";

  async function handleCredentialResponse(credentialResponse: { credential?: string }) {
    if (!credentialResponse?.credential) {
      setError("Google sign-in failed: no credential returned");
      setLoading(false);
      return;
    }
    setCancelled(false);
    setLoading(true);
    setError(null);
    try {
      const destParam = portal === "vendor" ? "?portal=vendor" : "";
      const response = await googleSignIn({ idToken: credentialResponse.credential, portal: portal === "vendor" ? "vendor" : "customer" });
      setTokens(response.accessToken, response.refreshToken);
      window.location.href = portal === "vendor" ? "/vendor/products" + destParam : "/" + destParam;
    } catch (e) {
      const msg = (e as Error)?.message || "Google sign-in failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (missingConfig) {
    return (
      <div className="w-full rounded-lg border border-stone-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p>Google sign-in unavailable: NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing or using a placeholder value.</p>
        <p className="text-xs mt-1">Configure in Google Cloud Console and update <code>.env</code> (do not commit secrets).</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className={loading ? "opacity-60 pointer-events-none" : ""}>
        <GoogleLogin
          onSuccess={(credentialResponse: any) => {
            handleCredentialResponse(credentialResponse);
          }}
          onError={() => {
            setError("Google sign-in was cancelled or failed. Try again.");
            setCancelled(true);
            setLoading(false);
          }}
          useOneTap={false}
          theme="outline"
          size="large"
          text="signin_with"
          shape="rectangular"
          width="100%"
          locale="en"
        />
      </div>
      {loading && <p className="mt-2 text-xs text-[#6B7A90]">Signing in...</p>}
      {cancelled && !error && <p className="mt-2 text-xs text-[#6B7A90]">Cancelled — try again.</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
