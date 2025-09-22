import { useState, useEffect, useCallback } from 'react';
import { apiService, EventsResponse, EventResponse, EventSummary, Event, EventStatsResponse } from '@/services/api';

export interface UseEventsOptions {
  limit?: number;
  page?: number;
  order?: 'asc' | 'desc';
  autoFetch?: boolean;
}

export interface UseEventsReturn {
  events: EventSummary[];
  loading: boolean;
  error: string | null;
  pagination: EventsResponse['pagination'] | null;
  fetchEvents: (options?: UseEventsOptions) => Promise<void>;
  searchEvents: (filters: any) => Promise<void>;
  setCustomEvents: (events: EventSummary[], pagination: EventsResponse['pagination']) => void;
}

export interface UseEventDetailsOptions {
  id: string;
  autoFetch?: boolean;
}

export interface UseEventDetailsReturn {
  event: Event | null;
  loading: boolean;
  error: string | null;
  fetchEvent: () => Promise<void>;
}

export interface UseEventStatsReturn {
  stats: EventStatsResponse['data'] | null;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export const useEvents = (options: UseEventsOptions = {}): UseEventsReturn => {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<EventsResponse['pagination'] | null>(null);

  const fetchEvents = useCallback(async (fetchOptions?: UseEventsOptions) => {
    const params = { ...options, ...fetchOptions };
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getEvents({
        limit: params.limit || 10,
        page: params.page || 1,
        order: params.order || 'desc'
      });
      
      if (response.success) {
        setEvents(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to fetch events');
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching events');
    } finally {
      setLoading(false);
    }
  }, [options]);

  const searchEvents = useCallback(async (filters: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.searchEvents(filters);
      
      if (response.success) {
        setEvents(response.data);
        setPagination(response.pagination || null);
      } else {
        setError('Failed to search events');
      }
    } catch (err) {
      console.error('Error searching events:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while searching events');
    } finally {
      setLoading(false);
    }
  }, []);

  const setCustomEvents = useCallback((customEvents: EventSummary[], customPagination: EventsResponse['pagination']) => {
    setEvents(customEvents);
    setPagination(customPagination || null);
  }, []);

  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchEvents();
    }
  }, [fetchEvents, options.autoFetch]);

  return {
    events,
    loading,
    error,
    pagination,
    fetchEvents,
    searchEvents,
    setCustomEvents
  };
};

export const useEventDetails = (options: UseEventDetailsOptions): UseEventDetailsReturn => {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = useCallback(async () => {
    if (!options.id) {
      setError('Event ID is required');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getEvent(options.id);
      
      if (response.success) {
        setEvent(response.data);
      } else {
        setError('Event not found');
      }
    } catch (err) {
      console.error('Error fetching event:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching the event');
    } finally {
      setLoading(false);
    }
  }, [options.id]);

  useEffect(() => {
    if (options.autoFetch && options.id) {
      fetchEvent();
    }
  }, [fetchEvent, options.autoFetch, options.id]);

  return {
    event,
    loading,
    error,
    fetchEvent
  };
};

export const useEventStats = (): UseEventStatsReturn => {
  const [stats, setStats] = useState<EventStatsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getEventStats();
      
      if (response.success) {
        setStats(response.data);
      } else {
        setError('Failed to fetch event statistics');
      }
    } catch (err) {
      console.error('Error fetching event stats:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    fetchStats
  };
}; 