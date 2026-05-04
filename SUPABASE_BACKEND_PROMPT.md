# SUPABASE BACKEND SETUP PROMPT - KidGarden

## Mục tiêu
Tạo backend hoàn chỉnh cho hệ thống quản lý trường mầm non KidGarden trên Supabase với:
- Database schema với đầy đủ relationships
- Row Level Security (RLS) policies
- Supabase Auth integration
- Edge Functions cho business logic phức tạp

---

## 1. DATABASE SCHEMA

### 1.1 Enum Types (đã tạo)
```sql
-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'accountant', 'parent');

-- Gender
CREATE TYPE gender_type AS ENUM ('male', 'female');

-- Parent relationship
CREATE TYPE parent_relationship AS ENUM ('father', 'mother', 'guardian');

-- Attendance status
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late');

-- Payment status
CREATE TYPE payment_status AS ENUM ('paid', 'unpaid', 'partial');

-- Payment method
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer');

-- Notification type
CREATE TYPE notification_type AS ENUM ('general', 'event', 'holiday', 'request');

-- Notification target
CREATE TYPE notification_target AS ENUM ('all', 'grade', 'class', 'specific');
```

### 1.2 Tables Schema (đã tạo)
```sql
-- Grades table (Mầm, Chồi, Lá)
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users table (all user types)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role user_role NOT NULL DEFAULT 'teacher',
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar VARCHAR(500),
  date_of_birth DATE,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  grade_id UUID REFERENCES grades(id),
  homeroom_teacher_id UUID REFERENCES users(id),
  room VARCHAR(50),
  max_students INTEGER DEFAULT 30,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  dob DATE NOT NULL,
  gender gender_type NOT NULL,
  ethnicity VARCHAR(100),
  nationality VARCHAR(100) DEFAULT 'Việt Nam',
  address TEXT NOT NULL,
  enrolled_date DATE NOT NULL,
  class_id UUID REFERENCES classes(id),
  health_info JSONB DEFAULT '{}',
  avatar VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Parents table
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  relationship parent_relationship NOT NULL,
  occupation VARCHAR(255),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student-Parent relationship
CREATE TABLE student_parent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, parent_id)
);

-- Attendance records
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  date DATE NOT NULL,
  status attendance_status NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  note TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- Fee types
CREATE TABLE fee_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,0) NOT NULL,
  grade_id UUID REFERENCES grades(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fee records
CREATE TABLE fee_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  fee_type_id UUID REFERENCES fee_types(id),
  amount DECIMAL(10,0) NOT NULL,
  month INTEGER CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  status payment_status DEFAULT 'unpaid',
  paid_date DATE,
  payment_method payment_method,
  recorded_by UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type notification_type NOT NULL,
  target_type notification_target DEFAULT 'all',
  target_ids JSONB DEFAULT '[]',
  attachment_url VARCHAR(500),
  sent_by UUID REFERENCES users(id),
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notification reads
CREATE TABLE notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- School settings
CREATE TABLE school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 1.3 Indexes (đã tạo)
```sql
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_full_name ON students(full_name);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX idx_fee_records_student ON fee_records(student_id);
CREATE INDEX idx_fee_records_month_year ON fee_records(month, year);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

---

## 2. ROW LEVEL SECURITY (RLS) POLICIES

### 2.1 Enable RLS
```sql
-- Enable RLS on all tables
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parent ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
```

### 2.2 RLS Policies for Users
```sql
-- Users can view all users
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Admin can do everything with users
CREATE POLICY "Admin can manage users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 2.3 RLS Policies for Students
```sql
-- Admin and teacher can view students
CREATE POLICY "Admin and teacher can view students" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'accountant')
    )
  );

-- Admin can insert students
CREATE POLICY "Admin can insert students" ON students
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can update students
CREATE POLICY "Admin can update students" ON students
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can delete students
CREATE POLICY "Admin can delete students" ON students
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Parents can view their children's info
CREATE POLICY "Parents can view their children" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_parent sp
      JOIN parents p ON p.id = sp.parent_id
      JOIN users u ON u.id = p.user_id
      WHERE sp.student_id = students.id AND u.id = auth.uid()
    )
  );
```

### 2.4 RLS Policies for Classes
```sql
-- All staff can view classes
CREATE POLICY "All staff can view classes" ON classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'accountant')
    )
  );

-- Admin can manage classes
CREATE POLICY "Admin can manage classes" ON classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Teachers can update their assigned classes
CREATE POLICY "Teachers can update assigned classes" ON classes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher'
      AND homeroom_teacher_id = auth.uid()
    )
  );
