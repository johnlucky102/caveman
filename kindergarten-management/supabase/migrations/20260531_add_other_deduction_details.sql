-- Migration: Add other_deduction_details to fee_records
-- Purpose: Support multiple other deduction items with details
-- Date: 2026-05-31

ALTER TABLE fee_records
ADD COLUMN IF NOT EXISTS other_deduction_details TEXT;

COMMENT ON COLUMN fee_records.other_deduction_details IS 'Chi tiết khấu trừ khác (JSON array)';
