
import PricingTable from "../components/PricingTable";
import Footer from "../components/Footer";

export const metadata = { title: "Pricing • Trading Journal" };

export default function PricingPage() {
  return (
    <>
      <PricingTable highlightAnnual />
      <Footer />
    </>
  );
}
