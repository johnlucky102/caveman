-- P1 RLS alignment for users/classes/students/grades
-- Apply after schema.sql

BEGIN;

DROP POLICY IF EXISTS "Teacher manages classes" ON public.classes;
DROP POLICY IF EXISTS "Teacher manages students" ON public.students;
DROP POLICY IF EXISTS "Staff reads students" ON public.students;
DROP POLICY IF EXISTS "Staff reads classes" ON public.classes;

CREATE POLICY "Staff reads classes"
ON public.classes
FOR SELECT
TO authenticated
USING (
  public.has_role('Admin')
  OR public.has_role('Accountant')
  OR (
    public.has_role('Teacher')
    AND teacher_id = auth.uid()
  )
);

CREATE POLICY "Staff reads students"
ON public.students
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
      WHERE c.id = students.class_id
      AND c.teacher_id = auth.uid()
    )
  )
);

CREATE POLICY "Teacher manages classes"
ON public.classes
FOR UPDATE
TO authenticated
USING (
  public.has_role('Teacher')
  AND teacher_id = auth.uid()
)
WITH CHECK (
  public.has_role('Teacher')
  AND teacher_id = auth.uid()
);

CREATE POLICY "Teacher manages students"
ON public.students
FOR UPDATE
TO authenticated
USING (
  public.has_role('Teacher')
  AND EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = students.class_id
    AND c.teacher_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role('Teacher')
  AND EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = students.class_id
    AND c.teacher_id = auth.uid()
  )
);

COMMIT;
