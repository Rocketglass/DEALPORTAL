-- Track application follow-up reminders to avoid duplicate sends
CREATE TABLE IF NOT EXISTS application_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'incomplete_24h',  -- incomplete_24h, incomplete_72h, etc.
  sent_at TIMESTAMPTZ DEFAULT now(),
  email_to TEXT NOT NULL,
  UNIQUE(application_id, reminder_type)
);

CREATE INDEX idx_app_reminders_app_id ON application_reminders(application_id);
