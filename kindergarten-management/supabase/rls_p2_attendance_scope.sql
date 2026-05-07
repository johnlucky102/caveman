-- P2 RLS tightening for attendance
-- Teacher only reads/writes attendance for students in their assigned classes

BEGIN;

-- Remove the old broad policy
DROP POLICY IF EXISTS "Staff manages attendance" ON public.attendance;

-- 1. READ policy
CREATE POLICY "Staff reads attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  public.has_role('Admin')
  OR public.has_role('Accountant')
  OR (
    public.has_role('Teacher')
    AND EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = attendance.class_id
      AND c.teacher_id = auth.uid()
    )
  )
);

-- 2. WRITE policy (Insert/Update/Delete)
CREATE POLICY "Staff writes attendance"
ON public.attendance
FOR ALL -- Covers INSERT, UPDATE, DELETE
TO authenticated
USING (
  public.has_role('Admin')
  OR (
    public.has_role('Teacher')
    AND EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = attendance.class_id
      AND c.teacher_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.has_role('Admin')
  OR (
    public.has_role('Teacher')
    AND EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = attendance.class_id
      AND c.teacher_id = auth.uid()
    )
  )
);

COMMIT;
