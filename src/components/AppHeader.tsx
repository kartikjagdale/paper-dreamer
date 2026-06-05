import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Clock, Home, Settings } from 'lucide-react';

export function AppHeader() {
  const location = useLocation();

  return (
    <header className="bg-white border-b border-border px-6 py-4 flex items-center gap-3 sticky top-0 z-50">
      <div className="w-8 h-8 rounded-[6px] bg-steel text-white flex items-center justify-center">
        <BookOpen className="w-[18px] h-[18px]" />
      </div>
      <h1 className="font-serif font-medium text-xl tracking-tight text-ink">
        Paper Dreamer
      </h1>
      <nav className="ml-auto flex items-center gap-1">
        <Link
          to="/"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            location.pathname === '/'
              ? 'text-steel bg-steel-light'
              : 'text-muted hover:text-ink hover:bg-fog'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          Home
        </Link>
        <Link
          to="/history"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            location.pathname === '/history'
              ? 'text-steel bg-steel-light'
              : 'text-muted hover:text-ink hover:bg-fog'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          History
        </Link>
        <Link
          to="/settings"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            location.pathname === '/settings'
              ? 'text-steel bg-steel-light'
              : 'text-muted hover:text-ink hover:bg-fog'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </Link>
      </nav>
    </header>
  );
}
