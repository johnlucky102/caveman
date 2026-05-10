import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import RoleGuard from '@/components/auth/RoleGuard';

import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Students from '@/pages/Students';
import StudentDetail from '@/pages/StudentDetail';
import StudentForm from '@/pages/StudentForm';
import Classes from '@/pages/Classes';
import ClassDetail from '@/pages/ClassDetail';
import ClassForm from '@/pages/ClassForm';
import Teachers from '@/pages/Teachers';
import TeacherForm from '@/pages/TeacherForm';
import Parents from '@/pages/Parents';
import ParentForm from '@/pages/ParentForm';
import Attendance from '@/pages/Attendance';
import Fees from '@/pages/Fees';
import FeeForm from '@/pages/FeeForm';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import Notifications from '@/pages/Notifications';
import NotificationForm from '@/pages/NotificationForm';

function allow(roles: Array<'Admin' | 'Teacher' | 'Accountant' | 'Parent'>, element: JSX.Element) {
  return <RoleGuard allow={roles}>{element}</RoleGuard>;
}

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />


        <Route element={<MainLayout />}>
          <Route path="/" element={allow(['Admin', 'Teacher', 'Accountant', 'Parent'], <Dashboard />)} />

          <Route path="/students" element={allow(['Admin', 'Teacher', 'Accountant'], <Students />)} />
          <Route path="/students/new" element={allow(['Admin', 'Teacher'], <StudentForm />)} />
          <Route path="/students/:id" element={allow(['Admin', 'Teacher', 'Accountant'], <StudentDetail />)} />
          <Route path="/students/:id/edit" element={allow(['Admin', 'Teacher'], <StudentForm />)} />

          <Route path="/classes" element={allow(['Admin', 'Teacher', 'Accountant'], <Classes />)} />
          <Route path="/classes/new" element={allow(['Admin', 'Teacher'], <ClassForm />)} />
          <Route path="/classes/:id" element={allow(['Admin', 'Teacher', 'Accountant'], <ClassDetail />)} />
          <Route path="/classes/:id/edit" element={allow(['Admin', 'Teacher'], <ClassForm />)} />

          <Route path="/teachers" element={allow(['Admin'], <Teachers />)} />
          <Route path="/teachers/new" element={allow(['Admin'], <TeacherForm />)} />
          <Route path="/teachers/:id/edit" element={allow(['Admin'], <TeacherForm />)} />

          <Route path="/parents" element={allow(['Admin'], <Parents />)} />
          <Route path="/parents/new" element={allow(['Admin'], <ParentForm />)} />
          <Route path="/parents/:id/edit" element={allow(['Admin'], <ParentForm />)} />
          <Route path="/attendance" element={allow(['Admin', 'Teacher'], <Attendance />)} />
          <Route path="/fees" element={allow(['Admin', 'Accountant'], <Fees />)} />
          <Route path="/fees/new" element={allow(['Admin', 'Accountant'], <FeeForm />)} />
          <Route path="/fees/:id/edit" element={allow(['Admin', 'Accountant'], <FeeForm />)} />
          <Route path="/reports" element={allow(['Admin', 'Teacher', 'Accountant'], <Reports />)} />
          <Route path="/settings" element={allow(['Admin'], <Settings />)} />
          <Route path="/notifications" element={allow(['Admin', 'Teacher'], <Notifications />)} />
          <Route path="/notifications/new" element={allow(['Admin', 'Teacher'], <NotificationForm />)} />
          <Route path="/notifications/:id/edit" element={allow(['Admin', 'Teacher'], <NotificationForm />)} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
