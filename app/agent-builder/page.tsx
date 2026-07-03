import AgentBuilderDemo from "../components/AgentBuilderDemo";

export const metadata = {
  title: "Agent Builder — Feature Demo",
  description: "X-style feature demo for Agent Builder voice agents",
};

export default function AgentBuilderPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-16">
      <div className="mb-10 text-center">
        <span className="mb-4 inline-flex rounded-full border border-white/20 bg-white/5 px-5 py-1.5 text-xs font-semibold tracking-[0.2em] text-white/70 uppercase backdrop-blur-sm">
          Feature Demo
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Agent Builder
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/50">
          Build voice agents for sales, dispatch, and support — in minutes.
        </p>
      </div>

      <AgentBuilderDemo />
    </div>
  );
}
