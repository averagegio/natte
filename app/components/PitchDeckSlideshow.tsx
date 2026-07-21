"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PitchDeck, PitchSlide } from "@/lib/pitchDeck";

type PitchDeckSlideshowProps = {
  deck: PitchDeck;
};

export default function PitchDeckSlideshow({ deck }: PitchDeckSlideshowProps) {
  const [index, setIndex] = useState(0);
  const [entering, setEntering] = useState(true);
  const slides = deck.slides;
  const slide = slides[index];
  const isFirst = index === 0;
  const isLast = index === slides.length - 1;

  function goTo(next: number) {
    if (next < 0 || next >= slides.length || next === index) return;
    setEntering(false);
    window.setTimeout(() => {
      setIndex(next);
      setEntering(true);
    }, 160);
  }

  function next() {
    goTo(index + 1);
  }

  function prev() {
    goTo(index - 1);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const move = (getNext: (current: number) => number) => {
        event.preventDefault();
        setEntering(false);
        window.setTimeout(() => {
          setIndex((current) => getNext(current));
          setEntering(true);
        }, 160);
      };

      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        move((current) => Math.min(current + 1, slides.length - 1));
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        move((current) => Math.max(current - 1, 0));
      } else if (event.key === "Home") {
        move(() => 0);
      } else if (event.key === "End") {
        move(() => slides.length - 1);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length]);

  return (
    <div className="pitch-deck relative flex min-h-screen flex-col overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="pitch-atmosphere absolute inset-0" />
        <div className="pitch-grid absolute inset-0 opacity-[0.18]" />
      </div>

      <header className="relative z-20 flex items-center justify-between px-6 pt-6 sm:px-10">
        <Link
          href="/"
          className="text-sm font-medium text-white/45 transition hover:text-white"
        >
          ← Home
        </Link>
        <div className="flex items-center gap-3 text-xs tracking-[0.18em] text-white/40 uppercase">
          <span>{deck.brand}</span>
          <span className="h-1 w-1 rounded-full bg-sky-400/70" />
          <span>
            {index + 1} / {slides.length}
          </span>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center px-6 py-10 sm:px-10 lg:px-16">
        <article
          key={slide.id}
          className={`pitch-slide mx-auto w-full max-w-5xl ${
            entering ? "pitch-slide-enter" : "pitch-slide-exit"
          }`}
          aria-live="polite"
        >
          <SlideContent slide={slide} brand={deck.brand} isTitle={isFirst} />
        </article>
      </main>

      <footer className="relative z-20 flex flex-col gap-5 px-6 pb-8 sm:px-10">
        <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Slides">
          {slides.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to slide ${i + 1}: ${item.title}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-8 bg-sky-400"
                  : "w-2.5 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={prev}
            disabled={isFirst}
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 transition enabled:hover:border-white/35 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            Previous
          </button>

          <p className="hidden text-xs text-white/35 sm:block">
            Arrow keys or space to advance
          </p>

          {isLast ? (
            <Link
              href={slide.cta?.href ?? "/pricing"}
              className="rounded-full border border-sky-400/40 bg-sky-500/15 px-5 py-2.5 text-sm font-medium text-sky-200 transition hover:border-sky-300/60 hover:bg-sky-500/25"
            >
              {slide.cta?.label ?? "Continue"}
            </Link>
          ) : (
            <button
              type="button"
              onClick={next}
              className="rounded-full border border-sky-400/40 bg-sky-500/15 px-5 py-2.5 text-sm font-medium text-sky-200 transition hover:border-sky-300/60 hover:bg-sky-500/25"
            >
              Next
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function SlideContent({
  slide,
  brand,
  isTitle,
}: {
  slide: PitchSlide;
  brand: string;
  isTitle: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-semibold tracking-[0.22em] text-sky-300/90 uppercase">
        {isTitle ? brand : slide.eyebrow}
      </p>

      <h1
        className={`max-w-4xl font-semibold tracking-tight text-white ${
          isTitle
            ? "text-5xl sm:text-7xl lg:text-8xl"
            : "text-4xl sm:text-5xl lg:text-6xl"
        }`}
      >
        {slide.title}
      </h1>

      <p className="max-w-2xl text-base leading-8 text-white/55 sm:text-lg sm:leading-8">
        {slide.body}
      </p>

      {slide.detail ? (
        <p className="text-sm tracking-wide text-white/35">{slide.detail}</p>
      ) : null}

      {slide.code ? (
        <pre className="pitch-code mt-2 max-w-2xl overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left text-sm leading-7 text-sky-100/90">
          <code>{slide.code}</code>
        </pre>
      ) : null}

      {slide.cta && !isTitle && slide.id === "close" ? (
        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href={slide.cta.href}
            className="inline-flex rounded-full border border-sky-400/40 bg-sky-500/15 px-6 py-3 text-sm font-medium text-sky-100 transition hover:bg-sky-500/25"
          >
            {slide.cta.label}
          </Link>
          <Link
            href="/api/pitch"
            className="inline-flex rounded-full border border-white/15 px-6 py-3 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Open JSON API
          </Link>
        </div>
      ) : null}
    </div>
  );
}
