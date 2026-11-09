import React, { useEffect, useState } from 'react';
import {
  getConnectionStatus,
  subscribeToNetworkStatus,
  type NetworkStatus,
} from '../../utils/networkStatus';

interface LoadingStatusIndicatorProps {
  navigating: boolean;
}

export const LoadingStatusIndicator: React.FC<LoadingStatusIndicatorProps> = ({
  navigating,
}) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() =>
    typeof navigator !== 'undefined' && navigator.onLine
      ? getConnectionStatus()
      : 'slow'
  );
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine
  );

  useEffect(() => {
    const updateConnection = () => {
      setIsOnline(navigator.onLine);
      setNetworkStatus(getConnectionStatus());
    };
    const unsubscribe = subscribeToNetworkStatus(setNetworkStatus);

    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    navigator.connection?.addEventListener('change', updateConnection);
    return () => {
      unsubscribe();
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
      navigator.connection?.removeEventListener('change', updateConnection);
    };
  }, []);

  const hasConnectionIssue = !isOnline || networkStatus === 'slow';

  const message = !isOnline
    ? 'No internet connection'
    : 'Slow connection — loading may take longer';

  if (navigating) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading page"
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black text-white"
      >
        <span aria-hidden="true" className="loading-dots loading-dots-large flex items-center gap-3">
          <span />
          <span />
          <span />
        </span>
      </div>
    );
  }

  if (!hasConnectionIssue) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed left-1/2 top-3 z-[200] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/15 bg-[#171614]/95 px-4 py-2.5 text-xs text-white shadow-xl backdrop-blur-md"
    >
      <span aria-hidden="true" className="loading-dots flex items-center gap-1">
        <span />
        <span />
        <span />
      </span>
      <span>{message}</span>
    </div>
  );
};
