import NavPageLayout from "../components/NavPageLayout";
import AuthForm from "../components/AuthForm";

export default function SignupPage() {
  return (
    <NavPageLayout title="Sign Up / Login">
      <p className="mb-6">
        Create an account to access the full Proof of Human platform, manage subscriptions,
        and use the NATTES detection API.
      </p>
      <AuthForm />
    </NavPageLayout>
  );
}
