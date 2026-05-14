-- Migration: Tách cấu hình tài chính (khấu trừ) khỏi bảng classes
-- Ngày: 2026-05-13
-- Mô tả: Tạo bảng class_finance_configs, migrate data, thêm RLS, xóa columns cũ

-- ======================================================================
-- 1. Tạo bảng class_finance_configs
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.class_finance_configs (
    id                       BIGSERIAL PRIMARY KEY,
    class_id                 BIGINT NOT NULL UNIQUE REFERENCES public.classes(id) ON DELETE CASCADE,
    class_type               VARCHAR(20) NOT NULL DEFAULT 'Daycare' CHECK (class_type IN ('Daycare', 'Evening')),
    meal_rate                INTEGER NOT NULL DEFAULT 20000,
    cancel_rate              INTEGER NOT NULL DEFAULT 50000,
    hospital_deduction_type  VARCHAR(10) NOT NULL DEFAULT 'Fixed' CHECK (hospital_deduction_type IN ('Fixed', 'Daily')),
    hospital_deduction_value INTEGER NOT NULL DEFAULT 0,
    del_yn                   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_finance_configs_class_id 
    ON public.class_finance_configs(class_id) WHERE del_yn = FALSE;

CREATE INDEX IF NOT EXISTS idx_class_finance_configs_del_yn 
    ON public.class_finance_configs(del_yn);

-- ======================================================================
-- 2. Migrate dữ liệu từ classes sang class_finance_configs
-- ======================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'classes' 
        AND column_name = 'class_type'
    ) THEN
        INSERT INTO public.class_finance_configs (class_id, class_type, meal_rate, cancel_rate, hospital_deduction_type, hospital_deduction_value, del_yn)
        SELECT 
            id,
            COALESCE(class_type, 'Daycare'),
            COALESCE(meal_rate, 20000),
            COALESCE(cancel_rate, 50000),
            COALESCE(hospital_deduction_type, 'Fixed'),
            COALESCE(hospital_deduction_value, 0),
            COALESCE(del_yn, FALSE)
        FROM public.classes
        ON CONFLICT (class_id) DO NOTHING;
    END IF;
END $$;

-- ======================================================================
-- 3. Xóa các columns tài chính khỏi bảng classes
-- ======================================================================
ALTER TABLE public.classes 
    DROP COLUMN IF EXISTS class_type,
    DROP COLUMN IF EXISTS meal_rate,
    DROP COLUMN IF EXISTS cancel_rate,
    DROP COLUMN IF EXISTS hospital_deduction_type,
    DROP COLUMN IF EXISTS hospital_deduction_value;

-- ======================================================================
-- 4. RLS Policies cho class_finance_configs
-- ======================================================================
ALTER TABLE public.class_finance_configs ENABLE ROW LEVEL SECURITY;

-- SELECT: Auth users có thể đọc configs (role-aware filtering sẽ do service layer xử lý)
DROP POLICY IF EXISTS class_finance_configs_select ON public.class_finance_configs;
CREATE POLICY class_finance_configs_select ON public.class_finance_configs 
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND del_yn = FALSE
    );

-- INSERT: Chỉ Admin và Accountant
DROP POLICY IF EXISTS class_finance_configs_insert ON public.class_finance_configs;
CREATE POLICY class_finance_configs_insert ON public.class_finance_configs 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('Admin', 'Accountant')
        )
    );

-- UPDATE: Chỉ Admin và Accountant
DROP POLICY IF EXISTS class_finance_configs_update ON public.class_finance_configs;
CREATE POLICY class_finance_configs_update ON public.class_finance_configs 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('Admin', 'Accountant')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('Admin', 'Accountant')
        )
    );

-- DELETE: Chỉ Admin và Accountant (soft-delete)
DROP POLICY IF EXISTS class_finance_configs_delete ON public.class_finance_configs;
CREATE POLICY class_finance_configs_delete ON public.class_finance_configs 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('Admin', 'Accountant')
        )
    );

-- ======================================================================
-- 5. Trigger tự động cập nhật updated_at
-- ======================================================================
CREATE OR REPLACE FUNCTION public.update_class_finance_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_class_finance_configs_updated_at ON public.class_finance_configs;
CREATE TRIGGER trg_class_finance_configs_updated_at
    BEFORE UPDATE ON public.class_finance_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_class_finance_configs_updated_at();
