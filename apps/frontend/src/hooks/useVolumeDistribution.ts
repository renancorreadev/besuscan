import { useState, useEffect } from 'react';
import { apiService, VolumeDistribution } from '../services/api';

interface UseVolumeDistributionReturn {
    distribution: VolumeDistribution | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export const useVolumeDistribution = (period: string = '24h'): UseVolumeDistributionReturn => {
    const [distribution, setDistribution] = useState<VolumeDistribution | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDistribution = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiService.getVolumeDistribution(period);

            if (response.success) {
                setDistribution(response.data.distribution);
            } else {
                setError('Erro ao carregar distribuição de volume');
            }
        } catch (err) {
            console.error('Erro ao buscar volume distribution:', err);
            setError('Erro ao carregar distribuição de volume');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDistribution();
    }, [period]);

    const refetch = () => {
        fetchDistribution();
    };

    return {
        distribution,
        loading,
        error,
        refetch,
    };
};