```

### 2.5 RLS Policies for Attendance
```sql
-- Teachers can view attendance for their classes
CREATE POLICY "Teachers can view attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Teachers can insert attendance
CREATE POLICY "Teachers can insert attendance" ON attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Teachers can update attendance
CREATE POLICY "Teachers can update attendance" ON attendance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Parents can view their children's attendance
CREATE POLICY "Parents can view children attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_parent sp
      JOIN parents p ON p.id = sp.parent_id
      JOIN users u ON u.id = p.user_id
      WHERE sp.student_id = attendance.student_id AND u.id = auth.uid()
    )
  );
```

### 2.6 RLS Policies for Fee Records
```sql
-- Accountant and Admin can view all fee records
CREATE POLICY "Accountant can view fee records" ON fee_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'accountant')
    )
  );

-- Accountant and Admin can insert fee records
CREATE POLICY "Accountant can insert fee records" ON fee_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'accountant')
    )
  );

-- Accountant and Admin can update fee records
CREATE POLICY "Accountant can update fee records" ON fee_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'accountant')
    )
  );

-- Parents can view their children's fee records
CREATE POLICY "Parents can view children fees" ON fee_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_parent sp
      JOIN parents p ON p.id = sp.parent_id
      JOIN users u ON u.id = p.user_id
      WHERE sp.student_id = fee_records.student_id AND u.id = auth.uid()
    )
  );
```

### 2.7 RLS Policies for Notifications
```sql
-- All users can view notifications
CREATE POLICY "All users can view notifications" ON notifications
  FOR SELECT USING (true);

-- Admin can send notifications
CREATE POLICY "Admin can send notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can update notifications
CREATE POLICY "Admin can update notifications" ON notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Mark notification as read
CREATE POLICY "Users can mark notification as read" ON notification_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 3. EDGE FUNCTIONS

### 3.1 Student Management Functions

#### Auto-generate student code
```typescript
// supabase/functions/generate-student-code/index.ts
// Tự động tạo mã học sinh: KG-YYYY-NNNN
```

#### Transfer student between classes
```typescript
// supabase/functions/transfer-student/index.ts
// Chuyển học sinh sang lớp khác
```

### 3.2 Attendance Functions

#### Bulk attendance recording
```typescript
// supabase/functions/bulk-attendance/index.ts
// Điểm danh hàng loạt cho cả lớp
```

#### Generate attendance report
```typescript
// supabase/functions/attendance-report/index.ts
// Tạo báo cáo điểm danh theo tháng
```

### 3.3 Fee Management Functions

#### Calculate monthly fees
```typescript
// supabase/functions/calculate-fees/index.ts
// Tính phí tháng cho tất cả học sinh
```

#### Generate debt report
```typescript
// supabase/functions/debt-report/index.ts
// Báo cáo công nợ học phí
```

### 3.4 Notification Functions

#### Send push notifications
```typescript
// supabase/functions/send-notification/index.ts
// Gửi thông báo đến phụ huynh
```

---

## 4. DATABASE TRIGGERS

### 4.1 Auto-update updated_at
```sql
-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for all tables with updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_settings_updated_at
    BEFORE UPDATE ON school_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4.2 Auto-create user record on signup
```sql
-- Function to create user record
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'teacher'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 4.3 Send notification on absence
```sql
-- Function to notify parent on absence
CREATE OR REPLACE FUNCTION notify_parent_on_absence()
RETURNS TRIGGER AS $$
DECLARE
    parent_user_id UUID;
    student_name TEXT;
BEGIN
    IF NEW.status = 'absent' THEN
        -- Get parent user
        SELECT u.id, s.full_name INTO parent_user_id, student_name
        FROM student_parent sp
        JOIN parents p ON p.id = sp.parent_id
        JOIN students s ON s.id = sp.student_id
        JOIN users u ON u.id = p.user_id
        WHERE sp.student_id = NEW.student_id AND sp.is_primary = true;

        IF parent_user_id IS NOT NULL THEN
            -- Create notification
            INSERT INTO notifications (title, content, type, target_type, target_ids, sent_by)
            VALUES (
                'Thông báo vắng mặt',
                'Con bạn (' || student_name || ') vắng mặt ngày ' || NEW.date,
                'general',
                'specific',
                '["' || parent_user_id || '"]'::jsonb,
                NEW.recorded_by
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_absence_recorded
    AFTER INSERT ON attendance
    FOR EACH ROW EXECUTE FUNCTION notify_parent_on_absence();
```

---

## 5. SAMPLE DATA

