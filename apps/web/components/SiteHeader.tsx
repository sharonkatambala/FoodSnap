import Link from "next/link";

type SiteHeaderProps = {
  className?: string;
};

const navItems = [
  { href: "/", label: "Camera" },
  { href: "/diary", label: "Saved" },
  { href: "/stats", label: "Summary" },
  { href: "/goals", label: "Goals" },
  { href: "/nutridex", label: "Nutridex" }
];

export default function SiteHeader({ className }: SiteHeaderProps) {
  return (
    <div
      className={`hidden items-center justify-between gap-6 rounded-[32px] border border-emerald-100 bg-white/80 px-6 py-4 shadow-[0_20px_40px_rgba(15,23,42,0.08)] backdrop-blur lg:flex ${
        className ?? ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-2xl text-white shadow">
          {"\u{1F353}"}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Lishe AI</p>
          <p className="text-xs text-slate-500">Track meals, goals, and your Nutridex.</p>
        </div>
      </div>
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:border-emerald-200 hover:text-emerald-700"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
