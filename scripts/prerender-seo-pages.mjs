import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pageMetadata from '../src/data/seoPages.json' with { type: 'json' };

const dist = path.resolve('dist');
const indexPath = path.join(dist, 'index.html');
const template = await readFile(indexPath, 'utf8');

const pageBodies = {
  '/': `
    <main class="min-h-[65dvh] bg-[#1b1916] px-5 py-20 text-white sm:px-8">
      <div class="mx-auto max-w-6xl">
        <p class="text-xs uppercase tracking-[0.3em] text-[#d3b578]">Fine art · Uganda</p>
        <h1 class="mt-4 max-w-3xl font-serif text-4xl sm:text-6xl">Discover and Collect Fine Art in Uganda</h1>
        <p class="mt-6 max-w-2xl text-sm leading-7 text-white/75">Louvre Singa is a digital fine-art gallery and collector community connecting artists who share original work with people who want to discover and inquire about art.</p>
        <nav class="mt-8 flex flex-wrap gap-5 text-sm">
          <a href="/about">About Louvre Singa</a>
          <a href="/exhibitions">Exhibitions</a>
          <a href="/community">Community journal</a>
          <a href="/gallery">Explore artworks</a>
        </nav>
      </div>
    </main>`,
  '/about': `
    <main class="min-h-[65dvh] bg-[#FAF8F3] text-[#141312]">
      <section class="bg-[#1b1916] px-5 py-16 text-white sm:px-8 sm:py-24">
        <div class="mx-auto max-w-6xl">
          <p class="text-[10px] uppercase tracking-[0.3em] text-[#d3b578]">Our platform</p>
          <h1 class="mt-4 max-w-3xl font-serif text-4xl sm:text-6xl">About Louvre Singa</h1>
          <p class="mt-6 max-w-2xl text-sm leading-7 text-white/70">Louvre Singa is a digital fine-art gallery and collector community. We connect artists sharing original work with people who want to discover, appreciate, and inquire about art.</p>
        </div>
      </section>
      <section class="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <h2 class="font-serif text-3xl">Discover art and the people behind it</h2>
        <p class="mt-4 max-w-3xl text-sm leading-7 text-[#5C554C]">Louvre Singa brings together artwork discovery, artist studios, exhibitions, and community conversations in one online space. Artists can share original work and collectors can learn about the people and practices behind it.</p>
        <p class="mt-6 flex flex-wrap gap-5 text-sm"><a href="/exhibitions">Explore exhibitions</a><a href="/community">Visit the community journal</a></p>
      </section>
    </main>`,
  '/exhibitions': `
    <main class="min-h-[65dvh] bg-[#FAF8F3] px-5 py-16 text-[#141312] sm:px-8">
      <div class="mx-auto max-w-6xl">
        <p class="text-xs uppercase tracking-[0.2em] text-[#8C6828]">Louvre Singa</p>
        <h1 class="mt-2 font-serif text-4xl sm:text-5xl">Art Exhibitions</h1>
        <p class="mt-5 max-w-2xl text-sm leading-7 text-[#5C554C]">Explore current and upcoming exhibitions from the Louvre Singa fine-art community, with artwork and curatorial notes from participating artists.</p>
        <a class="mt-7 inline-block text-sm underline underline-offset-4" href="/about">About Louvre Singa</a>
      </div>
    </main>`,
  '/community': `
    <main class="min-h-[65dvh] bg-[#FAF8F3] px-5 py-16 text-[#141312] sm:px-8">
      <div class="mx-auto max-w-6xl">
        <p class="text-xs uppercase tracking-[0.2em] text-[#8C6828]">Studio Journal & Collector Salon</p>
        <h1 class="mt-2 font-serif text-4xl sm:text-5xl">Community Dialogue</h1>
        <p class="mt-5 max-w-2xl text-sm leading-7 text-[#5C554C]">Read studio dispatches, exhibition notes, and conversations from the Louvre Singa art community.</p>
        <a class="mt-7 inline-block text-sm underline underline-offset-4" href="/about">About Louvre Singa</a>
      </div>
    </main>`,
};

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function escapeText(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function setMeta(html, attribute, key, content) {
  const selector = new RegExp(
    `<meta\\b(?=[^>]*\\b${attribute}=["']${key}["'])[^>]*>`,
    'i'
  );
  const element = `<meta ${attribute}="${key}" content="${escapeAttribute(content)}" />`;
  return selector.test(html)
    ? html.replace(selector, element)
    : html.replace('</head>', `    ${element}\n  </head>`);
}

function createBreadcrumb(pathname, title) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://louvresinga.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: title.split('|')[0].trim(),
        item: `https://louvresinga.com${pathname}`,
      },
    ],
  };
}

