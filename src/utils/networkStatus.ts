export type NetworkStatus = 'normal' | 'slow';

interface NetworkInformation extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
  }
}

const NETWORK_STATUS_EVENT = 'artivora:network-status';
const SLOW_REQUEST_THRESHOLD_MS = 2500;
let slowRequestCount = 0;

function emitNetworkStatus(status: NetworkStatus): void {
  window.dispatchEvent(new CustomEvent<NetworkStatus>(NETWORK_STATUS_EVENT, { detail: status }));
}

export function subscribeToNetworkStatus(
  listener: (status: NetworkStatus) => void
): () => void {
  const handleStatus = (event: Event) => {
    listener((event as CustomEvent<NetworkStatus>).detail);
  };
  window.addEventListener(NETWORK_STATUS_EVENT, handleStatus);
  return () => window.removeEventListener(NETWORK_STATUS_EVENT, handleStatus);
}

export function getConnectionStatus(): NetworkStatus {
  const connection = navigator.connection;
  if (
    connection?.effectiveType === 'slow-2g' ||
    connection?.effectiveType === '2g' ||
    (connection?.downlink !== undefined && connection.downlink < 0.8) ||
    (connection?.rtt !== undefined && connection.rtt > 500)
  ) {
    return 'slow';
  }
  return 'normal';
}

export function trackApiRequest(): () => void {
  let markedSlow = false;
  let finished = false;
  const timer = window.setTimeout(() => {
    if (finished) return;
    markedSlow = true;
    slowRequestCount += 1;
    emitNetworkStatus('slow');
  }, SLOW_REQUEST_THRESHOLD_MS);

  return () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timer);
    if (!markedSlow) return;

    slowRequestCount = Math.max(0, slowRequestCount - 1);
    if (slowRequestCount === 0) emitNetworkStatus('normal');
  };
}

export function reportNetworkIssue(): void {
  emitNetworkStatus('slow');
}

export function reportNetworkRecovery(): void {
  if (slowRequestCount === 0) emitNetworkStatus('normal');
}
