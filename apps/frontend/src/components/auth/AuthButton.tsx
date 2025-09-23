import { useState } from 'react';
import { User, LogIn, LogOut, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { AuthModal } from './AuthModal';
import { UserProfile } from './UserProfile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function AuthButton() {
    const { user, isAuthenticated, logout, isLoading } = useAuthStore();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
    };

    if (!isAuthenticated) {
        return (
            <>
                <Button
                    variant="outline"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-2 h-10 px-4 bg-white/60 backdrop-blur-sm border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                    <LogIn className="h-4 w-4" />
                    Entrar
                </Button>

                <AuthModal
                    isOpen={isAuthModalOpen}
                    onClose={() => setIsAuthModalOpen(false)}
                />
            </>
        );
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="flex items-center gap-2 h-10 px-4 bg-white/60 backdrop-blur-sm border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                    >
                        <div className="p-1 bg-blue-100 rounded-full">
                            <User className="h-3 w-3 text-blue-600" />
                        </div>
                        <span className="font-medium">{user?.username}</span>
                        {user?.is_admin && (
                            <Badge variant="destructive" className="ml-1 text-xs px-2 py-0.5">
                                Admin
                            </Badge>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-white/95 backdrop-blur-xl border border-white/20 shadow-xl">
                    <DropdownMenuLabel className="px-3 py-3">
                        <div className="flex flex-col space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-100 rounded-full">
                                    <User className="h-3 w-3 text-blue-600" />
                                </div>
                                <p className="text-sm font-medium leading-none text-gray-900">{user?.username}</p>
                                {user?.is_admin && (
                                    <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                        Admin
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs leading-none text-gray-500 ml-6">
                                {user?.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-200/50" />
                    <DropdownMenuItem
                        onClick={() => setIsProfileOpen(true)}
                        className="px-3 py-2.5 hover:bg-blue-50 focus:bg-blue-50 transition-colors duration-150"
                    >
                        <Settings className="mr-3 h-4 w-4 text-gray-600" />
                        <span className="text-gray-700">Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-200/50" />
                    <DropdownMenuItem
                        onClick={handleLogout}
                        disabled={isLoading}
                        className="px-3 py-2.5 text-red-600 hover:bg-red-50 focus:bg-red-50 transition-colors duration-150"
                    >
                        {isLoading ? (
                            <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                        ) : (
                            <LogOut className="mr-3 h-4 w-4" />
                        )}
                        <span>Sair</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl">
                    <DialogHeader className="pb-4">
                        <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <User className="h-5 w-5 text-blue-600" />
                            </div>
                            Perfil do Usuário
                        </DialogTitle>
                    </DialogHeader>
                    <UserProfile />
                </DialogContent>
            </Dialog>
        </>
    );
}
