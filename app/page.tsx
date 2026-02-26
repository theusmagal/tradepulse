import HeroPro from "./components/HeroPro";
import TrustRow from "./components/TrustRow";
import Features from "./components/Features";
import FeatureRow from "./components/FeatureRow";
import PricingTable from "./components/PricingTable";
import Testimonials from "./components/Testimonials";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";
import CTABand from "./components/CTABand";

export default function Home() {
  return (
    <div className="bg-transparent text-inherit">
      <HeroPro />
      <TrustRow />

      <div id="features" />
      <Features />

      <FeatureRow
        title="PnL Calendar"
        desc="See your month in seconds: daily PnL and trade count in one simple view. Spot overtrading and streaks instantly."
        bullet={[
          "Color-coded days",
          "Trade count per day",
          "Fast patterns and discipline checks",
        ]}
        imageSrc="/marketing/calendario.png"
      />

      <FeatureRow
        reverse
        title="Journal (Daily Notes)"
        desc="Write quick notes per day: what you saw, what you felt, and what you’ll do next time. Build consistency with proof."
        bullet={[
          "Entries by date",
          "Search past notes instantly",
          "Turn emotions into rules",
        ]}
        imageSrc="/marketing/journal.png"
      />

      <FeatureRow
        title="Performance KPIs"
        desc="Win rate, profit factor, average R, and equity curve—calculated automatically from your imported trades."
        bullet={[
          "Custom date ranges",
          "Instrument grouping",
          "Clean KPI dashboard",
        ]}
        imageSrc="/marketing/KPI.png"
      />

      <PricingTable />
      <Testimonials />
      <FAQ />
      <CTABand />
      <Footer />
    </div>
  );
}