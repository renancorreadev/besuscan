import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, User, LoginRequest, RegisterRequest, ChangePasswordRequest } from '../services/auth';

interface AuthState {
    // Estado
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Ações
    login: (credentials: LoginRequest) => Promise<void>;
    register: (userData: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    getCurrentUser: () => Promise<void>;
    changePassword: (passwordData: ChangePasswordRequest) => Promise<void>;
    clearError: () => void;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Estado inicial
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            // Ações
            login: async (credentials: LoginRequest) => {
                set({ isLoading: true, error: null });

                try {
                    const response = await authService.login(credentials);

                    set({
                        user: response.user,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                } catch (error: any) {
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: error.message || 'Erro no login',
                    });
                    throw error;
                }
            },

            register: async (userData: RegisterRequest) => {
                set({ isLoading: true, error: null });

                try {
                    await authService.register(userData);

                    set({
                        isLoading: false,
                        error: null,
                    });
                } catch (error: any) {
                    set({
                        isLoading: false,
                        error: error.message || 'Erro no registro',
                    });
                    throw error;
                }
            },

            logout: async () => {
                set({ isLoading: true, error: null });

                try {
                    await authService.logout();
                } catch (error) {
                    // Ignorar erros de logout
                    console.warn('Erro no logout:', error);
                } finally {
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: null,
                    });
                }
            },

            getCurrentUser: async () => {
                set({ isLoading: true, error: null });

                try {
                    const user = await authService.getCurrentUser();

                    if (user) {
                        set({
                            user,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                        });
                    } else {
                        set({
                            user: null,
                            isAuthenticated: false,
                            isLoading: false,
                            error: null,
                        });
                    }
                } catch (error: any) {
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: error.message || 'Erro ao verificar autenticação',
                    });
                }
            },

            changePassword: async (passwordData: ChangePasswordRequest) => {
                set({ isLoading: true, error: null });

                try {
                    await authService.changePassword(passwordData);

                    set({
                        isLoading: false,
                        error: null,
                    });
                } catch (error: any) {
                    set({
                        isLoading: false,
                        error: error.message || 'Erro ao alterar senha',
                    });
                    throw error;
                }
            },

            clearError: () => {
                set({ error: null });
            },

            setLoading: (loading: boolean) => {
                set({ isLoading: loading });
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

// Hook para verificar se o usuário é admin
export const useIsAdmin = () => {
    const user = useAuthStore((state) => state.user);
    return user?.is_admin || false;
};

// Hook para obter informações do usuário atual
export const useCurrentUser = () => {
    return useAuthStore((state) => state.user);
};

// Hook para verificar se está autenticado
export const useIsAuthenticated = () => {
    return useAuthStore((state) => state.isAuthenticated);
};
