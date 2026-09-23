'use client';

import React from 'react';
import { Wifi, WifiOff, X, ShieldCheck } from 'lucide-react';
import { useNetworkStatus } from '@/context/NetworkContext';

export const NetworkBanner: React.FC = () => {
  const { networkStatus, isBannerDismissed, dismissBanner } = useNetworkStatus();

  if (networkStatus === 'online' || isBannerDismissed) {
    return null;
  }

  const isOffline = networkStatus === 'offline';
  const isReconnected = networkStatus === 'reconnected';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full py-2 px-4 transition-all duration-300 select-none border-b ${
        isOffline
          ? 'bg-warning/15 border-warning/30 text-warning'
          : 'bg-success/15 border-success/30 text-success'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1 rounded-lg bg-surface/60 border border-current shrink-0">
            {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          </div>

          <div className="min-w-0">
            {isOffline ? (
              <p className="font-semibold text-text-primary truncate">
                <span className="font-bold text-warning mr-1">Offline Mode:</span>
                Workouts, posture coaching, and meal logging are operating locally on your device.
              </p>
            ) : (
              <p className="font-semibold text-text-primary truncate">
                <span className="font-bold text-success mr-1">Connection Restored:</span>
                Online connectivity re-established.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {isOffline && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-text-muted">
              <ShieldCheck className="w-3 h-3 text-success" />
              <span>100% On-Device</span>
            </span>
          )}

          <button
            type="button"
            onClick={dismissBanner}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface/50 transition-colors"
            aria-label="Dismiss network banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
