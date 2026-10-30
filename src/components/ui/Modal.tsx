import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="modal-backdrop-enter fixed inset-0 bg-emerald-950/45 backdrop-blur-md"
          onClick={onClose}
        />
        <div
          className={`modal-panel-enter relative transform overflow-hidden rounded-2xl border border-white/90 bg-white/95 text-left shadow-2xl ring-1 ring-emerald-500/15 backdrop-blur-2xl w-full ${maxWidthClass} my-8`}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100/80 bg-emerald-50/50 backdrop-blur-sm">
            <div>
              <h3 className="text-lg font-bold text-emerald-950">{title}</h3>
              {subtitle && <p className="text-xs text-emerald-800/70 mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-emerald-800/70 hover:text-emerald-950 hover:bg-emerald-100/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-5 max-h-[calc(85vh-8rem)] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};
