import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import RoleGuard from '@/components/auth/RoleGuard';

// ─── Eagerly loaded (always needed on app boot) ───────────────────────────────
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';

// ─── Lazy-loaded routes (split into separate JS chunks) ───────────────────────
// Each import() creates a separate chunk. Only loaded when first navigated to.
// Saves ~40% of initial JS bundle size.
const Students       = lazy(() => import('@/pages/Students'));
const StudentDetail  = lazy(() => import('@/pages/StudentDetail'));
const StudentForm    = lazy(() => import('@/pages/StudentForm'));
const Classes        = lazy(() => import('@/pages/Classes'));
const ClassDetail    = lazy(() => import('@/pages/ClassDetail'));
const ClassForm      = lazy(() => import('@/pages/ClassForm'));
const Teachers       = lazy(() => import('@/pages/Teachers'));
const TeacherForm    = lazy(() => import('@/pages/TeacherForm'));
const Attendance     = lazy(() => import('@/pages/Attendance'));
const Fees           = lazy(() => import('@/pages/Fees'));
const FeeForm        = lazy(() => import('@/pages/FeeForm'));
const Reports        = lazy(() => import('@/pages/Reports'));
const BulkPrintFees  = lazy(() => import('@/pages/BulkPrintFees'));
const Settings       = lazy(() => import('@/pages/Settings'));


// ─── Page loading skeleton ────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="space-y-4 p-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-lg" />
      <div className="h-4 w-72 bg-muted rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-xl mt-4" />
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<MainLayout />}>
            <Route path="/" element={allow(['Admin', 'Teacher', 'Accountant', 'Parent'], <Dashboard />)} />

            <Route path="/students"          element={allow(['Admin', 'Teacher', 'Accountant'], <Students />)} />
            <Route path="/students/new"      element={allow(['Admin', 'Teacher'], <StudentForm />)} />
            <Route path="/students/:id"      element={allow(['Admin', 'Teacher', 'Accountant'], <StudentDetail />)} />
            <Route path="/students/:id/edit" element={allow(['Admin', 'Teacher'], <StudentForm />)} />

            <Route path="/classes"           element={allow(['Admin', 'Teacher', 'Accountant'], <Classes />)} />
            <Route path="/classes/new"       element={allow(['Admin', 'Teacher'], <ClassForm />)} />
            <Route path="/classes/:id"       element={allow(['Admin', 'Teacher', 'Accountant'], <ClassDetail />)} />
            <Route path="/classes/:id/edit"  element={allow(['Admin', 'Teacher'], <ClassForm />)} />

            <Route path="/teachers"          element={allow(['Admin'], <Teachers />)} />
            <Route path="/teachers/new"      element={allow(['Admin'], <TeacherForm />)} />
            <Route path="/teachers/:id/edit" element={allow(['Admin'], <TeacherForm />)} />


            <Route path="/attendance"        element={allow(['Admin', 'Teacher'], <Attendance />)} />

            <Route path="/fees"              element={allow(['Admin', 'Accountant'], <Fees />)} />
            <Route path="/fees/new"          element={allow(['Admin', 'Accountant'], <FeeForm />)} />
            <Route path="/fees/:id/edit"     element={allow(['Admin', 'Accountant'], <FeeForm />)} />
            <Route path="/fees/print-bulk"   element={allow(['Admin', 'Accountant'], <BulkPrintFees />)} />

            <Route path="/reports"           element={allow(['Admin', 'Accountant'], <Reports />)} />

            <Route path="/settings"          element={allow(['Admin'], <Settings />)} />


          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
