"use client";

interface IntroSectionProps {
  onEnter: () => void;
}

export default function IntroSection({ onEnter }: IntroSectionProps) {
  return (
    <section className="intro-gradient relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <span className="mb-6 inline-flex rounded-full border border-white/20 bg-white/5 px-5 py-1.5 text-xs font-semibold tracking-[0.2em] text-white/70 uppercase backdrop-blur-sm">
          Proof of Human
        </span>
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-white sm:text-7xl">
          The slop
          <br />
          <span className="bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent">
            stops here.
          </span>
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-white/50">
          AI detection for the real world. Scroll to explore.
        </p>
        <button
          type="button"
          onClick={onEnter}
          className="mt-10 flex flex-col items-center gap-2 text-white/40 transition hover:text-white/70"
          aria-label="Scroll to main content"
        >
          <span className="text-xs tracking-widest uppercase">Enter</span>
          <svg
            className="animate-bounce"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 14L4 8h12L10 14z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}
