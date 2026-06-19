import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { authApi } from './api/photos';
import Gallery from './pages/Gallery';
import PhotoDetail from './pages/PhotoDetail';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Init from './pages/Init';
import { useSiteFavicon } from './hooks/useSiteFavicon';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const statusQuery = useQuery({
    queryKey: ['init-status'],
    queryFn: authApi.getInitStatus,
    retry: 1,
  });

  if (statusQuery.data && !statusQuery.data.initialized) {
    return <Navigate to="/init" replace />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  useSiteFavicon();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/photo/:id" element={<PhotoDetail />} />
        <Route path="/init" element={<Init />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
