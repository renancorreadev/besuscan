import { API_BASE_URL } from './api';

export interface User {
    id: number;
    username: string;
    email: string;
    is_active: boolean;
    is_admin: boolean;
    last_login?: string;
    created_at: string;
    updated_at: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    expires_at: string;
    user: User;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface ChangePasswordRequest {
    current_password: string;
    new_password: string;
}

class AuthService {
    private tokenKey = 'besuscan_token';
    private userKey = 'besuscan_user';

    // Login
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro no login');
            }

            if (data.success) {
                const { token, user } = data.data;

                // Salvar token e usuário no localStorage
                this.setToken(token);
                this.setUser(user);

                return data.data;
            }

            throw new Error(data.message || 'Erro no login');
        } catch (error: any) {
            if (error.message) {
                throw new Error(error.message);
            }
            throw new Error('Erro de conexão. Tente novamente.');
        }
    }

    // Registro
    async register(userData: RegisterRequest): Promise<User> {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro no registro');
            }

            if (data.success) {
                return data.data;
            }

            throw new Error(data.message || 'Erro no registro');
        } catch (error: any) {
            if (error.message) {
                throw new Error(error.message);
            }
            throw new Error('Erro de conexão. Tente novamente.');
        }
    }

    // Logout
    async logout(): Promise<void> {
        try {
            const token = this.getToken();
            if (token) {
                // Tentar fazer logout no servidor
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                });
            }
        } catch (error) {
            // Ignorar erros de logout no servidor
            console.warn('Erro ao fazer logout no servidor:', error);
        } finally {
            // Sempre limpar dados locais
            this.clearAuth();
        }
    }

    // Obter informações do usuário atual
    async getCurrentUser(): Promise<User | null> {
        try {
            const token = this.getToken();
            if (!token) {
                return null;
            }

            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const user = data.data;
                this.setUser(user);
                return user;
            }

            return null;
        } catch (error) {
            // Token inválido ou expirado
            this.clearAuth();
            return null;
        }
    }

    // Alterar senha
    async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
        try {
            const token = this.getToken();
            if (!token) {
                throw new Error('Token não encontrado');
            }

            const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(passwordData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao alterar senha');
            }

            if (!data.success) {
                throw new Error(data.message || 'Erro ao alterar senha');
            }
        } catch (error: any) {
            if (error.message) {
                throw new Error(error.message);
            }
            throw new Error('Erro de conexão. Tente novamente.');
        }
    }

    // Renovar token
    async refreshToken(): Promise<LoginResponse> {
        try {
            const token = this.getToken();
            if (!token) {
                throw new Error('Token não encontrado');
            }

            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao renovar token');
            }

            if (data.success) {
                const { token: newToken, user } = data.data;

                // Atualizar token e usuário
                this.setToken(newToken);
                this.setUser(user);

                return data.data;
            }

            throw new Error(data.message || 'Erro ao renovar token');
        } catch (error: any) {
            // Se falhar, limpar autenticação
            this.clearAuth();
            throw new Error('Sessão expirada. Faça login novamente.');
        }
    }

    // Verificar se está autenticado
    isAuthenticated(): boolean {
        const token = this.getToken();
        const user = this.getUser();
        return !!(token && user);
    }

    // Verificar se é admin
    isAdmin(): boolean {
        const user = this.getUser();
        return user?.is_admin || false;
    }

    // Obter token
    getToken(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    // Definir token
    setToken(token: string): void {
        localStorage.setItem(this.tokenKey, token);
    }

    // Obter usuário
    getUser(): User | null {
        const userStr = localStorage.getItem(this.userKey);
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch {
                return null;
            }
        }
        return null;
    }

    // Definir usuário
    setUser(user: User): void {
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    // Limpar autenticação
    clearAuth(): void {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }

    // Obter headers de autenticação
    getAuthHeaders(): Record<string, string> {
        const token = this.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
}

export const authService = new AuthService();
