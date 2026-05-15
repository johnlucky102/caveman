-- Migration: Upgrade Finance Config → Flexible Deduction Rules
-- Replace fixed columns with JSONB deduction_rules
-- Add attendance_deduction_vnd and deduction_details to fee_records

-- 1. Add new columns first (so they exist for data migration)
ALTER TABLE public.class_finance_configs
ADD COLUMN IF NOT EXISTS deduction_rules JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.fee_records
ADD COLUMN IF NOT EXISTS attendance_deduction_vnd NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS deduction_details JSONB DEFAULT '[]'::jsonb;

-- 2. Migrate existing data from old columns into new columns
-- 2a. class_finance_configs: populate deduction_rules from meal_rate / cancel_rate
-- Chỉ chạy nếu columns cũ vẫn tồn tại (defensive check)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'class_finance_configs'
      AND column_name = 'meal_rate'
  ) THEN
    UPDATE public.class_finance_configs
    SET deduction_rules = (
      SELECT jsonb_agg(r) FROM (
        SELECT jsonb_build_object('id', 'legacy_meal', 'name', 'Tiền cơm', 'amount', meal_rate) AS r
        WHERE meal_rate IS NOT NULL AND meal_rate > 0
        UNION ALL
        SELECT jsonb_build_object('id', 'legacy_cancel', 'name', 'Tiền nghỉ', 'amount', cancel_rate) AS r
        WHERE cancel_rate IS NOT NULL AND cancel_rate > 0
      ) sub
    )
    WHERE true;
  END IF;
END $$;

-- 2b. fee_records: combine meal + tuition into attendance_deduction
UPDATE public.fee_records
SET attendance_deduction_vnd = COALESCE(meal_deduction_vnd, 0) + COALESCE(tuition_deduction_vnd, 0)
WHERE COALESCE(meal_deduction_vnd, 0) + COALESCE(tuition_deduction_vnd, 0) > 0;

-- 3. Drop old columns (safe — data already migrated above)
ALTER TABLE public.class_finance_configs
DROP COLUMN IF EXISTS meal_rate,
DROP COLUMN IF EXISTS cancel_rate,
DROP COLUMN IF EXISTS hospital_deduction_type,
DROP COLUMN IF EXISTS hospital_deduction_value;
