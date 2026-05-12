import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import V1 from './pages/V1';
import FeedbackDashboard from './pages/Dashboard';
import Login from './pages/Login';
import { getAuthToken } from './config/api';

function ProtectedRoute({ children }) {
  return getAuthToken() ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<V1 />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <FeedbackDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
