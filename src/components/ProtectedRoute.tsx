import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Where to send the user after they sign in. Kept in localStorage so it survives
 * the Google round trip and magic links opened in a new tab; expires after 15 min.
 */
const RETURN_KEY = 'auth_return_to';
const RETURN_TTL_MS = 15 * 60 * 1000;

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const here = `${location.pathname}${location.search}`;
    if (here !== '/') {
      try { localStorage.setItem(RETURN_KEY, JSON.stringify({ path: here, at: Date.now() })); } catch { /* storage unavailable */ }
    }
    return <Navigate to="/auth" replace />;
  }

  const returnTo = takeReturnTo();
  if (returnTo && returnTo !== `${location.pathname}${location.search}`) {
    return <Navigate to={returnTo} replace />;
  }

  return <>{children}</>;
}

function takeReturnTo(): string | null {
  try {
    const raw = localStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    localStorage.removeItem(RETURN_KEY);
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number };
    if (!path || !at || Date.now() - at > RETURN_TTL_MS) return null;
    return path.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch {
    return null;
  }
}
