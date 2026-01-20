import { Search, Bell, TrendingUp, LogOut, MessageSquare, User, LogIn, GitMerge } from 'lucide-react';
import { Input } from './ui/input';
import { ThemeToggle } from './ThemeToggle';
import { ProfileModal } from './ProfileModal';
import { NotifyMeModal } from './NotifyMeModal';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { buildApiUrl, API_CONFIG } from '../config/api';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLogout: () => void;
  onLoginClick: () => void;
  onFixDataClick?: () => void;
  isAuthenticated: boolean;
  userEmail?: string;
}

export function Header({ searchQuery, onSearchChange, onLogout, onLoginClick, onFixDataClick, isAuthenticated, userEmail }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifyMeOpen, setIsNotifyMeOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated && userEmail) {
      fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.PROFILE}?email=${encodeURIComponent(userEmail)}`))
        .then(res => res.json())
        .then(data => {
          if (data && Object.keys(data).length > 0) {
            setUserProfile(data);
          }
        })
        .catch(console.error);
    } else {
      setUserProfile(null);
    }
  }, [isAuthenticated, userEmail]);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary overflow-hidden">
              <img
                src="/IPO_RADAR_Logo.png"
                alt="IPO Radar Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">IPO Radar</h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search IPOs..."
                className="pl-10 w-80 bg-input-background border-border"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>



            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full hover:opacity-80 transition-opacity"
                    title="Profile Settings"
                  >
                    <Avatar className="h-9 w-9 border border-border">
                      {/* Add AvatarImage here if available in userProfile */}
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(userProfile?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2">
                  <div className="px-2 py-2">
                    <p className="font-semibold text-sm">{userProfile?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {userProfile?.email || 'user@example.com'}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsNotifyMeOpen(true)} className="cursor-pointer">
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Notify Me</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <a href="mailto:vaibhavn056@gmail.com">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Contact Us</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-500 focus:text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
            )}

            <ThemeToggle />


          </div>
        </div>
      </header>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        initialProfile={userProfile}
        onSave={setUserProfile}
      />

      <NotifyMeModal
        isOpen={isNotifyMeOpen}
        onClose={() => setIsNotifyMeOpen(false)}
        userEmail={userProfile?.email}
      />
    </>
  );
}