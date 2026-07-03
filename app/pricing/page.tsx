import NavPageLayout from "../components/NavPageLayout";
import PricingCards from "../components/PricingCards";

export default function PricingPage() {
  return (
    <NavPageLayout title="Pricing" wide>
      <p className="mb-8">
        Flexible plans for individuals and teams. Save 20% with yearly billing.
        All plans include access to the NATTES detection engine and browser widget.
      </p>
      <PricingCards />
    </NavPageLayout>
  );
}
