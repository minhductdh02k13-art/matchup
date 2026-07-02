"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Tìm kèo", icon: "🔍" },
  { href: "/matches/new", label: "Tạo kèo", icon: "➕" },
  { href: "/my", label: "Kèo của tôi", icon: "📋" },
  { href: "/notifications", label: "Thông báo", icon: "🔔" },
  { href: "/profile", label: "Tôi", icon: "👤" },
];

export function MobileNavBar({ unread }: { unread: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white sm:hidden">
      <ul className="flex">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                  active ? "text-brand" : "text-slate-500"
                }`}
              >
                <span className="relative text-xl leading-none">
                  {t.icon}
                  {t.href === "/notifications" && unread > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
