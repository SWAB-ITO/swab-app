'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning';
}

export function Dialog({ isOpen, onClose, title, children, variant = 'default' }: DialogProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const variantStyles = {
    default: 'border-gray-200',
    success: 'border-green-200 bg-green-50',
    error: 'border-red-200 bg-red-50',
    warning: 'border-yellow-200 bg-yellow-50',
  };

  const variantTitleColors = {
    default: 'text-gray-600',
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
  };

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
        style={{ zIndex: 9998 }}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
        <div
          className={`relative bg-white rounded-lg shadow-xl border ${variantStyles[variant]} max-w-md w-full mx-auto animate-in fade-in zoom-in duration-200`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Content */}
          <div className="p-6">
            {title && (
              <h3 className={`text-lg font-semibold mb-4 pr-8 ${variantTitleColors[variant]}`}>
                {title}
              </h3>
            )}
            <div className="text-gray-700">{children}</div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
