"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Home",
    href: "/",
    icon: Home,
  },
  {
    title: "Mentors",
    href: "/mentors",
    icon: Users,
  },
  {
    title: "Sync",
    href: "/sync",
    icon: Database,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-0 right-0 px-4 pt-6 pb-3 pointer-events-none">
      <div className="flex items-center justify-center pointer-events-auto">
        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1 shadow-lg border border-gray-200">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all min-w-0",
                  isActive
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
