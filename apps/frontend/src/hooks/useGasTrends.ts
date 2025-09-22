import { useState, useEffect } from 'react';
import { apiService, GasTrend } from '../services/api';

interface UseGasTrendsReturn {
    trends: GasTrend[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export const useGasTrends = (days: number = 7): UseGasTrendsReturn => {
    const [trends, setTrends] = useState<GasTrend[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTrends = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiService.getGasTrends(days);

            if (response.success) {
                setTrends(response.data.trends);
            } else {
                setError('Erro ao carregar tendências de gas');
            }
        } catch (err) {
            console.error('Erro ao buscar gas trends:', err);
            setError('Erro ao carregar tendências de gas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrends();
    }, [days]);

    const refetch = () => {
        fetchTrends();
    };

    return {
        trends,
        loading,
        error,
        refetch,
    };
};
