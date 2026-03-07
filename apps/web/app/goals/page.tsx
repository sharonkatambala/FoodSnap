import AppShell from "../../components/AppShell";
import GoalsView from "../../components/GoalsView";

export default function GoalsPage() {
  return (
    <AppShell
      title="Set calorie and macronutrient goals."
      subtitle="Define targets to keep your day on track."
      accent={"\u{1F3AF}"}
    >
      <GoalsView />
    </AppShell>
  );
}
