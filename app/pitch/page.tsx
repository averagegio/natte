import type { Metadata } from "next";
import PitchDeckSlideshow from "../components/PitchDeckSlideshow";
import { getPitchDeck } from "@/lib/pitchDeck";

export const metadata: Metadata = {
  title: "Pitch deck — Proof of Human API",
  description:
    "Slideshow pitch deck for the NATTES AI detection API. Also available as JSON at /api/pitch.",
};

export default function PitchPage() {
  const deck = getPitchDeck();

  return <PitchDeckSlideshow deck={deck} />;
}
