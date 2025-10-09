"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MessageSquare, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
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
    title: "Comms",
    href: "/communications",
    icon: MessageSquare,
  },
  {
    title: "Sync",
    href: "/sync",
    icon: Database,
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-6 left-0 right-0 px-4 pointer-events-none">
      <div className="flex items-center justify-center pointer-events-auto">
        <div className="flex items-center justify-around max-w-md bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-full px-2 py-2 shadow-lg">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0 flex-1",
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-xs font-medium truncate",
                  isActive && "font-semibold"
                )}>
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
