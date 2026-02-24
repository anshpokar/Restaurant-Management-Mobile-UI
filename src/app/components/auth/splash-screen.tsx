import React, { useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onTimeout?: () => void;
}

export function SplashScreen({ onTimeout }: SplashScreenProps) {
  useEffect(() => {
    if (onTimeout) {
      const timer = setTimeout(onTimeout, 2000);
      return () => clearTimeout(timer);
    }
  }, [onTimeout]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary via-primary to-accent p-8">
      <div className="text-center">
        <div className="flex items-center justify-center w-24 h-24 mx-auto mb-6 bg-secondary rounded-3xl shadow-2xl">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">NAVRATNA</h1>
        <p className="text-white/90 text-lg">Dine • Deliver • Reserve</p>

        <div className="mt-12">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

