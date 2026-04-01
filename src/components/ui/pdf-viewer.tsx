'use client';

import { useEffect, useState } from 'react';
import { X, Download, ExternalLink, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfViewerProps {
  url: string;
  fileName?: string;
  onClose: () => void;
}

function isImageFile(fileName?: string, url?: string): boolean {
  const name = (fileName ?? url ?? '').toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/.test(name);
}

export function PdfViewer({ url, fileName, onClose }: PdfViewerProps) {
  const [zoom, setZoom] = useState(100);
  const isImage = isImageFile(fileName, url);

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

  function handleZoomIn() {
    setZoom((prev) => Math.min(prev + 25, 300));
  }

  function handleZoomOut() {
    setZoom((prev) => Math.max(prev - 25, 25));
  }

  function handleResetZoom() {
    setZoom(100);
  }

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
            {/* Zoom controls */}
            <div className="flex items-center gap-1 border-r border-[#e2e8f0] pr-2 mr-1">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 25}
                className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9] transition-colors disabled:opacity-30"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="rounded-lg px-2 py-1 text-xs font-medium text-[#64748b] hover:bg-[#f1f5f9] transition-colors min-w-[48px] text-center"
                aria-label="Reset zoom"
              >
                {zoom}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 300}
                className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9] transition-colors disabled:opacity-30"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              {zoom !== 100 && (
                <button
                  onClick={handleResetZoom}
                  className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
                  aria-label="Fit to width"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
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

        {/* Document content */}
        <div className="flex-1 bg-[#f1f5f9] overflow-auto">
          {isImage ? (
            <div className="flex items-start justify-center p-4 min-h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={fileName || 'Document'}
                style={{
                  width: `${zoom}%`,
                  maxWidth: 'none',
                  transition: 'width 0.15s ease',
                }}
                className="rounded shadow-sm"
              />
            </div>
          ) : (
            <iframe
              src={`${url}#zoom=${zoom}`}
              title={fileName || 'Document'}
              className="w-full h-full border-0"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                width: `${10000 / zoom}%`,
                height: `${10000 / zoom}%`,
              }}
              allow="fullscreen"
            />
          )}
        </div>
      </div>
    </div>
  );
}