### 5.1 Insert Grades
```sql
INSERT INTO grades (name, description, order_index) VALUES
('Mầm', 'Nhóm trẻ từ 3-4 tuổi', 1),
('Chồi', 'Nhóm trẻ từ 4-5 tuổi', 2),
('Lá', 'Nhóm trẻ từ 5-6 tuổi', 3);
```

### 5.2 Insert School Settings
```sql
INSERT INTO school_settings (key, value) VALUES
('school_name', 'Trường Mầm Non KidGarden'),
('school_address', '123 Đường ABC, Quận XYZ, TP.HCM'),
('school_phone', '028 1234 5678'),
('school_email', 'kidgarden@example.com'),
('academic_year_start', '2024-09-01'),
('academic_year_end', '2025-06-30');
```

### 5.3 Insert Fee Types
```sql
INSERT INTO fee_types (name, amount, grade_id, description) VALUES
('Học phí Mầm', 3500000, (SELECT id FROM grades WHERE name = 'Mầm'), 'Học phí tháng'),
('Học phí Chồi', 4000000, (SELECT id FROM grades WHERE name = 'Chồi'), 'Học phí tháng'),
('Học phí Lá', 4500000, (SELECT id FROM grades WHERE name = 'Lá'), 'Học phí tháng'),
('Bảo hiểm', 500000, NULL, 'Bảo hiểm năm'),
('Ăn trưa', 1500000, NULL, 'Tiền ăn trưa tháng'),
('Đồng phục', 800000, NULL, 'Bộ đồng phục');
```

---

## 6. SUPABASE AUTH CONFIGURATION

### 6.1 Auth Settings
```json
{
  "site_url": "https://your-domain.com",
  "additional_redirect_urls": ["https://your-domain.com"],
  "jwt_expiry": 3600,
  "enable_signup": true,
  "enable_anonymous_sign_ins": false
}
```

### 6.2 Email Templates (trong Supabase Dashboard)
- Confirmation email
- Reset password email
- Invite user email

---

## 7. STEPS TO IMPLEMENT

### Bước 1: Tạo Database
1. Chạy tất cả SQL ở phần 1.1 - 1.3 trong Supabase SQL Editor
2. Chạy tất cả RLS policies ở phần 2
3. Chạy triggers ở phần 4

### Bước 2: Tạo Edge Functions
1. Tạo folder `supabase/functions/` trong project
2. Triển khai các functions ở phần 3

### Bước 3: Insert Sample Data
1. Chạy SQL ở phần 5

### Bước 4: Cập nhật Frontend
1. Kết nối Supabase client với real API calls
2. Thêm authentication flow
3. Update stores để sync với database

---

## 8. API ENDPOINTS

### Authentication
- `POST /auth/v1/signup` - Đăng ký
- `POST /auth/v1/token?grant_type=password` - Đăng nhập
- `POST /auth/v1/logout` - Đăng xuất
- `GET /auth/v1/user` - Lấy thông tin user hiện tại

### CRUD Operations (qua Supabase client)
```typescript
// Students
supabase.from('students').select('*')
supabase.from('students').insert({...})
supabase.from('students').update({...}).eq('id', id)
supabase.from('students').delete().eq('id', id)

// Classes
supabase.from('classes').select('*, grades(*), users(*)')

// Attendance
supabase.from('attendance').select('*, students(*), classes(*)')

// Fees
supabase.from('fee_records').select('*, students(*), fee_types(*)')
```

---

**Người tạo**: MiniMax Agent
**Ngày tạo**: 2026-04-23

---

## PROMPT COPY-PASTE

Dưới đây là prompt để bạn copy và sử dụng:

---

```
Tạo backend hoàn chỉnh cho hệ thống quản lý trường mầm non KidGarden trên Supabase:

1. Chạy SQL để tạo tất cả tables với đầy đủ constraints và indexes:
   - users (id references auth.users)
   - grades (Mầm, Chồi, Lá)
   - classes (với references đến grades và users)
   - students (với health_info JSONB)
   - parents
   - student_parent (link table)
   - attendance
   - fee_types
   - fee_records
   - notifications
   - notification_reads
   - school_settings

2. Tạo indexes cho performance:
   - idx_students_class_id
   - idx_attendance_student_date
   - idx_fee_records_student

3. Enable RLS trên tất cả tables với policies:
   - Admin: full access
   - Teacher: CRUD students, classes, attendance
   - Accountant: CRUD fee_records
   - Parent: read-only on own children data

4. Tạo triggers:
   - Auto-update updated_at
   - Auto-create user record on auth signup
   - Send notification when student is absent

5. Insert sample data:
   - 3 grades
   - 6 fee_types với amounts (3.5M - 5M VND)
   - School settings (tên, địa chỉ, năm học)

Supabase Project: msdekpkycssitwucbopo
```