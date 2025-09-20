

import React, { useContext } from 'react';
import { BrainCircuitIcon, MoonIcon, SunIcon, SearchIcon } from './Icons';
import { ThemeContext } from '../index';
import { mockUsers } from '../services/mockData';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isDashboardVisible: boolean;
}

const Header: React.FC<HeaderProps> = ({ searchQuery, onSearchChange, isDashboardVisible }) => {
  const themeContext = useContext(ThemeContext);

  if (!themeContext) {
    // Should not happen if App is wrapped in ThemeProvider
    return null; 
  }

  const { theme, setTheme } = themeContext;

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-20">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-shrink-0">
          <BrainCircuitIcon className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">TechDoc<span className="text-primary">AI</span></h1>
        </div>

        <div className="flex-1 flex justify-center px-4 min-w-0">
          {isDashboardVisible && (
            <div className="w-full max-w-lg relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                <SearchIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="search"
                name="search"
                id="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-input rounded-md leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm transition-colors"
                placeholder="Search documents..."
                aria-label="Search documents"
              />
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0 flex items-center gap-x-2">
            {!isDashboardVisible && (
              <div className="flex items-center -space-x-2" title="This document is shared with the team">
                {mockUsers.slice(0, 3).map(user => (
                  <img
                    key={user.id}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-background"
                    src={user.avatarUrl}
                    alt={user.name}
                    title={user.name}
                  />
                ))}
                {mockUsers.length > 3 && (
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted ring-2 ring-background text-xs font-medium text-muted-foreground">
                    +{mockUsers.length - 3}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-ring transition-colors"
            >
              {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;