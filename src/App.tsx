import { useEffect } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ParentConsentPage } from './pages/ParentConsentPage';
import { JobBoardPage } from './pages/JobBoardPage';
import { PostJobPage } from './pages/PostJobPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { ContractsPage } from './pages/ContractsPage';
import { ContractDetailPage } from './pages/ContractDetailPage';
import { MessagesPage } from './pages/MessagesPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';

const useHashRouting =
  import.meta.env.PROD ||
  (typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io'));

function AutostartHandler() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { enterDemoSession, userPrivate } = useAuth();
  const searchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const autostart = params.get('autostart') || searchParams?.get('autostart');
  const finishEmailSignIn =
    params.get('finishEmailSignIn') || searchParams?.get('finishEmailSignIn');

  useEffect(() => {
    if (autostart === '1' && !userPrivate) {
      enterDemoSession('teen');
    }
  }, [autostart, userPrivate, enterDemoSession]);

  useEffect(() => {
    if (finishEmailSignIn === '1') {
      navigate('/auth', { replace: true });
    }
  }, [finishEmailSignIn, navigate]);

  return null;
}

export default function App() {
  const Router = useHashRouting ? HashRouter : BrowserRouter;

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AutostartHandler />
          <Layout>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/parent-consent" element={<ParentConsentPage />} />
              <Route path="/jobs" element={<JobBoardPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/profile/:uid" element={<ProfilePage />} />

              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/jobs/new"
                element={
                  <ProtectedRoute requireActive>
                    <PostJobPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contracts"
                element={
                  <ProtectedRoute requireActive>
                    <ContractsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contracts/:id"
                element={
                  <ProtectedRoute requireActive>
                    <ContractDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute requireActive>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
