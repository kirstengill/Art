import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Brush, Compass, Users } from 'lucide-react';

const PILLARS = [
  {
    icon: Brush,
    title: 'A place for artists',
    body: 'Artists can build a studio presence, share original work, and tell the stories behind their creative practice.',
  },
  {
    icon: Compass,
    title: 'A way to discover',
    body: 'Explore a range of artistic practices and follow the work and ideas shared by the community.',
  },
  {
    icon: Users,
    title: 'A community for collectors',
    body: 'Collectors can discover artworks, learn about the artists, and make an inquiry about a work.',
  },
];

export const AboutPage: React.FC = () => (
  <div className="min-h-[65dvh] bg-[#FAF8F3] text-[#141312]">
    <section className="bg-[#1b1916] px-5 py-16 text-[#faf8f3] sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#d3b578]">Our platform</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium sm:text-6xl">
          About Louvre Singa
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
          Louvre Singa is a digital fine-art gallery and collector community. We connect artists
          sharing original work with people who want to discover, appreciate, and inquire about art.
        </p>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="grid gap-5 md:grid-cols-3">
        {PILLARS.map(({ icon: Icon, title, body }) => (
          <article key={title} className="rounded-2xl border border-[#E6DFD3] bg-white p-6 sm:p-7">
            <Icon aria-hidden="true" className="h-6 w-6 text-[#9E7B3B]" />
            <h2 className="mt-5 font-serif text-2xl font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-[#5C554C]">{body}</p>
          </article>
        ))}
      </div>

      <div className="mt-12 grid gap-8 border-t border-[#E6DFD3] pt-10 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="font-serif text-3xl font-semibold">Discover art and the people behind it</h2>
          <p className="mt-4 text-sm leading-7 text-[#5C554C]">
            Louvre Singa brings together artwork discovery, artist studios, exhibitions, and
            community conversations in one online space. The platform is designed to support a
            wider art community while making it easier to find and learn about original work.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-end">
          <Link to="/exhibitions" className="inline-flex items-center gap-2 rounded-lg bg-[#211f1a] px-5 py-3 text-xs font-semibold text-white hover:bg-[#3b3428]">
            Explore exhibitions <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link to="/signup" className="inline-flex items-center rounded-lg border border-[#B38B40] px-5 py-3 text-xs font-semibold text-[#5A4010] hover:bg-[#B38B40]/10">
            Join Louvre Singa
          </Link>
        </div>
      </div>
    </section>
  </div>
);
