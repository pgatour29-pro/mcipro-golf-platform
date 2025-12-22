-- ============================================================================
-- ACCOUNTING TABLES FOR SOCIETY ORGANIZERS
-- ============================================================================
-- Date: December 22, 2025
-- Purpose: Budget tracking and financial goal management for societies
-- ============================================================================

-- Society budget goals table
CREATE TABLE IF NOT EXISTS society_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('events', 'transport', 'prizes', 'marketing', 'other')),
  planned_amount DECIMAL(12,2) NOT NULL,
  auto_suggested BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(society_id, fiscal_year, category)
);

-- Enable RLS
ALTER TABLE society_budgets ENABLE ROW LEVEL SECURITY;

-- Allow all operations (matches existing pattern in codebase)
CREATE POLICY "Allow all operations on society_budgets"
  ON society_budgets
  FOR ALL
  USING (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_society_budgets_society
  ON society_budgets(society_id, fiscal_year);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE society_budgets;

-- ============================================================================
-- USAGE NOTES:
--
-- Categories:
--   - events: Revenue from event fees (entry, competition, etc.)
--   - transport: Revenue from van/transport fees
--   - prizes: Budget allocation for prizes and awards
--   - marketing: Budget for promotions and marketing
--   - other: Miscellaneous budget items
--
-- Auto-suggested:
--   - true: Budget was calculated by AI based on historical data
--   - false: Budget was manually set by organizer
--
-- Example queries:
--
-- Get all budgets for a society in current year:
-- SELECT * FROM society_budgets
-- WHERE society_id = 'TRGG' AND fiscal_year = 2025;
--
-- Get actual revenue vs budget (join with event_registrations):
-- SELECT
--   b.category,
--   b.planned_amount,
--   COALESCE(SUM(er.total_fee), 0) as actual_amount,
--   b.planned_amount - COALESCE(SUM(er.total_fee), 0) as variance
-- FROM society_budgets b
-- LEFT JOIN society_events se ON se.title LIKE b.society_id || ' -%'
-- LEFT JOIN event_registrations er ON er.event_id = se.id
--   AND er.payment_status = 'paid'
--   AND EXTRACT(YEAR FROM se.event_date) = b.fiscal_year
-- WHERE b.society_id = 'TRGG' AND b.fiscal_year = 2025
-- GROUP BY b.id, b.category, b.planned_amount;
-- ============================================================================
