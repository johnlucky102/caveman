# SUPABASE DATABASE SETUP PROMPT

## 🎯 Mục tiêu
Tạo database hoàn chỉnh cho hệ thống quản lý trường mầm non trên Supabase.

---

## 📝 PROMPT ĐỂ COPY-PASTE

```
Tạo database schema cho hệ thống quản lý trường mầm non KidGarden theo các yêu cầu sau:

=== 1. TẠO BẢNG (TABLES) ===

1.1 Bảng users - Thông tin người dùng
- id: uuid, primary key, references auth.users(id) on delete cascade
- full_name: text, not null
- phone: text
- role: text, not null, default 'Parent', check in ('Admin','Teacher','Accountant','Parent')
- avatar: text
- created_at: timestamptz, default now()
- updated_at: timestamptz, default now()

1.2 Bảng grades - Khối lớp
- id: bigint, primary key, auto-increment
- name: text, not null, unique, check in ('Mầm','Chồi','Lá')
- sort_order: int, default 0
- description: text
- created_at: timestamptz, default now()
- updated_at: timestamptz, default now()

1.3 Bảng classes - Lớp học
- id: bigint, primary key, auto-increment
- grade_id: bigint, not null, references grades(id)
- name: text, not null
- teacher_id: uuid, references users(id)
- room: text
- max_students: int, default 30
- description: text
- created_at: timestamptz, default now()
- updated_at: timestamptz, default now()
- unique: (grade_id, name)

1.4 Bảng students - Học sinh
- id: uuid, primary key, default gen_random_uuid()
- class_id: bigint, not null, references classes(id)
- student_code: text, not null, unique
- full_name: text, not null
- date_of_birth: date
- gender: text, check in ('Male','Female')
- ethnicity: text
- nationality: text, default 'Việt Nam'
- address: text
- enrolled_date: date
- health_info: jsonb, default '{"height": null, "weight": null, "blood_type": null, "allergies": null}'
- avatar: text
- created_at: timestamptz, default now()
- updated_at: timestamptz, default now()

1.5 Bảng parents - Phụ huynh
- id: uuid, primary key, default gen_random_uuid()
- user_id: uuid, references users(id)
- full_name: text, not null
- phone: text, not null
- email: text
- relationship: text, not null, default 'Guardian', check in ('Father','Mother','Guardian')
- occupation: text
- address: text
- created_at: timestamptz, default now()
- updated_at: timestamptz, default now()

1.6 Bảng student_parent - Liên kết học sinh - phụ huynh
- student_id: uuid, not null, references students(id), primary key
- parent_id: uuid, not null, references parents(id), primary key
- relation_type: text, not null, default 'Guardian'
- is_primary: boolean, default false
- created_at: timestamptz, default now()

1.7 Bảng attendance - Điểm danh
- id: uuid, primary key, default gen_random_uuid()
- student_id: uuid, not null, references students(id)
- class_id: bigint, not null, references classes(id)
- attendance_date: date, not null
- status: text, not null, check in ('present','absent','late')
- check_in_time: time
- check_out_time: time
- note: text
- created_by: uuid, references users(id)
- created_at: timestamptz, default now()
- updated_at: timestamptz, default now()
- unique: (student_id, attendance_date)

1.8 Bảng fee_types - Loại phí
- id: bigint, primary key, auto-increment
- name: text, not null, unique
- amount_vnd: numeric(12,0), not null, check > 0
- grade_id: bigint, references grades(id)
- description: text
- is_active: boolean, default true
- created_at: timestamptz, default now()
- updated_at: timestamptz, default now()

1.9 Bảng fee_records - Bản ghi thu phí
- id: uuid, primary key, default gen_random_uuid()
- student_id: uuid, not null, references students(id)
- class_id: bigint, not null, references classes(id)
- fee_type_id: bigint, not null, references fee_types(id)
- school_year: text, not null
- month: int, check 1-12
- amount_vnd: numeric(12,0), not null, check > 0
- paid_amount_vnd: numeric(12,0), default 0, check >= 0
- paid_date: date
- due_date: date
- payment_method: text, check in ('cash','bank_transfer')
- status: text, not null, default 'unpaid', check in ('unpaid','partial','paid')
- created_by: uuid, references users(id)
- created_at: timestamptz, default now()
- updated_at: timestamptz, default now()
- unique: (student_id, fee_type_id, school_year, month)

1.10 Bảng notifications - Thông báo
- id: uuid, primary key, default gen_random_uuid()
- recipient_parent_id: uuid, references parents(id)
- recipient_user_id: uuid, references users(id)
- title: text, not null
- body: text, not null
- kind: text, not null, default 'general', check in ('general','event','holiday','request','absence')
- target_type: text, default 'specific', check in ('all','grade','class','specific')
- student_id: uuid, references students(id)
- attendance_id: uuid, references attendance(id)
- sent_by: uuid, references users(id)
- sent_at: timestamptz
- created_at: timestamptz, default now()
- updated_at: timestamptz, default now()

1.11 Bảng notification_reads - Đánh dấu đã đọc
- id: uuid, primary key, default gen_random_uuid()
- notification_id: uuid, not null, references notifications(id)
- parent_id: uuid, references parents(id)
- user_id: uuid, references users(id)
- read_at: timestamptz, default now()
- unique: (notification_id, parent_id, user_id)

1.12 Bảng school_settings - Cài đặt trường
- id: bigint, primary key, auto-increment
- school_name: text, not null
- address: text
- phone: text
- email: text
- school_year: text, not null, unique
- academic_year_start: date
- academic_year_end: date
- logo_url: text
- created_at: timestamptz, default now()
- updated_at: timestamptz, default now()

=== 2. TẠO INDEXES ===

Tạo các indexes sau:
- idx_students_class_id on students(class_id)
- idx_students_student_code on students(student_code)
- idx_attendance_student_date on attendance(student_id, attendance_date)
- idx_attendance_class_date on attendance(class_id, attendance_date)
- idx_fee_records_student on fee_records(student_id)
- idx_fee_records_class_id on fee_records(class_id)
- idx_fee_records_fee_type_id on fee_records(fee_type_id)
- idx_classes_grade_id on classes(grade_id)
- idx_student_parent_parent_id on student_parent(parent_id)
- idx_parents_user_id on parents(user_id)
- idx_notifications_recipient on notifications(recipient_parent_id, recipient_user_id)

=== 3. TẠO TRIGGER TỰ ĐỘNG CẬP NHẬT updated_at ===

Tạo function set_updated_at() để tự động cập nhật cột updated_at khi có UPDATE.
Áp dụng trigger này cho tất cả các bảng có cột updated_at.
Sử dụng vòng lặp DO block để tạo trigger một cách hiệu quả.

=== 4. TẠO FUNCTION TỰ ĐỘNG TẠO USER KHI ĐĂNG KÝ ===

Tạo function handle_new_user() với SECURITY DEFINER:
- Trigger: after insert on auth.users
- Logic: Insert vào bảng users với thông tin từ raw_user_meta_data
- Sử dụng ON CONFLICT DO NOTHING

=== 5. BẬT RLS VÀ TẠO POLICIES ===

5.1 Enable RLS trên tất cả 12 bảng

5.2 Tạo helper function has_role(role_name text):
- Kiểm tra user hiện tại có role được chỉ định không
- Sử dụng SECURITY DEFINER

5.3 Tạo policies:

USERS:
- Everyone can SELECT
- Users can UPDATE where id = auth.uid()
- Admin can do ALL

GRADES:
- Everyone can SELECT
- Admin can do ALL

CLASSES:
- Staff (Admin, Teacher, Accountant) can SELECT
- Admin can do ALL
- Teacher can do ALL

STUDENTS:
- Staff can SELECT
- Admin can do ALL
- Teacher can do ALL
- Parent can SELECT where linked to their children via student_parent

PARENTS:
- Admin can do ALL
- Parent can SELECT where user_id = auth.uid()

STUDENT_PARENT:
- Admin can do ALL
- Teacher can do ALL

ATTENDANCE:
- Staff can SELECT, INSERT, UPDATE
- Parent can SELECT where linked to their children's attendance

FEE_TYPES:
- Staff can SELECT
- Admin can do ALL

FEE_RECORDS:
- Staff can SELECT, INSERT, UPDATE
- Parent can SELECT where linked to their children's fees

NOTIFICATIONS:
- Admin can do ALL
- Parent can SELECT where recipient matches their user_id or parent_id

NOTIFICATION_READS:
- Parent can INSERT, SELECT where matches their user_id or parent_id

SCHOOL_SETTINGS:
- Everyone can SELECT
- Admin can do ALL

=== 6. TẠO TRIGGER THÔNG BÁO VẮNG MẶT ===

Tạo function notify_absence():
- Trigger: AFTER INSERT OR UPDATE OF status ON attendance
- Logic: Khi status = 'absent', tạo notification cho tất cả phụ huynh của học sinh đó
- Lấy thông tin từ student_parent join parents join students
- Insert notification với kind = 'absence'

=== 7. PHÂN QUYỀN (GRANTS) ===

GRANT usage ON SCHEMA public TO authenticated;
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON grades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON parents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON student_parent TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance TO authenticated;
GRANT SELECT ON fee_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fee_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fee_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_reads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON school_settings TO authenticated;

=== 8. THÊM DỮ LIỆU MẪU (SAMPLE DATA) ===

8.1 Insert grades:
('Mầm', 1, 'Nhóm trẻ 3-4 tuổi')
('Chồi', 2, 'Nhóm trẻ 4-5 tuổi')
('Lá', 3, 'Nhóm trẻ 5-6 tuổi')

8.2 Insert classes:
(grade 1, 'Mầm 1', 'P101', 25)
(grade 1, 'Mầm 2', 'P102', 25)
(grade 2, 'Chồi 1', 'P201', 25)
(grade 2, 'Chồi 2', 'P202', 25)
(grade 3, 'Lá 1', 'P301', 25)
(grade 3, 'Lá 2', 'P302', 25)

8.3 Insert fee_types:
('Học phí Mầm', 3500000, grade 1, 'Học phí tháng cho khối Mầm')
('Học phí Chồi', 4000000, grade 2, 'Học phí tháng cho khối Chồi')
('Học phí Lá', 4500000, grade 3, 'Học phí tháng cho khối Lá')
('Bảo hiểm', 500000, NULL, 'Bảo hiểm tai nạn năm học')
('Ăn trưa', 1500000, NULL, 'Tiền ăn trưa tháng')
('Đồng phục', 800000, NULL, 'Bộ đồng phục (áo, quần, nón)')

8.4 Insert school_settings:
('Trường Mầm Non KidGarden', '123 Đường Nguyễn Huệ, Quận 1, TP.HCM', '028 1234 5678', 'kidgarden@example.com', '2024-2025')

8.5 Insert sample students (8 học sinh):
(class 1, 'KG-2024-0001', 'Nguyễn Minh Tuấn', '2021-03-15', 'Male', '123 Đường A, Quận 1')
(class 1, 'KG-2024-0002', 'Trần Thị Lan', '2021-05-22', 'Female', '456 Đường B, Quận 2')
(class 1, 'KG-2024-0003', 'Lê Văn Hùng', '2021-01-10', 'Male', '789 Đường C, Quận 3')
(class 2, 'KG-2024-0004', 'Phạm Thị Hương', '2021-08-08', 'Female', '321 Đường D, Quận 4')
(class 3, 'KG-2024-0005', 'Hoàng Văn Nam', '2020-04-20', 'Male', '654 Đường E, Quận 5')
(class 3, 'KG-2024-0006', 'Vũ Thị Mai', '2020-12-25', 'Female', '987 Đường F, Quận 6')
(class 4, 'KG-2024-0007', 'Đặng Minh Khoa', '2020-09-18', 'Male', '147 Đường G, Quận 7')
(class 5, 'KG-2024-0008', 'Bùi Thị Thu', '2020-02-14', 'Female', '258 Đường H, Quận 8')

=== YÊU CẦU BỔ SUNG ===

1. Sử dụng BEGIN và COMMIT để chạy trong 1 transaction
2. Tất cả CREATE statements nên có IF NOT EXISTS hoặc OR REPLACE
3. Tối ưu code bằng cách dùng vòng lặp thay vì lặp lại code
4. Đảm bảo tất cả constraints và indexes được tạo đúng
5. Sau khi chạy xong, hiển thị danh sách các bảng đã tạo để verify
```

---

## 📋 Hướng dẫn sử dụng:

### Bước 1: Mở Supabase Dashboard
```
https://supabase.com/dashboard
```

### Bước 2: Chọn Project
Chọn project `msdekpkycssitwucbopo`

### Bước 3: Mở SQL Editor
```
SQL Editor → New Query
```

### Bước 4: Paste Prompt
Copy toàn bộ prompt ở trên và paste vào

### Bước 5: Run
Click **Run** hoặc nhấn `Ctrl + Enter`

### Bước 6: Verify
Kiểm tra bảng đã tạo bằng query:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

---

## ✅ Kết quả mong đợi

Sau khi chạy, bạn sẽ có:
- ✅ 12 bảng với đầy đủ relationships
- ✅ 11 indexes cho performance
- ✅ RLS policies cho từng role
- ✅ Triggers tự động (updated_at, user creation, absence notification)
- ✅ Dữ liệu mẫu (3 grades, 6 classes, 8 students, 6 fee types)
