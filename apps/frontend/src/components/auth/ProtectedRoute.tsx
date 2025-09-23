import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
    const { isAuthenticated, user, getCurrentUser, isLoading } = useAuthStore();
    const location = useLocation();

    useEffect(() => {
        // Verificar autenticação quando o componente monta
        if (!isAuthenticated && !isLoading) {
            getCurrentUser();
        }
    }, [isAuthenticated, isLoading, getCurrentUser]);

    // Mostrar loading enquanto verifica autenticação
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-muted-foreground">Verificando autenticação...</p>
                </div>
            </div>
        );
    }

    // Redirecionar para login se não autenticado
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Verificar se precisa de privilégios de admin
    if (requireAdmin && !user?.is_admin) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Acesso Negado</h1>
                    <p className="text-muted-foreground">
                        Você precisa de privilégios de administrador para acessar esta página.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
