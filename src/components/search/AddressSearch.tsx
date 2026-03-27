import React, { useState, useEffect } from 'react';
import { Search, MapPin, X, AlertCircle } from 'lucide-react';
import { useGeocoder, GeocodeResult } from '../../hooks/useGeocoder';
import { isWithinRadius } from '../../utils/distance';
import { Button } from '../design-system/button';
import { Input } from '../design-system/input';
import { Card } from '../design-system/card';
import { toast } from 'sonner';

const RESTAURANT_LAT = 19.1669;
const RESTAURANT_LNG = 73.2359;
const RADIUS_KM = 5;

interface AddressSearchProps {
  onSelect: (result: GeocodeResult, isWithinZone: boolean) => void;
  initialValue?: string;
}

export function AddressSearch({ onSelect, initialValue = '' }: AddressSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { search, results, loading, error } = useGeocoder();

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.length >= 3) {
        search(query);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [query, search]);

  const handleSelect = (result: GeocodeResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    const isWithinZone = isWithinRadius(RESTAURANT_LAT, RESTAURANT_LNG, lat, lon, RADIUS_KM);
    
    if (!isWithinZone) {
      toast.warning('Address is outside the 5km delivery radius!', {
        description: 'Orders outside this zone may not be accepted.'
      });
    }

    setQuery(result.display_name);
    setShowSuggestions(false);
    onSelect(result, isWithinZone);
  };

  return (
    <div className="relative w-full space-y-2">
      <div className="relative">
        <Input
          placeholder="Search for your delivery address..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          className="pl-12 h-14 pr-12"
          onFocus={() => setShowSuggestions(true)}
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
        
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {loading && (
        <div className="absolute z-50 left-0 right-0 top-full mt-2 p-4 bg-card border rounded-xl shadow-xl flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground">Searching locations...</span>
        </div>
      )}

      {showSuggestions && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-card border rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(result)}
              className="w-full text-left p-4 hover:bg-muted transition-colors flex items-start gap-3 border-b border-divider last:border-0"
            >
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground line-clamp-1">
                  {result.display_name.split(',')[0]}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {result.display_name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {error && query.length >= 3 && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm mt-2">
          <AlertCircle className="w-4 h-4" />
          <span>Error loading results. Please try again.</span>
        </div>
      )}
    </div>
  );
}
