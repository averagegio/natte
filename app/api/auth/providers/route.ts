import { NextResponse } from "next/server";
import { isXOAuthConfigured, getXAppStatus } from "@/lib/xConfig";

export async function GET() {
  const x = getXAppStatus();

  return NextResponse.json({
    x: {
      available: isXOAuthConfigured(),
      loginPath: "/api/auth/x/oauth",
      redirectUri: x.loginRedirectUri,
    },
  });
}
