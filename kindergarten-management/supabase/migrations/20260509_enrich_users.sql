ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Male', 'Female', 'Other')),
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS qualification text,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Resigned'));

ALTER TABLE public.parents
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Male', 'Female', 'Other')),
ADD COLUMN IF NOT EXISTS date_of_birth date;
