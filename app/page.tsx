import Image from "next/image";
import AIParserToggle from "./components/AIParserToggle";

const samples = [
  "Hello everyone — excited to share my weekend photos!",
  "As an AI assistant, I can generate text that mimics human writing.",
  "Quick demo: this post was written by a human tester for the Proof of Human pilot.",
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-20 px-6 bg-white dark:bg-black sm:items-start gap-8">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="text-2xl font-semibold">Proof of Human — X Pilot</h1>
          <p className="text-zinc-600">Toggle AI detection for sample posts below.</p>
        </div>

        <div className="w-full space-y-6">
          {samples.map((t, i) => (
            <div key={i} className="rounded-md border p-4">
              <div className="mb-3 text-sm text-zinc-700">{t}</div>
              <AIParserToggle text={t} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
