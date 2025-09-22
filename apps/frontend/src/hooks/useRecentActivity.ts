import { useState, useEffect } from 'react';
import { apiService, RecentActivity } from '../services/api';

interface UseRecentActivityReturn {
    activity: RecentActivity | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export const useRecentActivity = (): UseRecentActivityReturn => {
    const [activity, setActivity] = useState<RecentActivity | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchActivity = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiService.getRecentActivity();

            if (response.success) {
                setActivity(response.data);
            } else {
                setError('Erro ao carregar atividade recente');
            }
        } catch (err) {
            console.error('Erro ao buscar recent activity:', err);
            setError('Erro ao carregar atividade recente');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivity();
    }, []);

    const refetch = () => {
        fetchActivity();
    };

    return {
        activity,
        loading,
        error,
        refetch,
    };
};
