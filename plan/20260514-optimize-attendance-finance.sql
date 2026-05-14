-- Migration: Simplify Attendance & Finance Config
-- Drop unused columns from attendance & class_finance_configs
-- Convert old status values to 'absent'

-- 1. Convert old attendance statuses to 'absent'
UPDATE public.attendance
SET status = 'absent'
WHERE status NOT IN ('present', 'absent');

-- 2. Drop unused columns from attendance
ALTER TABLE public.attendance
DROP COLUMN IF EXISTS note,
DROP COLUMN IF EXISTS medicine_instructions,
DROP COLUMN IF EXISTS sleep_quality,
DROP COLUMN IF EXISTS is_hospitalized;

-- 3. Drop unused columns from class_finance_configs
ALTER TABLE public.class_finance_configs
DROP COLUMN IF EXISTS hospital_deduction_type,
DROP COLUMN IF EXISTS hospital_deduction_value;
