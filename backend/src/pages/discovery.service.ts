import { BadRequestException, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { PageSource } from '../entities/project-page.entity';

export type FoundPage = {
  url: string;
  path: string;
  title: string | null;
  source: PageSource;
};

const MAX_PAGES = 200; // pages returned
const MAX_FETCHES = 80; // HTML pages fetched while crawling
const MAX_SITEMAPS = 10;
const MAX_DEPTH = 2;
const MAX_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 5000;
const DEADLINE_MS = 40_000;
const BATCH = 6;
const ASSET =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|json|xml|txt|pdf|zip|gz|rar|mp4|webm|mp3|wav|woff2?|ttf|eot|docx?|xlsx?|pptx?)$/i;

// Absolute http(s) URL with no query, hash, credentials or trailing slash; null if it is not a web page link
export function normalizePageUrl(raw: string, base?: string | URL): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim(), base);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  url.hash = '';
  url.search = '';
  url.username = '';
  url.password = '';
  if (url.pathname.length > 1)
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url;
}

const bareHost = (host: string) => host.toLowerCase().replace(/^www\./, '');
export const sameSite = (a: URL, b: URL) =>
  bareHost(a.hostname) === bareHost(b.hostname);

// Loopback, private, link-local, carrier-grade NAT, multicast and reserved ranges
export function isPrivateAddress(ip: string): boolean {
  const mapped = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    return (
      v6 === '::' ||
      v6 === '::1' ||
      /^f[cd]/.test(v6) ||
      /^fe[89ab]/.test(v6) ||
      v6.startsWith('ff')
    );
  }
  return true;
}

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");

export function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = m ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim() : '';
  return title ? title.slice(0, 300) : null;
}

export function extractLinks(html: string): string[] {
  const links: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi))
    links.push(decodeEntities(m[1]));
  return links;
}

export function extractSitemapLocs(xml: string): {
  pages: string[];
  sitemaps: string[];
} {
  const locs = [...xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)].map((m) =>
    decodeEntities(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '')),
  );
  return /<sitemapindex/i.test(xml)
    ? { pages: [], sitemaps: locs }
    : { pages: locs, sitemaps: [] };
}

type Fetched = { url: URL; body: string; contentType: string };

// Finds the pages of a public website from its sitemap and by following its own links
@Injectable()
export class DiscoveryService {
  // Resolves the host and refuses private addresses, so discovery cannot reach internal services
  async assertPublicHost(hostname: string): Promise<void> {
    const host = hostname.replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host.endsWith('.localhost'))
      throw new BadRequestException('That address is not a public website.');
    const addresses = isIP(host)
      ? [host]
      : (
          (await lookup(host, { all: true }).catch(() => [])) as {
            address: string;
          }[]
        ).map((a) => a.address);
    if (!addresses.length)
      throw new BadRequestException(`Could not find the website ${hostname}.`);
    if (addresses.some(isPrivateAddress))
      throw new BadRequestException('That address is not a public website.');
  }

  // GET with a timeout and size cap; follows up to 3 redirects that stay on the same public site
  async fetchText(url: URL, site: URL): Promise<Fetched | null> {
    let current = url;
    for (let hop = 0; hop < 4; hop++) {
      await this.assertPublicHost(current.hostname);
      let res: Response;
      try {
        res = await fetch(current, {
          redirect: 'manual',
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: {
            'user-agent': 'FreelancePro-LinkDiscovery/1.0',
            accept: 'text/html,application/xml;q=0.9,*/*;q=0.5',
          },
        });
      } catch {
        return null;
      }
      if (res.status >= 300 && res.status < 400) {
        const next =
          res.headers.get('location') &&
          normalizePageUrl(res.headers.get('location')!, current);
        if (!next || !sameSite(next, site)) return null;
        current = next;
        continue;
      }
      if (!res.ok || !res.body) return null;
      if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES)
        return null;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > MAX_BYTES) {
            await reader.cancel();
            return null;
          }
          chunks.push(value);
        }
      } catch {
        return null;
      }
      return {
        url: current,
        body: Buffer.concat(chunks).toString('utf8'),
        contentType: res.headers.get('content-type') ?? '',
      };
    }
    return null;
  }

  async discover(liveUrl: string): Promise<FoundPage[]> {
    const site = normalizePageUrl(liveUrl);
    if (!site)
      throw new BadRequestException(
        'The project live URL is not a valid web address.',
      );
    await this.assertPublicHost(site.hostname);
    const deadline = Date.now() + DEADLINE_MS;
    const found = new Map<string, FoundPage>();
    const add = (raw: string, base: URL, source: PageSource): URL | null => {
      const url = normalizePageUrl(raw, base);
      if (
        !url ||
        !sameSite(url, site) ||
        ASSET.test(url.pathname) ||
        found.size >= MAX_PAGES
      )
        return null;
      const key = url.toString();
      if (!found.has(key))
        found.set(key, { url: key, path: url.pathname, title: null, source });
      return url;
    };

    // 1. Sitemaps: /sitemap.xml plus any listed in robots.txt, following sitemap indexes
    const sitemapQueue = [new URL('/sitemap.xml', site).toString()];
    const robots = await this.fetchText(new URL('/robots.txt', site), site);
    for (const m of robots?.body.matchAll(/^\s*sitemap:\s*(\S+)/gim) ?? [])
      sitemapQueue.push(m[1]);
    const seenSitemaps = new Set<string>();
    while (
      sitemapQueue.length &&
      seenSitemaps.size < MAX_SITEMAPS &&
      Date.now() < deadline
    ) {
      const next = normalizePageUrl(sitemapQueue.shift()!);
      if (!next || !sameSite(next, site) || seenSitemaps.has(next.toString()))
        continue;
      seenSitemaps.add(next.toString());
      const res = await this.fetchText(next, site);
      if (!res || !/<(urlset|sitemapindex)/i.test(res.body)) continue;
      const { pages, sitemaps } = extractSitemapLocs(res.body);
      sitemapQueue.push(...sitemaps);
      for (const page of pages) add(page, site, 'sitemap');
    }

    // 2. Crawl: follow same-site links from the live URL, two levels deep
    add(site.toString(), site, 'crawl');
    let frontier = [site];
    const visited = new Set<string>();
    for (let depth = 0; depth <= MAX_DEPTH && frontier.length; depth++) {
      const nextFrontier: URL[] = [];
      for (let i = 0; i < frontier.length; i += BATCH) {
        if (visited.size >= MAX_FETCHES || Date.now() > deadline) break;
        const batch = frontier
          .slice(i, i + BATCH)
          .filter((u) => !visited.has(u.toString()));
        batch.forEach((u) => visited.add(u.toString()));
        const pages = await Promise.all(
          batch.map((u) => this.fetchText(u, site)),
        );
        pages.forEach((page, idx) => {
          if (!page || !page.contentType.includes('text/html')) return;
          const entry = found.get(batch[idx].toString());
          if (entry && !entry.title) entry.title = extractTitle(page.body);
          for (const href of extractLinks(page.body)) {
            const before = found.size;
            const url = add(href, page.url, 'crawl');
            if (
              url &&
              depth < MAX_DEPTH &&
              (found.size > before || !visited.has(url.toString()))
            )
              nextFrontier.push(url);
          }
        });
      }
      const seen = new Set<string>();
      frontier = nextFrontier.filter((u) => {
        const key = u.toString();
        if (visited.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    return [...found.values()];
  }
}
