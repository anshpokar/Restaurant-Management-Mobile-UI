import { useState, useCallback, useRef } from 'react';

export interface GeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export function useGeocoder() {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Record<string, GeocodeResult[]>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setResults([]);
      return;
    }

    // Check cache
    if (cache.current[query]) {
      setResults(cache.current[query]);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&addressdetails=1`
        );

        if (!response.ok) {
          throw new Error('Geocoding service unavailable');
        }

        const data: GeocodeResult[] = await response.json();
        
        cache.current[query] = data;
        setResults(data);
      } catch (err: any) {
        console.error('Geocoding error:', err);
        setError(err.message || 'Failed to fetch results');
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce as per requirements
  }, []);

  return { search, results, loading, error };
}
