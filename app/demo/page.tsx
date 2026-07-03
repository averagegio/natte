import NatteFeatureDemo from "../components/NatteFeatureDemo";

export const metadata = {
  title: "n.a.t.t.e. — Feature Demo",
  description:
    "X-style feature demo for n.a.t.t.e., the normative AI Turing test that eliminates slop",
};

export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-16">
      <div className="mb-10 text-center">
        <span className="mb-4 inline-flex rounded-full border border-white/20 bg-white/5 px-5 py-1.5 text-xs font-semibold tracking-[0.2em] text-white/70 uppercase backdrop-blur-sm">
          Feature Demo
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">n.a.t.t.e.</h1>
        <p className="mt-3 max-w-md text-sm text-white/50">
          Normative AI Turing Test that Eliminates slop — real-time detection on X.
        </p>
      </div>

      <NatteFeatureDemo />
    </div>
  );
}
