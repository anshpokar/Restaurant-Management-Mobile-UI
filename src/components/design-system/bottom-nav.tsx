import React from 'react';

interface BottomNavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function BottomNavItem({ icon, label, active = false, onClick }: BottomNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
        active ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <div className="mb-1">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

interface BottomNavProps {
  children: React.ReactNode;
}

export function BottomNav({ children }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-divider safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto overflow-x-auto px-2">
        {children}
      </div>
    </div>
  );
}
