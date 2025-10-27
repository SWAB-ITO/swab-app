"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, User, LogOut, X, LogIn } from "lucide-react";
import { createClient } from "@backend/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// Check if we're in local development mode (auth disabled)
const isLocalMode = process.env.NEXT_PUBLIC_SUPABASE_ENV === 'local' ||
                     process.env.NODE_ENV === 'development';

export function UserMenu({ isOpen, onClose }: UserMenuProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(!isLocalMode);
  const router = useRouter();

  useEffect(() => {
    // Skip auth in local development mode
    if (isLocalMode) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (isLocalMode) return;

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
    onClose();
  };

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
            <div className="min-w-0 flex-1">
              {loading ? (
                <>
                  <p className="font-medium text-gray-900">Loading...</p>
                  <p className="text-sm text-gray-500">Please wait</p>
                </>
              ) : user ? (
                <>
                  <p className="font-medium text-gray-900 truncate">
                    {user.email}
                  </p>
                  <p className="text-sm text-gray-500">Signed in</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-900">Not signed in</p>
                  <p className="text-sm text-gray-500">Sign in to continue</p>
                </>
              )}
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
        {user ? (
          <>
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
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-md"
              >
                <LogOut className="h-5 w-5 text-gray-500" />
                Sign Out
              </button>
            </div>
          </>
        ) : (
          <div className="p-4">
            <Link
              href="/auth/login"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded-md"
              onClick={onClose}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 mt-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors rounded-md"
              onClick={onClose}
            >
              Create Account
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
