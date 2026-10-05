import { BadRequestException } from '@nestjs/common';
import {
  DiscoveryService,
  extractLinks,
  extractSitemapLocs,
  extractTitle,
  isPrivateAddress,
  normalizePageUrl,
  typedAddress,
} from './discovery.service';

describe('typedAddress', () => {
  it('reads full URLs, bare host names and paths', () => {
    expect(typedAddress(' https://a.test/x ')).toBe('https://a.test/x');
    expect(typedAddress('site.com/about')).toBe('https://site.com/about');
    expect(typedAddress('www.site.co.in')).toBe('https://www.site.co.in');
    expect(typedAddress('/about')).toBe('/about');
    expect(typedAddress('about-us')).toBe('/about-us');
  });
});

describe('normalizePageUrl', () => {
  it('drops query, hash, credentials and trailing slash', () => {
    expect(
      normalizePageUrl('https://u:p@Example.com/About/?x=1#top')?.toString(),
    ).toBe('https://example.com/About');
  });

  it('keeps the root slash and resolves relative links', () => {
    expect(normalizePageUrl('https://example.com/')?.toString()).toBe(
      'https://example.com/',
    );
    expect(
      normalizePageUrl('../team', 'https://example.com/about/us')?.toString(),
    ).toBe('https://example.com/team');
  });

  it('rejects non-web links', () => {
    expect(normalizePageUrl('mailto:a@b.c')).toBeNull();
    expect(normalizePageUrl('javascript:alert(1)')).toBeNull();
    expect(normalizePageUrl('not a url')).toBeNull();
  });
});

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('blocks %s', (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:4700::1111'])(
    'allows %s',
    (ip) => expect(isPrivateAddress(ip)).toBe(false),
  );
});

describe('HTML and sitemap parsing', () => {
  it('reads the title and anchor links', () => {
    const html =
      '<title> Tom &amp; Co\n Home </title><a class="x" href="/about">A</a><A HREF=\'contact?x=1\'>C</A><link href="/style.css">';
    expect(extractTitle(html)).toBe('Tom & Co Home');
    expect(extractLinks(html)).toEqual(['/about', 'contact?x=1']);
  });

  it('tells a sitemap index from a page sitemap', () => {
    expect(
      extractSitemapLocs(
        '<sitemapindex><sitemap><loc>https://a.com/s1.xml</loc></sitemap></sitemapindex>',
      ),
    ).toEqual({
      pages: [],
      sitemaps: ['https://a.com/s1.xml'],
    });
    expect(
      extractSitemapLocs(
        '<urlset><url><loc> https://a.com/x?a=1&amp;b=2 </loc></url></urlset>',
      ).pages,
    ).toEqual(['https://a.com/x?a=1&b=2']);
  });
});

describe('DiscoveryService.discover', () => {
  let service: DiscoveryService;
  const site: Record<string, { body: string; type?: string }> = {
    'https://shop.test/robots.txt': {
      body: 'Sitemap: https://shop.test/extra.xml',
      type: 'text/plain',
    },
    'https://shop.test/sitemap.xml': {
      body: '<urlset><url><loc>https://shop.test/pricing</loc></url><url><loc>http://shop.test/about</loc></url><url><loc>https://other.test/x</loc></url></urlset>',
      type: 'application/xml',
    },
    'https://shop.test/extra.xml': {
      body: '<urlset><url><loc>https://www.shop.test/blog/</loc></url></urlset>',
      type: 'application/xml',
    },
    'https://shop.test/': {
      body: '<title>Home</title><a href="/about">a</a><a href="https://evil.test/">e</a><a href="/logo.png">l</a><a href="mailto:x@y.z">m</a>',
    },
    'https://shop.test/about': {
      body: '<title>About us</title><a href="/team#x">t</a>',
    },
    'https://shop.test/team': {
      body: '<title>Team</title><a href="/deep">d</a>',
    },
    'https://shop.test/pricing': { body: '<title>Pricing</title>' },
  };

  beforeEach(() => {
    service = new DiscoveryService();
    jest.spyOn(service, 'assertPublicHost').mockResolvedValue();
    jest.spyOn(service, 'fetchText').mockImplementation(async (url: URL) => {
      const hit = site[url.toString()];
      return hit
        ? { url, body: hit.body, contentType: hit.type ?? 'text/html' }
        : null;
    });
  });

  it('merges sitemap and crawled pages on the same site, two levels deep', async () => {
    const pages = await service.discover('https://shop.test');
    const byPath = Object.fromEntries(pages.map((p) => [p.path, p]));
    expect(Object.keys(byPath).sort()).toEqual([
      '/',
      '/about',
      '/blog',
      '/deep',
      '/pricing',
      '/team',
    ]);
    expect(byPath['/pricing']).toMatchObject({
      source: 'sitemap',
      url: 'https://shop.test/pricing',
    });
    // http and www variants are listed once, under the site's own address
    expect(pages).toHaveLength(6);
    expect(byPath['/blog'].url).toBe('https://shop.test/blog');
    expect(byPath['/about']).toMatchObject({
      url: 'https://shop.test/about',
      title: 'About us',
    });
    expect(byPath['/'].title).toBe('Home');
    // /deep is three clicks away: listed but never fetched
    expect(service.fetchText).not.toHaveBeenCalledWith(
      new URL('https://shop.test/deep'),
      expect.anything(),
    );
  });

  it('refuses a live URL that is not a web address', async () => {
    await expect(service.discover('ftp://shop.test')).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('DiscoveryService.assertPublicHost', () => {
  const service = new DiscoveryService();

  it.each([
    'localhost',
    'app.localhost',
    '127.0.0.1',
    '[::1]',
    '169.254.169.254',
  ])('refuses %s', async (host) => {
    await expect(service.assertPublicHost(host)).rejects.toThrow(
      BadRequestException,
    );
  });
});
