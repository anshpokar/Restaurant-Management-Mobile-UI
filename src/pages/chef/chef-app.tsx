import { Outlet } from 'react-router-dom';
import { ChefHat, LogOut } from 'lucide-react';
import { Profile } from '@/lib/supabase';

interface ChefAppProps {
  onLogout: () => void;
  profile: Profile | null;
}

export function ChefApp({ onLogout, profile }: ChefAppProps) {
  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-black text-primary tracking-tighter">
            RESTO<span className="text-foreground">FLOW</span> CHEF
          </h2>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold text-sm bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
          >
            <ChefHat className="w-5 h-5" />
            Kitchen Dashboard
          </button>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="mb-4 px-4 py-3 bg-muted/50 rounded-xl">
            <p className="text-xs font-black text-muted-foreground uppercase mb-1">Active Chef</p>
            <p className="font-bold text-foreground truncate">{profile?.full_name || 'Chef Staff'}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-destructive hover:bg-destructive/10 rounded-xl transition-colors font-bold text-sm"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      <Outlet context={{ onLogout, profile }} />
    </div>
  );
}
