import Link from "next/link";
import { type ReactNode } from "react";
import GlossyCard from "./GlossyCard";
import SideDrawer from "./SideDrawer";
import StarConstellation from "./StarConstellation";

interface NavPageLayoutProps {
  title: string;
  children: ReactNode;
}

export default function NavPageLayout({ title, children }: NavPageLayoutProps) {
  return (
    <div className="relative min-h-screen bg-black">
      <SideDrawer />

      <div className="pointer-events-none fixed inset-0 z-0">
        <StarConstellation />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
        <Link
          href="/"
          className="text-sm font-medium text-white/50 transition hover:text-white"
        >
          ← Back to home
        </Link>

        <GlossyCard className="mt-8">
          <h1 className="text-3xl font-semibold text-white">{title}</h1>
          <div className="mt-4 text-sm leading-7 text-white/50">{children}</div>
        </GlossyCard>
      </div>
    </div>
  );
}
