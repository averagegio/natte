"use client";

import { type ReactNode } from "react";

interface GlossyCardProps {
  children: ReactNode;
  className?: string;
}

export default function GlossyCard({ children, className = "" }: GlossyCardProps) {
  return (
    <div className={`glossy-card group relative overflow-hidden rounded-[1.5rem] ${className}`}>
      <div className="glossy-card-inner relative z-10 rounded-[1.5rem] bg-black p-6">
        {children}
      </div>
      <div className="glossy-sheen pointer-events-none absolute inset-0 z-20 rounded-[1.5rem]" />
    </div>
  );
}
