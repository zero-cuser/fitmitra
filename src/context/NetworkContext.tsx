'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type NetworkStatus = 'online' | 'offline' | 'reconnected';

interface NetworkContextValue {
  isOnline: boolean;
  networkStatus: NetworkStatus;
  dismissBanner: () => void;
  isBannerDismissed: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: true,
  networkStatus: 'online',
  dismissBanner: () => {},
  isBannerDismissed: false
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('online');
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialOnline = navigator.onLine ?? true;
    setIsOnline(initialOnline);
    setNetworkStatus(initialOnline ? 'online' : 'offline');

    let reconnectTimer: NodeJS.Timeout | null = null;

    const handleOnline = () => {
      setIsOnline(true);
      setNetworkStatus('reconnected');
      setIsBannerDismissed(false);

      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        setNetworkStatus('online');
      }, 4500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkStatus('offline');
      setIsBannerDismissed(false);

      if (reconnectTimer) clearTimeout(reconnectTimer);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const dismissBanner = () => {
    setIsBannerDismissed(true);
  };

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        networkStatus,
        dismissBanner,
        isBannerDismissed
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkStatus = () => useContext(NetworkContext);
