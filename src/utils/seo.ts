import pageMetadata from '../data/seoPages.json';

type PageMetadata = {
  title: string;
  description: string;
  indexable: boolean;
};

const FALLBACK_METADATA: PageMetadata = {
  title: 'Louvre Singa',
  description: 'Louvre Singa is a digital fine-art gallery and collector community.',
  indexable: false,
};

function setMeta(attribute: 'name' | 'property', key: string, value: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`
  );
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = value;
}

function setCanonical(pathname: string): void {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.append(element);
  }
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  element.href = `https://louvresinga.com${path}`;
}

function setBreadcrumb(pathname: string): void {
  const existing = document.getElementById('route-structured-data');
  if (existing) existing.remove();
  if (pathname === '/') return;

  const route = pageMetadata[pathname as keyof typeof pageMetadata];
  if (!route) return;

  const script = document.createElement('script');
  script.id = 'route-structured-data';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
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
        name: route.title.split('|')[0].trim(),
        item: `https://louvresinga.com${pathname}`,
      },
    ],
  });
  document.head.append(script);
}

export function applyRouteMetadata(pathname: string): void {
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const metadata =
    pageMetadata[normalizedPath as keyof typeof pageMetadata] || FALLBACK_METADATA;
  document.title = metadata.title;
  setMeta('name', 'description', metadata.description);
  setMeta('name', 'robots', metadata.indexable ? 'index,follow,max-image-preview:large' : 'noindex,nofollow');
  setMeta('property', 'og:title', metadata.title);
  setMeta('property', 'og:description', metadata.description);
  setMeta('property', 'og:url', `https://louvresinga.com${normalizedPath}`);
  setMeta('property', 'og:type', 'website');
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', metadata.title);
  setMeta('name', 'twitter:description', metadata.description);
  setMeta('property', 'og:image', 'https://louvresinga.com/og-louvre-singa.png');
  setMeta('property', 'og:image:alt', 'Louvre Singa — Discover and Collect Fine Art in Uganda');
  setMeta('name', 'twitter:image', 'https://louvresinga.com/og-louvre-singa.png');
  setCanonical(normalizedPath);
  setBreadcrumb(normalizedPath);
}
