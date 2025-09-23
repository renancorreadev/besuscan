import { useEffect, useState } from 'react';
import { Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAuthStore } from '@/stores/authStore';

export default function Register() {
    const { isAuthenticated } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Redirect if already authenticated
    if (isAuthenticated) {
        const from = location.state?.from?.pathname || '/login';
        return <Navigate to={from} replace />;
    }

    const handleRegisterSuccess = () => {
        setIsRedirecting(true);
        // Pequeno delay para garantir que o estado seja atualizado antes de navegar
        setTimeout(() => {
            navigate('/login');
        }, 100);
    };

    const handleSwitchToLogin = () => {
        setIsRedirecting(true);
        setTimeout(() => {
            navigate('/login');
        }, 100);
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"></div>

            {/* Floating Orbs */}
            <div className="absolute top-20 left-20 w-32 h-32 bg-blue-200/30 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute top-40 right-32 w-24 h-24 bg-indigo-200/40 rounded-full blur-lg animate-pulse delay-1000"></div>
            <div className="absolute bottom-32 left-32 w-40 h-40 bg-purple-200/20 rounded-full blur-2xl animate-pulse delay-2000"></div>
            <div className="absolute bottom-20 right-20 w-28 h-28 bg-blue-300/30 rounded-full blur-xl animate-pulse delay-500"></div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-md p-6">
                {/* Logo Section */}
                <div className="text-center mb-8">
                    <div className="mb-6">
                        <div className="relative">
                            <img
                                src="/BLogo.png"
                                alt="BesuScan"
                                className="w-24 h-24 mx-auto rounded-2xl object-contain shadow-lg"
                            />
                            {/* Glow effect */}
                            <div className="absolute inset-0 w-24 h-24 mx-auto rounded-2xl bg-blue-500/20 blur-xl"></div>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                        BesuScan
                    </h1>
                    <p className="text-gray-600 text-sm">
                        Besu Block Explorer
                    </p>
                </div>

                {/* Register Form - só mostra se não está redirecionando */}
                {!isRedirecting && (
                    <RegisterForm
                        onSuccess={handleRegisterSuccess}
                        onSwitchToLogin={handleSwitchToLogin}
                    />
                )}

                {/* Login Link - só mostra se não está redirecionando */}
                {!isRedirecting && (
                    <div className="text-center mt-6">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

