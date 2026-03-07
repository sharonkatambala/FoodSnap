import AppShell from "../../components/AppShell";
import NutridexView from "../../components/NutridexView";

export default function NutridexPage() {
  return (
    <AppShell
      title="Work towards completing the Nutridex."
      subtitle="Unlock foods as you log meals and explore new items."
      accent={"\u{1F4D5}"}
    >
      <NutridexView />
    </AppShell>
  );
}
