import { NextResponse } from "next/server";
import { getPitchDeck } from "@/lib/pitchDeck";

export const dynamic = "force-static";

export async function GET() {
  const deck = getPitchDeck();

  return NextResponse.json({
    ok: true,
    deck,
    meta: {
      slideCount: deck.slides.length,
      endpoints: {
        text: "/api/detect",
        image: "/api/detect/image",
        pitch: "/api/pitch",
        chromeExtension: "/extension/natte-chrome.zip",
      },
    },
  });
}
