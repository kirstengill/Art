import React from 'react';
import { Link } from 'react-router-dom';

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
              ArtVerse
            </Link>
            <p className="text-sm leading-relaxed max-w-md text-[#5C554C]">
              A contemporary digital fine-art gallery and collector community connecting
              independent ateliers, private collectors, and curatorial voices.
            </p>
            <p className="text-xs text-[#7A7267]">
              Sample artworks, studio profiles, and sample negotiations are labeled as
              curatorial demo content for review.
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
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#7A7267]">
          <p>© {new Date().getFullYear()} ArtVerse Fine Art Platform. All rights reserved.</p>
          <p>Antwerp · Pietrasanta · Stockholm · London · Zurich</p>
        </div>
      </div>
    </footer>
  );
};
