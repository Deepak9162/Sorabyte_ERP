import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./layouts/Layout";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ClassManagement from "./pages/ClassManagement";
import StudentList from "./pages/student/StudentList";
import AddStudent from "./pages/student/AddStudent";
import StudentProfile from "./pages/student/StudentProfile";
import StudentIDCard from "./pages/student/StudentIDCard";
import BulkIDCards from "./pages/student/BulkIDCards";
import TeacherManagement from "./pages/TeacherManagement";
import Attendance from "./pages/Attendance";
import FeeCollection from "./pages/FeeCollection";
import ClassAttendanceReport from "./pages/ClassAttendanceReport";
import StudentAttendanceDetail from "./pages/StudentAttendanceDetail";
import StudentAttendanceAnalysis from "./pages/StudentAttendanceAnalysis";
import SubjectMaster from "./pages/SubjectMaster";
import ClassSubjectMapping from "./pages/ClassSubjectMapping";
import TimetableManagement from "./pages/TimetableManagement";
import TeacherTimetableView from "./pages/TeacherTimetableView";
import StaffAttendanceAnalysis from "./pages/StaffAttendanceAnalysis";
import StaffCredentials from "./pages/StaffCredentials";
import StaffAttendanceHistory from "./pages/admin/StaffAttendanceHistory";
import MyAttendance from "./pages/teacher/MyAttendance";
import AdmissionRequestList from "./pages/admission/AdmissionRequestList";
import AdmissionRequestForm from "./pages/admission/AdmissionRequestForm";
import AdmissionRequestDetails from "./pages/admission/AdmissionRequestDetails";

// Protected Route Wrapper

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );

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
              path="/teacher/my-attendance"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <Layout>
                    <MyAttendance />
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
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
