"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";

export function TopNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-gray-50 px-4 pt-6 pb-3 relative">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left - Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <img src="/swab-icon.png" alt="SWAB" className="h-16 w-16" />
          </Link>
        </div>

        {/* Right - Floating Menu Button */}
        <div className="flex items-center relative">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 text-gray-700"
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <UserMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </div>
      </div>
    </nav>
  );
}
