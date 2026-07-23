import { NextResponse } from "next/server";
import { isGoogleOAuthConfigured, getGoogleAuthStatus } from "@/lib/googleConfig";
import { isXOAuthConfigured, getXAppStatus } from "@/lib/xConfig";

export async function GET() {
  const x = getXAppStatus();
  const google = getGoogleAuthStatus();

  return NextResponse.json({
    x: {
      available: isXOAuthConfigured(),
      loginPath: "/api/auth/x/oauth",
      redirectUri: x.loginRedirectUri,
    },
    google: {
      available: isGoogleOAuthConfigured(),
      loginPath: "/api/auth/google/oauth",
      redirectUri: google.redirectUri,
    },
  });
}
