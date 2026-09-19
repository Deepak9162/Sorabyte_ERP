import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./layouts/Layout";

// Code-split pages using React.lazy for optimized bundle chunking
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const ClassManagement = lazy(() => import("./pages/ClassManagement"));
const StudentList = lazy(() => import("./pages/student/StudentList"));
const AddStudent = lazy(() => import("./pages/student/AddStudent"));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile"));
const StudentIDCard = lazy(() => import("./pages/student/StudentIDCard"));
const BulkIDCards = lazy(() => import("./pages/student/BulkIDCards"));
const TeacherManagement = lazy(() => import("./pages/TeacherManagement"));
const Attendance = lazy(() => import("./pages/Attendance"));
const FeeCollection = lazy(() => import("./pages/FeeCollection"));
const FeeReports = lazy(() => import("./pages/FeeReports"));
const ClassAttendanceReport = lazy(() => import("./pages/ClassAttendanceReport"));
const StudentAttendanceDetail = lazy(() => import("./pages/StudentAttendanceDetail"));
const StudentAttendanceAnalysis = lazy(() => import("./pages/StudentAttendanceAnalysis"));
const SubjectMaster = lazy(() => import("./pages/SubjectMaster"));
const ClassSubjectMapping = lazy(() => import("./pages/ClassSubjectMapping"));
const TimetableManagement = lazy(() => import("./pages/TimetableManagement"));
const TeacherTimetableView = lazy(() => import("./pages/TeacherTimetableView"));
const StaffAttendanceAnalysis = lazy(() => import("./pages/StaffAttendanceAnalysis"));
const StaffCredentials = lazy(() => import("./pages/StaffCredentials"));
const StaffAttendanceHistory = lazy(() => import("./pages/admin/StaffAttendanceHistory"));
const MyAttendance = lazy(() => import("./pages/teacher/MyAttendance"));
const AdmissionRequestList = lazy(() => import("./pages/admission/AdmissionRequestList"));
const AdmissionRequestForm = lazy(() => import("./pages/admission/AdmissionRequestForm"));
const AdmissionRequestDetails = lazy(() => import("./pages/admission/AdmissionRequestDetails"));
const AdmissionDirectForm = lazy(() => import("./pages/admission/AdmissionDirectForm"));
const HolidayManagement = lazy(() => import("./pages/admin/HolidayManagement"));
const TeacherHomework = lazy(() => import("./pages/teacher/TeacherHomework"));
const AdminHomework = lazy(() => import("./pages/admin/AdminHomework"));
const MarksEntry = lazy(() => import("./pages/MarksEntry"));
const ExamDashboard = lazy(() => import("./pages/exams/ExamDashboard"));
const MonthlyResults = lazy(() => import("./pages/exams/MonthlyResults"));
const HalfYearlyResults = lazy(() => import("./pages/exams/HalfYearlyResults"));
const AnnualResults = lazy(() => import("./pages/exams/AnnualResults"));
const ResultAnalytics = lazy(() => import("./pages/exams/ResultAnalytics"));
const ExamManagement = lazy(() => import("./pages/exams/ExamManagement"));
const ExamScheduleAdmitCard = lazy(() => import("./pages/exams/ExamScheduleAdmitCard"));
const MarksCorrectionConsole = lazy(() => import("./pages/exams/MarksCorrectionConsole"));


const PageFallback = () => (
  <div className="h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
  </div>
);

// Protected Route Wrapper

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading)
    return <PageFallback />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/classes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ClassManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout>
                    <StudentList />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/students/bulk-idcards"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout>
                    <BulkIDCards />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/students/new"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout>
                    <AddStudent />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/students/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout>
                    <AddStudent />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/students/:studentId"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout>
                    <StudentProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/students/:studentId/idcard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout>
                    <StudentIDCard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Admission Requests Routes */}
            <Route
              path="/admissions/requests"
              element={
                <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                  <Layout>
                    <AdmissionRequestList />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admissions/requests/new"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <Layout>
                    <AdmissionRequestForm />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admissions/requests/direct"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout>
                    <AdmissionDirectForm />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admissions/requests/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <Layout>
                    <AdmissionRequestForm />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admissions/requests/details/:id"
              element={
                <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                  <Layout>
                    <AdmissionRequestDetails />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teachers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TeacherManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/credentials"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout>
                    <StaffCredentials />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Attendance />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/fees"
              element={
                <ProtectedRoute>
                  <Layout>
                    <FeeCollection />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports/fees"
              element={
                <ProtectedRoute>
                  <Layout>
                    <FeeReports />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports/attendance"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ClassAttendanceReport />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports/attendance/student/:studentId"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StudentAttendanceDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports/attendance/analysis/student/:studentId"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StudentAttendanceAnalysis />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports/attendance/analysis/staff/:teacherId"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout>
                    <StaffAttendanceAnalysis />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/academic/subjects"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SubjectMaster />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/academic/mappings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ClassSubjectMapping />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/academic/marks-entry"
              element={
                <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                  <Layout>
                    <MarksEntry />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/academic/exams/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                  <Layout>
                    <ExamDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/academic/exams/monthly-results"
              element={
                <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                  <Layout>
                    <MonthlyResults />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/academic/exams/half-yearly-results"
              element={
                <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                  <Layout>
                    <HalfYearlyResults />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/academic/exams/annual-results"
              element={
                <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                  <Layout>
                    <AnnualResults />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/academic/exams/analytics"
              element={
                <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                  <Layout>
                    <ResultAnalytics />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/academic/exams/management"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout>
                    <ExamManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/academic/exams/schedule-admitcards"
              element={
                <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                  <Layout>
                    <ExamScheduleAdmitCard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/academic/exams/corrections"
              element={
                <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                  <Layout>
                    <MarksCorrectionConsole />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/staff/attendance-history"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout>
                    <StaffAttendanceHistory />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/holidays"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout>
                    <HolidayManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/my-attendance"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <Layout>
                    <MyAttendance />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/homework"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <Layout>
                    <TeacherHomework />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/homework"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout>
                    <AdminHomework />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Default Redirect */}

            {/* Unauthorized Page */}

            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 - For now redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/academic/timetable"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TimetableManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/timetable"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TeacherTimetableView />
                  </Layout>
                </ProtectedRoute>
              }
            />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
