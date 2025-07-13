import React, { useState, useEffect } from 'react';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check if Supabase environment variables are missing
  const supabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  if (!supabaseConfigured) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50">
        <div className="flex items-center justify-center space-x-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            Database connection not configured. Please contact support.
          </span>
        </div>
      </div>
    );
  }

  if (!isOnline && showOfflineMessage) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-white p-3 text-center z-50">
        <div className="flex items-center justify-center space-x-2">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">
            You're offline. Some features may not work properly.
          </span>
        </div>
      </div>
    );
  }

  return null;
}