for (const [pathname, metadata] of Object.entries(pageMetadata)) {
  const canonical = `https://louvresinga.com${pathname}`;
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeText(metadata.title)}</title>`);
  html = setMeta(html, 'name', 'description', metadata.description);
  html = setMeta(html, 'name', 'robots', 'index,follow,max-image-preview:large');
  html = setMeta(html, 'property', 'og:title', metadata.title);
  html = setMeta(html, 'property', 'og:description', metadata.description);
  html = setMeta(html, 'property', 'og:url', canonical);
  html = setMeta(html, 'property', 'og:type', 'website');
  html = setMeta(html, 'property', 'og:image', 'https://louvresinga.com/og-louvre-singa.png');
  html = setMeta(html, 'property', 'og:image:alt', 'Louvre Singa — Discover and Collect Fine Art in Uganda');
  html = setMeta(html, 'property', 'og:image:width', '1200');
  html = setMeta(html, 'property', 'og:image:height', '630');
  html = setMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = setMeta(html, 'name', 'twitter:title', metadata.title);
  html = setMeta(html, 'name', 'twitter:description', metadata.description);
  html = setMeta(html, 'name', 'twitter:image', 'https://louvresinga.com/og-louvre-singa.png');
  html = html.replace(
    /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i,
    `<link rel="canonical" href="${canonical}" />`
  );
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${pageBodies[pathname]}</div>`
  );
  if (pathname !== '/') {
    html = html.replace(
      /<script type="application\/ld\+json" id="route-structured-data"><\/script>/,
      `<script type="application/ld+json" id="route-structured-data">${JSON.stringify(createBreadcrumb(pathname, metadata.title))}</script>`
    );
  }
  const outputDirectory = pathname === '/' ? dist : path.join(dist, pathname.slice(1));
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'index.html'), html);
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...Object.entries(pageMetadata)
    .filter(([, metadata]) => metadata.indexable)
    .map(([pathname]) => `  <url><loc>https://louvresinga.com${pathname}</loc></url>`),
  '</urlset>',
].join('\n');
await writeFile(path.join(dist, 'sitemap.xml'), sitemap);
await mkdir(path.join(dist, 'seo'), { recursive: true });
await copyFile(path.join(dist, 'robots.txt'), path.join(dist, 'seo', 'robots.txt'));
await copyFile(path.join(dist, 'sitemap.xml'), path.join(dist, 'seo', 'sitemap.xml'));

const socialCard = Buffer.from(`
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#181715"/>
        <stop offset="1" stop-color="#3a3020"/>
      </linearGradient>
      <radialGradient id="glow">
        <stop offset="0" stop-color="#d3b578" stop-opacity=".42"/>
        <stop offset="1" stop-color="#d3b578" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <circle cx="950" cy="320" r="330" fill="url(#glow)"/>
    <path d="M845 500 1045 130M900 510 1100 140M790 480 990 110" stroke="#d3b578" stroke-opacity=".22" stroke-width="2"/>
    <text x="88" y="215" fill="#d3b578" font-family="Georgia,serif" font-size="24" letter-spacing="8">FINE ART · UGANDA</text>
    <text x="84" y="310" fill="#faf8f3" font-family="Georgia,serif" font-size="68">Louvre Singa</text>
    <text x="88" y="380" fill="#e9e1d1" font-family="Arial,sans-serif" font-size="28">Discover and collect original art.</text>
    <text x="88" y="550" fill="#d3b578" font-family="Arial,sans-serif" font-size="18" letter-spacing="3">LOUVRESINGA.COM</text>
  </svg>
`);
await sharp(socialCard).png().toFile(path.join(dist, 'og-louvre-singa.png'));
