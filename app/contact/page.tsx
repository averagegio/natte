import NavPageLayout from "../components/NavPageLayout";

export default function ContactPage() {
  return (
    <NavPageLayout title="Contact">
      <p>
        Reach out at{" "}
        <a
          href="mailto:hello@proofofhuman.ai"
          className="text-sky-400 transition hover:text-sky-300"
        >
          hello@proofofhuman.ai
        </a>{" "}
        for partnerships and support.
      </p>
    </NavPageLayout>
  );
}
