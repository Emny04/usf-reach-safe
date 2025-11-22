import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Home, Users, MapPin, History, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">Safe Reach</span>
          </Link>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background">
        <div className="container mx-auto flex justify-around px-4 py-2">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${
              isActive('/') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>
          
          <Link
            to="/contacts"
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${
              isActive('/contacts') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Contacts</span>
          </Link>
          
          <Link
            to="/safe-places"
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${
              isActive('/safe-places') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <MapPin className="h-5 w-5" />
            <span className="text-xs">Places</span>
          </Link>
          
          <Link
            to="/history"
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${
              isActive('/history') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <History className="h-5 w-5" />
            <span className="text-xs">History</span>
          </Link>
          
          <Link
            to="/settings"
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${
              isActive('/settings') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};
