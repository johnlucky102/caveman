-- Migration: Add other_deduction_vnd column to fee_records
-- This allows persisting "Khấu trừ khác" separately from attendance deductions
ALTER TABLE public.fee_records 
ADD COLUMN IF NOT EXISTS other_deduction_vnd NUMERIC DEFAULT 0;
