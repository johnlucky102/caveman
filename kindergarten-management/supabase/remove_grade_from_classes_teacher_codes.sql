-- Remove grade from active class/student flows and persist generated codes.
-- Apply after schema.sql on existing databases.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS teacher_code text;

CREATE UNIQUE INDEX IF NOT EXISTS users_teacher_code_unique
  ON public.users (teacher_code)
  WHERE teacher_code IS NOT NULL;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS class_code text;

CREATE UNIQUE INDEX IF NOT EXISTS classes_class_code_unique
  ON public.classes (class_code)
  WHERE class_code IS NOT NULL;

ALTER TABLE public.classes
  ALTER COLUMN grade_id DROP NOT NULL;

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_grade_id_name_key;

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_name_key;

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_room_name_key;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_room_name_key UNIQUE (room, name);

GRANT SELECT, UPDATE, DELETE ON public.users TO authenticated;

COMMIT;
