import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ShoppingBag, Twitter } from 'lucide-react';

const HELPLINE_LINKS = [
  {
    label: 'WhatsApp',
    href: import.meta.env.VITE_HELPLINE_WHATSAPP_URL,
    icon: MessageCircle,
    domains: ['wa.me', 'whatsapp.com'],
  },
  {
    label: 'X / Twitter',
    href: import.meta.env.VITE_HELPLINE_X_URL,
    icon: Twitter,
    domains: ['x.com', 'twitter.com'],
  },
  {
    label: 'Etsy',
    href: import.meta.env.VITE_HELPLINE_ETSY_URL,
    icon: ShoppingBag,
    domains: ['etsy.com'],
  },
].flatMap(({ href, domains, ...link }) => {
  if (!href) return [];
  try {
    const url = new URL(href);
    const isApprovedHost = domains.some(
      (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );
    return url.protocol === 'https:' && isApprovedHost ? [{ ...link, href }] : [];
  } catch {
    return [];
  }
});

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#F3EFE6] border-t border-[#E6DFD3] text-[#5C554C]">
      <div className="max-w-[1360px] mx-auto px-5 sm:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-[#E6DFD3]">
          <div className="md:col-span-2 space-y-3">
            <Link
              to="/"
              className="font-serif text-2xl font-semibold text-[#141312] tracking-wide inline-block hover:text-[#B38B40] transition-colors"
            >
              Art Universe
            </Link>
            <p className="text-sm leading-relaxed max-w-md text-[#5C554C]">
              A contemporary digital fine-art gallery and collector community connecting
              independent ateliers, private collectors, and curatorial voices.
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            <h3 className="font-serif text-base font-semibold text-[#141312]">
              Collecting & Exhibition
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/gallery" className="hover:text-[#141312] transition-colors">
                  Artwork Gallery
                </Link>
              </li>
              <li>
                <Link to="/artists" className="hover:text-[#141312] transition-colors">
                  Represented & Studio Artists
                </Link>
              </li>
              <li>
                <Link to="/community" className="hover:text-[#141312] transition-colors">
                  Studio Journal & Feed
                </Link>
              </li>
              <li>
                <Link to="/messages" className="hover:text-[#141312] transition-colors">
                  Private Negotiations
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 text-sm">
            <h3 className="font-serif text-base font-semibold text-[#141312]">
              For Artists & Collectors
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="hover:text-[#141312] transition-colors">
                  Artist Studio Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/add-artwork"
                  className="hover:text-[#141312] transition-colors"
                >
                  Publish New Artwork
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#141312] transition-colors">
                  Collector & Artist Sign In
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-[#141312] transition-colors">
                  Create Membership Account
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 text-sm">
            <h3 className="font-serif text-base font-semibold text-[#141312]">
              Helpline
            </h3>
            <p className="text-xs leading-relaxed">
              Connect with Art Universe through our configured social channels.
            </p>
            <div className="flex flex-wrap gap-2">
              {HELPLINE_LINKS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open Art Universe on ${label}`}
                  title={label}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D8D0C1] text-[#5C554C] transition-colors hover:border-[#B38B40] hover:bg-white hover:text-[#141312] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B38B40]"
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </a>
              ))}
            </div>
            {HELPLINE_LINKS.length < 3 && (
              <p className="text-[11px] text-[#7A7267]">
                {HELPLINE_LINKS.length === 0
                  ? 'Social links will appear when configured.'
                  : 'Some social links are not configured yet.'}
              </p>
            )}
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#7A7267]">
          <p>© {new Date().getFullYear()} Art Universe Fine Art Platform. All rights reserved.</p>
          <p>Antwerp · Pietrasanta · Stockholm · London · Zurich</p>
        </div>
      </div>
    </footer>
  );
};
