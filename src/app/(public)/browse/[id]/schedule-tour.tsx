'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Clock, Check, Loader2 } from 'lucide-react';

interface Slot {
  id: string;
  start_time: string;
  end_time: string;
}

interface GroupedSlots {
  [date: string]: Slot[];
}

export default function ScheduleTour({ propertyId }: { propertyId: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Booking form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    slotDate: string;
    slotTime: string;
  } | null>(null);

  useEffect(() => {
    async function fetchSlots() {
      try {
        const res = await fetch(`/api/properties/${propertyId}/inspection-slots`);
        if (res.ok) {
          const data = await res.json();
          setSlots(data.slots ?? []);
        }
      } catch {
        // Non-fatal
      } finally {
        setLoading(false);
      }
    }
    fetchSlots();
  }, [propertyId]);

  // Group slots by date in local timezone
  const grouped: GroupedSlots = {};
  for (const slot of slots) {
    const dateKey = new Date(slot.start_time).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(slot);
  }

  async function handleBook() {
    if (!selectedSlot) return;
    if (!contactName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!contactEmail.trim()) {
      setError('Please enter your email');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/properties/${propertyId}/book-inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          contact_name: contactName.trim(),
          contact_email: contactEmail.trim(),
          contact_phone: contactPhone.trim() || undefined,
          company_name: companyName.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Booking failed');
      }

      const data = await res.json();
      setConfirmation({
        slotDate: data.slotDate,
        slotTime: data.slotTime,
      });

      // Remove the booked slot from the local list
      setSlots((prev) => prev.filter((s) => s.id !== selectedSlot.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Already confirmed
  if (confirmation) {
    return (
      <div className="mt-8">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Tour Confirmed</h2>
            <p className="mt-2 text-muted-foreground">
              Your property tour has been scheduled.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{confirmation.slotDate}</span>
              <span className="text-muted-foreground">{confirmation.slotTime}</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              A confirmation has been sent to the property broker. They will reach out if there are any changes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-8">
        <div className="rounded-xl bg-white p-6 shadow-sm text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading available tour times...</p>
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return null; // Don't show section if no slots available
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        Schedule a Tour
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Select an available time to tour this property. No account required.
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {/* Left column: Available time slots */}
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, dateSlots]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{date}</h3>
              <div className="flex flex-wrap gap-2">
                {dateSlots.map((slot) => {
                  const start = new Date(slot.start_time);
                  const end = new Date(slot.end_time);
                  const isSelected = selectedSlot?.id === slot.id;
                  const timeLabel = `${start.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })} – ${end.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}`;

                  return (
                    <button
                      key={slot.id}
                      onClick={() => { setSelectedSlot(slot); setError(null); }}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20'
                          : 'border-border bg-white text-foreground hover:bg-muted'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {timeLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right column: Booking form */}
        <div
          className={`rounded-xl border bg-white p-5 shadow-sm transition-opacity ${
            selectedSlot ? 'opacity-100' : 'opacity-50 pointer-events-none'
          }`}
        >
          <h3 className="text-sm font-semibold mb-4">
            {selectedSlot
              ? `Booking for ${new Date(selectedSlot.start_time).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })} at ${new Date(selectedSlot.start_time).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}`
              : 'Select a time slot to continue'}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => { setContactName(e.target.value); setError(null); }}
                placeholder="Your full name"
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => { setContactEmail(e.target.value); setError(null); }}
                placeholder="you@company.com"
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Any questions or specific areas you'd like to see?"
                rows={3}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-600">{error}</p>
          )}

          <button
            onClick={handleBook}
            disabled={submitting || !selectedSlot}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              'Confirm Tour'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
