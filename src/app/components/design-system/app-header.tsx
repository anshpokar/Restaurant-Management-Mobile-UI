import React from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  showMenu?: boolean;
  onMenuClick?: () => void;
}

export function AppHeader({ 
  title, 
  showBack = false, 
  onBack, 
  actions,
  showMenu = false,
  onMenuClick 
}: AppHeaderProps) {
  return (
    <div className="sticky top-0 left-0 right-0 z-50 bg-card border-b border-divider">
      <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {showMenu && (
            <button
              onClick={onMenuClick}
              className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
