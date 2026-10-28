'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LogOut, X } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsLoggingOut(false);
      return;
    }

    // Auto focus confirm button for keyboard navigation accessibility
    const focusTimer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirmClick = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await onConfirm();
    } catch (e) {
      setIsLoggingOut(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoggingOut) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      aria-describedby="logout-modal-desc"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-zinc-950 p-5 shadow-2xl border border-zinc-800/90 text-left animate-in zoom-in-95 duration-150 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-950 text-blue-400 border border-blue-900">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <h3 id="logout-modal-title" className="text-base font-extrabold text-zinc-100">
                Log out?
              </h3>
              <p id="logout-modal-desc" className="text-xs text-zinc-400 font-medium leading-relaxed mt-0.5">
                Are you sure you want to log out of your ContactReachout account?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="text-zinc-400 hover:text-zinc-400 p-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={handleConfirmClick}
            disabled={isLoggingOut}
            className={`rounded-xl px-4 py-2 text-xs font-bold text-white bg-[#0e6de4] hover:bg-[#0758bd] transition-all shadow-xs cursor-pointer flex items-center gap-2 ${
              isLoggingOut ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'
            }`}
          >
            {isLoggingOut ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Logging out…</span>
              </>
            ) : (
              <span>Log Out</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
