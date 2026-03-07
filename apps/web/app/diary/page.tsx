import AppShell from "../../components/AppShell";
import DiaryView from "../../components/DiaryView";

export default function DiaryPage() {
  return (
    <AppShell
      title="Create a visual food diary."
      subtitle="Log meals, add photos, and export shareable cards."
      accent={"\u{1F35C}"}
    >
      <DiaryView />
    </AppShell>
  );
}
