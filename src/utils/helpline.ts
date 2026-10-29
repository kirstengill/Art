export function getWhatsAppHelplineUrl(message?: string): string | undefined {
  const href = import.meta.env.VITE_HELPLINE_WHATSAPP_URL;
  if (!href) return undefined;
  try {
    const url = new URL(href);
    const approvedHost =
      url.hostname === 'wa.me' ||
      url.hostname.endsWith('.wa.me') ||
      url.hostname === 'whatsapp.com' ||
      url.hostname.endsWith('.whatsapp.com');
    if (url.protocol !== 'https:' || !approvedHost) return undefined;
    if (message) url.searchParams.set('text', message);
    return url.toString();
  } catch {
    return undefined;
  }
}
