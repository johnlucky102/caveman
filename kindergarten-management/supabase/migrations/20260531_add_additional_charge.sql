-- Migration: Add additional charge fields to fee_records
-- Purpose: Support adding extra charges (debt, penalties, etc.) to monthly fees
-- Date: 2026-05-31

ALTER TABLE fee_records
ADD COLUMN IF NOT EXISTS additional_charge_vnd INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS additional_charge_note TEXT;

COMMENT ON COLUMN fee_records.additional_charge_vnd IS 'Số tiền phụ thu (nợ cũ, phí phát sinh, v.v.)';
COMMENT ON COLUMN fee_records.additional_charge_note IS 'Ghi chú giải thích phụ thu';

-- Update existing records to have default value
UPDATE fee_records
SET additional_charge_vnd = 0
WHERE additional_charge_vnd IS NULL;
