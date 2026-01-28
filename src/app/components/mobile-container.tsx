import React from 'react';

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileContainer({ children, className = '' }: MobileContainerProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto max-w-md min-h-screen ${className}`}>
        {children}
      </div>
    </div>
  );
}
