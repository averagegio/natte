import NavPageLayout from "../components/NavPageLayout";
import AuthForm from "../components/AuthForm";

export default function SignupPage() {
  return (
    <NavPageLayout title="Sign Up / Login">
      <p className="mb-6">
        Sign up or log in with X, Google, or email to access Proof of Human, manage
        subscriptions, and use the NATTES detection API.
      </p>
      <AuthForm />
    </NavPageLayout>
  );
}
