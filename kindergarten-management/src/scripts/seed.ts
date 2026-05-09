import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seed() {
  console.log('Seeding data...');

  // 1. Create Classes
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .insert([
      { name: 'Mầm 1', room: 'R101', description: 'Lớp mầm dành cho trẻ 3 tuổi', del_yn: false },
      { name: 'Chồi 1', room: 'R201', description: 'Lớp chồi dành cho trẻ 4 tuổi', del_yn: false },
      { name: 'Lá 1', room: 'R301', description: 'Lớp lá dành cho trẻ 5 tuổi', del_yn: false },
    ])
    .select();

  if (classError) {
    console.error('Error seeding classes:', classError);
    // Continue even if error (maybe records already exist)
  }
  
  const { data: existingClasses } = await supabase.from('classes').select('id, name');
  if (!existingClasses || existingClasses.length === 0) {
    console.error('No classes found, cannot proceed');
    return;
  }

  const classId = existingClasses[0].id;
  console.log(`Using class: ${existingClasses[0].name} (${classId})`);

  // 2. Create Students
  const { data: students, error: studentError } = await supabase
    .from('students')
    .insert([
      { 
        full_name: 'Nguyễn Văn An', 
        student_code: `HS${Math.floor(Math.random() * 10000)}`, 
        class_id: classId, 
        gender: 'Male', 
        date_of_birth: '2020-01-01', 
        enrolled_date: '2023-09-01',
        del_yn: false 
      },
      { 
        full_name: 'Trần Thị Bình', 
        student_code: `HS${Math.floor(Math.random() * 10000)}`, 
        class_id: classId, 
        gender: 'Female', 
        date_of_birth: '2020-05-15', 
        enrolled_date: '2023-09-01',
        del_yn: false 
      },
    ])
    .select();

  if (studentError) {
    console.error('Error seeding students:', studentError);
  } else {
    console.log(`Created ${students.length} students`);
  }

  const { data: existingStudents } = await supabase.from('students').select('id, full_name');

  // 3. Create Parents
  const { data: parents, error: parentError } = await supabase
    .from('parents')
    .insert([
      { full_name: 'Nguyễn Văn Ba', phone: '0901234567', relationship: 'Father', del_yn: false },
      { full_name: 'Trần Thị Bốn', phone: '0907654321', relationship: 'Mother', del_yn: false },
    ])
    .select();

  if (parentError) {
    console.error('Error seeding parents:', parentError);
  } else {
    console.log(`Created ${parents.length} parents`);
  }

  const { data: existingParents } = await supabase.from('parents').select('id, full_name');

  // 4. Link Parents to Students
  if (existingStudents && existingParents && existingStudents.length >= 2 && existingParents.length >= 2) {
    const { error: linkError } = await supabase
      .from('student_parent')
      .insert([
        { student_id: existingStudents[0].id, parent_id: existingParents[0].id, relation_type: 'Father', is_primary: true },
        { student_id: existingStudents[1].id, parent_id: existingParents[1].id, relation_type: 'Mother', is_primary: true },
      ]);

    if (linkError) {
      console.error('Error linking parents:', linkError);
    } else {
      console.log('Linked parents to students');
    }
  }

  // 5. Create Fees
  if (existingStudents && existingStudents.length > 0) {
    const { error: feeError } = await supabase
      .from('fee_records')
      .insert([
        { 
          student_id: existingStudents[0].id, 
          class_id: classId, 
          title: 'Học phí tháng 10', 
          amount_vnd: 2000000, 
          paid_amount_vnd: 0, 
          status: 'unpaid', 
          month: 10, 
          school_year: '2024-2025',
          due_date: '2024-10-10'
        },
      ]);

    if (feeError) {
      console.error('Error seeding fees:', feeError);
    } else {
      console.log('Created fee records');
    }
  }

  // 6. Create Notifications
  const { error: notifError } = await supabase
    .from('notifications')
    .insert([
      { title: 'Thông báo họp phụ huynh', body: 'Kính mời phụ huynh tham gia buổi họp đầu năm vào chủ nhật tuần này.', kind: 'general', target_type: 'all' },
      { title: 'Nhắc nhở nộp học phí', body: 'Quý phụ huynh vui lòng hoàn tất học phí tháng 10 trước ngày 10/10.', kind: 'holiday', target_type: 'all' },
    ]);

  if (notifError) {
    console.error('Error seeding notifications:', notifError);
  } else {
    console.log('Created notifications');
  }

  console.log('Seed completed successfully!');
}

seed();
