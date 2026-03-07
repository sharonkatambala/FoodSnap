import AppShell from "../../components/AppShell";
import StatsView from "../../components/StatsView";

export default function StatsPage() {
  return (
    <AppShell
      title="See even more stats over time."
      subtitle="Daily totals, weekly calories, and meal trends in one place."
      accent={"\u{1F4CA}"}
    >
      <StatsView />
    </AppShell>
  );
}
