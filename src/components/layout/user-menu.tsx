"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, User, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserMenu({ isOpen, onClose }: UserMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-in slide-in-from-top-2 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Not logged in</p>
              <p className="text-sm text-gray-500">Authentication coming soon</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            <Settings className="h-5 w-5 text-gray-500" />
            Settings
          </Link>

          <Link
            href="/profile"
            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            <User className="h-5 w-5 text-gray-500" />
            Profile
          </Link>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-md">
            <LogOut className="h-5 w-5 text-gray-500" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
