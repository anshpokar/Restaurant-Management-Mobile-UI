import React from 'react';

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function MobileContainer({ children, className = '', fullWidth = false }: MobileContainerProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto ${fullWidth ? 'w-full' : 'max-w-md'} min-h-screen ${className}`}>
        {children}
      </div>
    </div>
  );
}
