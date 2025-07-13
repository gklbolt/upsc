import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ConnectionStatus } from './components/ui/ConnectionStatus';
import { ProtectedRoute } from './components/ui/ProtectedRoute';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { StudentDashboard } from './components/student/Dashboard';
import { SubjectView } from './components/student/SubjectView';
import { SectionView } from './components/student/SectionView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SubjectManagement } from './components/admin/SubjectManagement';
import { ModuleManagement } from './components/admin/ModuleManagement';
import { QuestionManagement } from './components/admin/QuestionManagement';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ConnectionStatus />
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Student Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requireStudent>
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/subjects/:subjectId" 
              element={
                <ProtectedRoute requireStudent>
                  <SubjectView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/subjects/:subjectId/modules/:moduleId/sections/:sectionId" 
              element={
                <ProtectedRoute requireStudent>
                  <SectionView />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/subjects" 
              element={
                <ProtectedRoute requireAdmin>
                  <SubjectManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/subjects/:subjectId" 
              element={
                <ProtectedRoute requireAdmin>
                  <ModuleManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/subjects/:subjectId/modules/:moduleId/sections/:sectionId/questions" 
              element={
                <ProtectedRoute requireAdmin>
                  <QuestionManagement />
                </ProtectedRoute>
              } 
            />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
          
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 2000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 1500,
              },
              error: {
                duration: 3000,
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;