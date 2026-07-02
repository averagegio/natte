import AIParserToggle from "./components/AIParserToggle";

const samples = [
  "Hello everyone — excited to share my weekend photos!",
  "As an AI assistant, I can generate text that mimics human writing.",
  "Quick demo: this post was written by a human tester for the Proof of Human pilot.",
];

const features = [
  {
    title: "Fast detection",
    description: "Check sample posts instantly and see whether the content feels human or machine-made.",
  },
  {
    title: "Clear signals",
    description: "Understand how writing style, tone, and structure influence the AI detection result.",
  },
  {
    title: "Built for demos",
    description: "A lightweight proof-of-concept interface for exploring AI detection on short posts.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 font-sans text-slate-900 dark:bg-black dark:text-slate-100">
      <main className="w-full max-w-5xl px-6 py-16 sm:px-10">
        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white/95 p-10 shadow-lg shadow-zinc-200/50 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 dark:shadow-black/10">
          <div className="flex flex-col gap-6 text-center sm:text-left">
            <span className="inline-flex rounded-full bg-sky-100 px-4 py-1 text-sm font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">
              Proof of Human
            </span>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Detect whether text feels human or AI-generated.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Explore real-time AI detection on sample posts, with a clean interface for experimenting and sharing results.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {features.map((feature, index) => (
              <div key={feature.title} className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-6 text-center transition hover:-translate-y-1 hover:border-sky-400 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-500">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-lg font-semibold text-white">
                  {index + 1}
                </div>
                <h2 className="text-lg font-semibold">{feature.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 space-y-6">
          <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold">Try it with sample posts</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Toggle the AI detector on each example to see the result and learn how the model interprets each message.
              </p>
            </div>

            <div className="space-y-6">
              {samples.map((t, i) => (
                <div key={i} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="mb-3 text-sm text-slate-700 dark:text-slate-300">{t}</div>
                  <AIParserToggle text={t} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
