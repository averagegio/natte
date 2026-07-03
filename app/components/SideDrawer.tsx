"use client";

import { useEffect, useState } from "react";

const navItems = [
  { label: "Feature Demo", href: "#feature-demo" },
  { label: "Pricing", href: "#pricing" },
  { label: "Sign Up / Login", href: "#signup" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export default function SideDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-6 right-6 z-50 flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full border border-white/10 bg-black/60 backdrop-blur-md transition hover:border-white/25 hover:bg-black/80"
        aria-label="Open navigation menu"
      >
        <span className="block h-0.5 w-5 rounded-full bg-white" />
        <span className="block h-0.5 w-5 rounded-full bg-white" />
        <span className="block h-0.5 w-5 rounded-full bg-white" />
      </button>

      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={close}
          aria-label="Close navigation menu"
        />

        <nav
          className={`absolute top-0 right-0 flex h-full w-72 max-w-[85vw] flex-col border-l border-white/10 bg-zinc-950/95 backdrop-blur-xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <span className="text-sm font-semibold tracking-widest text-white/60 uppercase">
              Menu
            </span>
            <button
              type="button"
              onClick={close}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M2 2L16 16M16 2L2 16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <ul className="flex flex-1 flex-col gap-1 px-4 py-6">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={close}
                  className="block rounded-xl px-4 py-3.5 text-base font-medium text-white/80 transition hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="border-t border-white/10 px-6 py-5">
            <p className="text-xs text-white/40">Proof of Human</p>
          </div>
        </nav>
      </div>
    </>
  );
}
