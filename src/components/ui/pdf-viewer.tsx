'use client';

import { useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfViewerProps {
  url: string;
  fileName?: string;
  onClose: () => void;
}

export function PdfViewer({ url, fileName, onClose }: PdfViewerProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-label={fileName ? `Document viewer: ${fileName}` : 'Document viewer'}
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full m-3 sm:m-6 lg:m-10 rounded-xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-4 py-3 sm:px-6 sm:py-4 shrink-0">
          <div className="min-w-0 mr-4">
            {fileName && (
              <h3 className="text-sm font-semibold text-[#0f172a] truncate">
                {fileName}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() => window.open(url, '_blank')}
            >
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={ExternalLink}
              onClick={() => window.open(url, '_blank')}
            >
              <span className="hidden sm:inline">Open in Tab</span>
            </Button>
            <button
              onClick={onClose}
              aria-label="Close document viewer"
              className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PDF iframe */}
        <div className="flex-1 bg-[#f1f5f9]">
          <iframe
            src={url}
            title={fileName || 'Document'}
            className="w-full h-full border-0"
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  );
}
