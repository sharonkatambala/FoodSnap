import SiteHeader from "./SiteHeader";
import MobileNav from "./MobileNav";

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  accent?: string;
};

export default function AppShell({ children, title, subtitle, accent }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-amber-50 to-rose-50 pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:py-12">
        <SiteHeader />

        {title && (
          <section className="mt-6 rounded-[36px] border border-emerald-100 bg-white/80 px-6 py-8 text-center shadow-[0_25px_55px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {accent && (
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-2xl text-white shadow">
                  {accent}
                </span>
              )}
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {title}
              </h1>
            </div>
            {subtitle && <p className="mt-3 text-sm text-slate-600 sm:text-base">{subtitle}</p>}
          </section>
        )}

        <div className="mt-8 space-y-6">{children}</div>
      </div>
      <MobileNav />
    </div>
  );
}
