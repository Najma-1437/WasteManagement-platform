-- Migration 006: add is_read column to notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id, sent_at DESC);
