import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { getCurrentUser, isLoading } = useAuthStore();

  useEffect(() => {
    // Verificar autenticação ao inicializar a aplicação
    getCurrentUser();
  }, [getCurrentUser]);

  // Mostrar loading enquanto verifica autenticação inicial
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

