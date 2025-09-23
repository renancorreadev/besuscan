import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    User,
    LogOut,
    Key,
    Shield,
    Calendar,
    Mail,
    Loader2,
    Eye,
    EyeOff,
    Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { formatTimestamp } from '@/services/api';

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string()
        .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export function UserProfile() {
    const { user, logout, changePassword, isLoading, error, clearError } = useAuthStore();
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema),
    });

    const handleLogout = async () => {
        await logout();
    };

    const onSubmitChangePassword = async (data: ChangePasswordFormData) => {
        try {
            clearError();
            await changePassword({
                current_password: data.currentPassword,
                new_password: data.newPassword,
            });
            reset();
            setIsChangePasswordOpen(false);
        } catch (error) {
            // Erro já é tratado pelo store
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Informações do usuário */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <User className="h-5 w-5 text-blue-600" />
                        </div>
                        Informações do Usuário
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600">Username</Label>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                                <p className="text-lg font-semibold text-gray-900">{user.username}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600">Email</Label>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                                <p className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                                    <Mail className="h-4 w-4 text-gray-500" />
                                    {user.email}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600">Status</Label>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                        variant={user.is_active ? 'default' : 'secondary'}
                                        className={user.is_active ? 'bg-green-100 text-green-800 border-green-200' : ''}
                                    >
                                        {user.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                    {user.is_admin && (
                                        <Badge variant="destructive" className="flex items-center gap-1">
                                            <Shield className="h-3 w-3" />
                                            Admin
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600">Último Login</Label>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                                <p className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    {user.last_login ? formatTimestamp(user.last_login) : 'Nunca'}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Ações do usuário */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Settings className="h-5 w-5 text-orange-600" />
                        </div>
                        Ações
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        Gerencie sua conta e configurações
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="flex items-center gap-2 h-12 bg-white/60 backdrop-blur-sm border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                                >
                                    <Key className="h-4 w-4" />
                                    Alterar Senha
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl">
                                <DialogHeader className="pb-4">
                                    <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <div className="p-2 bg-orange-100 rounded-lg">
                                            <Key className="h-5 w-5 text-orange-600" />
                                        </div>
                                        Alterar Senha
                                    </DialogTitle>
                                </DialogHeader>

                                {error && (
                                    <div className="mb-4 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl">
                                        <p className="text-sm text-red-600">{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit(onSubmitChangePassword)} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                                            Senha Atual
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="currentPassword"
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                {...register('currentPassword')}
                                                disabled={isLoading}
                                                className="h-12 bg-white/60 backdrop-blur-sm border-white/30 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl transition-all duration-200 pr-12"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-gray-600"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                disabled={isLoading}
                                            >
                                                {showCurrentPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                        {errors.currentPassword && (
                                            <p className="text-sm text-red-500">{errors.currentPassword.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                                            Nova Senha
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="newPassword"
                                                type={showNewPassword ? 'text' : 'password'}
                                                {...register('newPassword')}
                                                disabled={isLoading}
                                                className="h-12 bg-white/60 backdrop-blur-sm border-white/30 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl transition-all duration-200 pr-12"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-gray-600"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                disabled={isLoading}
                                            >
                                                {showNewPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                        {errors.newPassword && (
                                            <p className="text-sm text-red-500">{errors.newPassword.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                                            Confirmar Nova Senha
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="confirmPassword"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                {...register('confirmPassword')}
                                                disabled={isLoading}
                                                className="h-12 bg-white/60 backdrop-blur-sm border-white/30 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl transition-all duration-200 pr-12"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-gray-600"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                disabled={isLoading}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                        {errors.confirmPassword && (
                                            <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsChangePasswordOpen(false)}
                                            disabled={isLoading}
                                            className="flex-1 h-12 bg-white/60 backdrop-blur-sm border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Alterando...
                                                </>
                                            ) : (
                                                <>
                                                    <Key className="mr-2 h-4 w-4" />
                                                    Alterar Senha
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Button
                            variant="destructive"
                            onClick={handleLogout}
                            disabled={isLoading}
                            className="flex items-center gap-2 h-12 bg-red-500/90 hover:bg-red-600 transition-all duration-200"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <LogOut className="h-4 w-4" />
                            )}
                            Sair
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
