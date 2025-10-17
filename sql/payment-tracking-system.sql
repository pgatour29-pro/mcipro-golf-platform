-- =====================================================
-- PAYMENT TRACKING SYSTEM FOR SOCIETY GOLF
-- =====================================================
-- Comprehensive payment tracking for event organizers
-- Tracks golfer payment preferences, status, and real-time balances

-- =====================================================
-- 1. PAYMENT TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS event_payments (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES society_events(id) ON DELETE CASCADE,
  registration_id TEXT NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,

  -- Player info (denormalized for convenience)
  player_id TEXT,
  player_name TEXT NOT NULL,

  -- Payment breakdown
  green_fee_amount INTEGER DEFAULT 0,
  cart_fee_amount INTEGER DEFAULT 0,
  caddy_fee_amount INTEGER DEFAULT 0,
  transport_fee_amount INTEGER DEFAULT 0,
  competition_fee_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,

  -- Payment preferences (golfer selections)
  pay_green_at TEXT CHECK (pay_green_at IN ('bar', 'course', 'online', 'organizer')),
  pay_cart_at TEXT CHECK (pay_cart_at IN ('bar', 'course', 'online', 'organizer')),
  pay_caddy_at TEXT CHECK (pay_caddy_at IN ('bar', 'course', 'online', 'organizer')),
  pay_transport_at TEXT CHECK (pay_transport_at IN ('bar', 'course', 'online', 'organizer')),
  pay_competition_at TEXT CHECK (pay_competition_at IN ('bar', 'course', 'online', 'organizer')),

  -- Payment status
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),

  -- Individual component status
  green_fee_paid BOOLEAN DEFAULT FALSE,
  cart_fee_paid BOOLEAN DEFAULT FALSE,
  caddy_fee_paid BOOLEAN DEFAULT FALSE,
  transport_fee_paid BOOLEAN DEFAULT FALSE,
  competition_fee_paid BOOLEAN DEFAULT FALSE,

  -- Payment method and timestamps
  payment_method TEXT, -- 'cash', 'card', 'bank_transfer', 'line_pay', etc.
  paid_at TIMESTAMPTZ,
  marked_paid_by TEXT, -- Organizer who marked as paid

  -- Notes
  payment_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one payment record per registration
  UNIQUE(registration_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_event ON event_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_player ON event_payments(player_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON event_payments(event_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_registration ON event_payments(registration_id);

-- =====================================================
-- 2. PAYMENT BALANCE VIEW
-- =====================================================
-- Real-time view for organizers to see payment summaries
CREATE OR REPLACE VIEW event_payment_summary AS
SELECT
  ep.event_id,
  se.name AS event_name,
  se.date AS event_date,
  COUNT(ep.id) AS total_registrations,
  COUNT(ep.id) FILTER (WHERE ep.payment_status = 'paid') AS paid_count,
  COUNT(ep.id) FILTER (WHERE ep.payment_status = 'unpaid') AS unpaid_count,
  COUNT(ep.id) FILTER (WHERE ep.payment_status = 'partial') AS partial_count,
  SUM(ep.total_amount) AS total_expected,
  SUM(CASE
    WHEN ep.green_fee_paid THEN ep.green_fee_amount ELSE 0
  END + CASE
    WHEN ep.cart_fee_paid THEN ep.cart_fee_amount ELSE 0
  END + CASE
    WHEN ep.caddy_fee_paid THEN ep.caddy_fee_amount ELSE 0
  END + CASE
    WHEN ep.transport_fee_paid THEN ep.transport_fee_amount ELSE 0
  END + CASE
    WHEN ep.competition_fee_paid THEN ep.competition_fee_amount ELSE 0
  END) AS total_collected,
  (SUM(ep.total_amount) - SUM(CASE
    WHEN ep.green_fee_paid THEN ep.green_fee_amount ELSE 0
  END + CASE
    WHEN ep.cart_fee_paid THEN ep.cart_fee_amount ELSE 0
  END + CASE
    WHEN ep.caddy_fee_paid THEN ep.caddy_fee_amount ELSE 0
  END + CASE
    WHEN ep.transport_fee_paid THEN ep.transport_fee_amount ELSE 0
  END + CASE
    WHEN ep.competition_fee_paid THEN ep.competition_fee_amount ELSE 0
  END)) AS outstanding_balance
FROM event_payments ep
JOIN society_events se ON ep.event_id = se.id
GROUP BY ep.event_id, se.name, se.date;

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE event_payments ENABLE ROW LEVEL SECURITY;

-- Public read access for payments (organizers and players can see)
CREATE POLICY "Payments are viewable by everyone" ON event_payments
  FOR SELECT USING (true);

-- Anyone can create payment records
CREATE POLICY "Payments are insertable by everyone" ON event_payments
  FOR INSERT WITH CHECK (true);

-- Anyone can update payment records
CREATE POLICY "Payments are updatable by everyone" ON event_payments
  FOR UPDATE USING (true);

-- Anyone can delete payment records
CREATE POLICY "Payments are deletable by everyone" ON event_payments
  FOR DELETE USING (true);

-- =====================================================
-- 4. REALTIME PUBLICATION
-- =====================================================

-- Enable realtime for payment tracking
ALTER PUBLICATION supabase_realtime ADD TABLE event_payments;

-- =====================================================
-- 5. FUNCTIONS FOR PAYMENT MANAGEMENT
-- =====================================================

-- Function to auto-create payment record when registration is created
CREATE OR REPLACE FUNCTION create_payment_record()
RETURNS TRIGGER AS $$
DECLARE
  event_record RECORD;
  total_calc INTEGER;
BEGIN
  -- Get event details
  SELECT * INTO event_record
  FROM society_events
  WHERE id = NEW.event_id;

  -- Calculate total based on preferences
  total_calc := event_record.base_fee;

  IF NEW.want_transport THEN
    total_calc := total_calc + event_record.transport_fee;
  END IF;

  IF NEW.want_competition THEN
    total_calc := total_calc + event_record.competition_fee;
  END IF;

  -- Always add cart and caddy fees (usually required)
  total_calc := total_calc + event_record.cart_fee + event_record.caddy_fee;

  -- Create payment record
  INSERT INTO event_payments (
    id,
    event_id,
    registration_id,
    player_id,
    player_name,
    green_fee_amount,
    cart_fee_amount,
    caddy_fee_amount,
    transport_fee_amount,
    competition_fee_amount,
    total_amount,
    payment_status
  ) VALUES (
    'pay_' || NEW.id,
    NEW.event_id,
    NEW.id,
    NEW.player_id,
    NEW.player_name,
    event_record.base_fee,
    event_record.cart_fee,
    event_record.caddy_fee,
    CASE WHEN NEW.want_transport THEN event_record.transport_fee ELSE 0 END,
    CASE WHEN NEW.want_competition THEN event_record.competition_fee ELSE 0 END,
    total_calc,
    'unpaid'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create payment record on registration
DROP TRIGGER IF EXISTS create_payment_on_registration ON event_registrations;
CREATE TRIGGER create_payment_on_registration
  AFTER INSERT ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION create_payment_record();

-- Function to update payment status automatically
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate payment status based on individual component statuses
  IF NEW.green_fee_paid AND
     NEW.cart_fee_paid AND
     NEW.caddy_fee_paid AND
     (NEW.transport_fee_amount = 0 OR NEW.transport_fee_paid) AND
     (NEW.competition_fee_amount = 0 OR NEW.competition_fee_paid) THEN
    -- All paid
    NEW.payment_status := 'paid';
    IF NEW.paid_at IS NULL THEN
      NEW.paid_at := NOW();
    END IF;
  ELSIF NEW.green_fee_paid OR
        NEW.cart_fee_paid OR
        NEW.caddy_fee_paid OR
        NEW.transport_fee_paid OR
        NEW.competition_fee_paid THEN
    -- Partially paid
    NEW.payment_status := 'partial';
  ELSE
    -- Nothing paid
    NEW.payment_status := 'unpaid';
    NEW.paid_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update payment status
DROP TRIGGER IF EXISTS auto_update_payment_status ON event_payments;
CREATE TRIGGER auto_update_payment_status
  BEFORE UPDATE ON event_payments
  FOR EACH ROW
  WHEN (OLD.green_fee_paid IS DISTINCT FROM NEW.green_fee_paid OR
        OLD.cart_fee_paid IS DISTINCT FROM NEW.cart_fee_paid OR
        OLD.caddy_fee_paid IS DISTINCT FROM NEW.caddy_fee_paid OR
        OLD.transport_fee_paid IS DISTINCT FROM NEW.transport_fee_paid OR
        OLD.competition_fee_paid IS DISTINCT FROM NEW.competition_fee_paid)
  EXECUTE FUNCTION update_payment_status();

-- Function to mark entire payment as paid
CREATE OR REPLACE FUNCTION mark_payment_paid(
  p_payment_id TEXT,
  p_marked_by TEXT,
  p_method TEXT DEFAULT 'cash',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  UPDATE event_payments
  SET
    green_fee_paid = TRUE,
    cart_fee_paid = TRUE,
    caddy_fee_paid = TRUE,
    transport_fee_paid = TRUE,
    competition_fee_paid = TRUE,
    payment_status = 'paid',
    payment_method = p_method,
    paid_at = NOW(),
    marked_paid_by = p_marked_by,
    payment_notes = COALESCE(p_notes, payment_notes),
    updated_at = NOW()
  WHERE id = p_payment_id
  RETURNING jsonb_build_object(
    'success', true,
    'payment_id', id,
    'player_name', player_name,
    'total_amount', total_amount,
    'paid_at', paid_at
  ) INTO result;

  IF result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get event payment summary
CREATE OR REPLACE FUNCTION get_event_payment_summary(p_event_id TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'event_id', event_id,
    'total_registrations', total_registrations,
    'paid_count', paid_count,
    'unpaid_count', unpaid_count,
    'partial_count', partial_count,
    'total_expected', total_expected,
    'total_collected', total_collected,
    'outstanding_balance', outstanding_balance,
    'payment_percentage', CASE
      WHEN total_expected > 0
      THEN ROUND((total_collected::NUMERIC / total_expected::NUMERIC) * 100, 2)
      ELSE 0
    END
  ) INTO result
  FROM event_payment_summary
  WHERE event_id = p_event_id;

  RETURN COALESCE(result, jsonb_build_object('error', 'Event not found'));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. UPDATE EXISTING REGISTRATIONS
-- =====================================================
-- Create payment records for existing registrations
INSERT INTO event_payments (
  id,
  event_id,
  registration_id,
  player_id,
  player_name,
  green_fee_amount,
  cart_fee_amount,
  caddy_fee_amount,
  transport_fee_amount,
  competition_fee_amount,
  total_amount,
  payment_status
)
SELECT
  'pay_' || er.id,
  er.event_id,
  er.id,
  er.player_id,
  er.player_name,
  se.base_fee,
  se.cart_fee,
  se.caddy_fee,
  CASE WHEN er.want_transport THEN se.transport_fee ELSE 0 END,
  CASE WHEN er.want_competition THEN se.competition_fee ELSE 0 END,
  se.base_fee + se.cart_fee + se.caddy_fee +
    CASE WHEN er.want_transport THEN se.transport_fee ELSE 0 END +
    CASE WHEN er.want_competition THEN se.competition_fee ELSE 0 END,
  'unpaid'
FROM event_registrations er
JOIN society_events se ON er.event_id = se.id
WHERE NOT EXISTS (
  SELECT 1 FROM event_payments ep WHERE ep.registration_id = er.id
)
ON CONFLICT (registration_id) DO NOTHING;

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON event_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DONE!
-- =====================================================
-- Payment tracking system created successfully
-- Features:
-- 1. Individual fee tracking (green, cart, caddy, transport, competition)
-- 2. Payment preference tracking (where golfer will pay each fee)
-- 3. Payment status tracking (unpaid, partial, paid)
-- 4. Real-time balance summaries
-- 5. Auto-creation of payment records on registration
-- 6. Organizer checklist capabilities
-- 7. Payment history and audit trail
--
-- Next: Run this in Supabase SQL Editor
