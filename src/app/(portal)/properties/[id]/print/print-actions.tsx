'use client';

export function PrintActions() {
  return (
    <div className="no-print mb-6 flex items-center justify-between">
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light"
      >
        Print / Save as PDF
      </button>
      <button
        onClick={() => window.close()}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Close
      </button>
    </div>
  );
}
