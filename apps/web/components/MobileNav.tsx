"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Camera", icon: "\u{1F4F7}" },
  { href: "/stats", label: "Summary", icon: "\u{1F4CA}" },
  { href: "/diary", label: "Saved", icon: "\u{1F4D6}" },
  { href: "/goals", label: "Goals", icon: "\u{1F3AF}" },
  { href: "/nutridex", label: "Nutridex", icon: "\u{1F4D5}" }
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 z-30 w-[92%] max-w-md -translate-x-1/2 rounded-[28px] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_20px_40px_rgba(15,23,42,0.18)] backdrop-blur lg:hidden">
      <div className="flex items-center justify-between">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
                active ? "text-emerald-600" : "text-slate-500"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                  active ? "bg-emerald-500 text-white" : "bg-slate-100"
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
