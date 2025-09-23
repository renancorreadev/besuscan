import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const { isAuthenticated } = useAuthStore();
  const { dismiss } = useToast();
  const location = useLocation();

  // Fechar modal quando usuário se autenticar
  useEffect(() => {
    if (isAuthenticated) {
      dismiss();
      onClose();
    }
  }, [isAuthenticated, onClose, dismiss]);

  // SOLUÇÃO DEFINITIVA: Fechar modal quando a rota mudar
  useEffect(() => {
    // Se o modal estiver aberto, fechar imediatamente
    if (isOpen) {
      dismiss();
      setMode('login');
      onClose();
    }
  }, [location.pathname]); // Removido isOpen, dismiss e onClose das dependências

  // Resetar modo quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
    }
  }, [isOpen, defaultMode]);

  const handleSuccess = () => {
    dismiss();
    onClose();
  };

  const handleSwitchToLogin = () => {
    dismiss();
    setMode('login');
  };

  const handleSwitchToRegister = () => {
    setMode('register');
  };

  const handleClose = () => {
    dismiss();
    setMode('login');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {mode === 'login' ? 'Login' : 'Registro'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-center">
          {mode === 'login' ? (
            <LoginForm
              onSuccess={handleSuccess}
              onSwitchToRegister={handleSwitchToRegister}
            />
          ) : (
            <RegisterForm
              onSuccess={handleSuccess}
              onSwitchToLogin={handleSwitchToLogin}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

