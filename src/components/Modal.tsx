/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black"
            onClick={onClose}
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10"
            id="confirmation-modal-container"
          >
            {/* Header / Accent Ribbon */}
            <div className={`p-6 pb-4 flex items-start gap-4`}>
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  isDestructive
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight leading-6">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  {message}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full transition-colors"
                aria-label="Close dialog"
                id="btn-close-modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Actions Panel */}
            <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-2 sm:gap-3 justify-end border-t border-slate-100">
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all shadow-sm cursor-pointer ${
                  isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white hover:shadow'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow'
                }`}
                id="btn-confirm-modal-action"
              >
                {confirmText}
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full text-sm font-medium tracking-wide bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                id="btn-cancel-modal-action"
              >
                {cancelText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
