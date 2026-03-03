import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import Dashboard from './pages/Dashboard'
import UITestingPage from './pages/UITestingPage'
import APITestingPage from './pages/APITestingPage'
import ReportsPage from './pages/ReportsPage'
import EnvironmentsPage from './pages/EnvironmentsPage'
import UsersPage from './pages/UsersPage'
import CreateTestCasesPage from './pages/CreateTestCasesPage'
import Layout from './components/Layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      
      <Route path="/app" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="ui-testing" element={<UITestingPage />} />
        <Route path="api-testing" element={<APITestingPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="create-testcases" element={<CreateTestCasesPage />} />
        <Route path="environments" element={<EnvironmentsPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
