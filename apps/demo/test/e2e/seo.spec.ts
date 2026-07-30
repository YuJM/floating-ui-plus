import {expect, test} from 'playwright/test';

import {DEFAULT_SITE, INDEXABLE_ROUTES} from '../../src/seo';

test('publishes complete canonical and social metadata', async ({page}) => {
  await page.goto('/');

  await expect(page).toHaveTitle(
    'Floating UI Plus Demos — Web Components & Vue',
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /interactive Web Components and Vue demos/i,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    `${DEFAULT_SITE}/`,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    `${DEFAULT_SITE}/`,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    `${DEFAULT_SITE}/og-image.png`,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );

  const source = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  const structuredData = JSON.parse(source ?? '{}') as {
    '@graph'?: Array<{'@type'?: string}>;
  };
  const types = structuredData['@graph']?.map((entry) => entry['@type']);
  expect(types).toContain('WebSite');
  expect(types).toContain('CollectionPage');
  expect(types).toContain('WebApplication');
});

test('gives every indexable demo a unique title, description, and canonical URL', async ({
  page,
}) => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const route of INDEXABLE_ROUTES) {
    await page.goto(route, {waitUntil: 'domcontentloaded'});

    const title = await page.title();
    const description =
      (await page
        .locator('meta[name="description"]')
        .getAttribute('content')) ?? '';
    const expectedCanonical = new URL(route, DEFAULT_SITE).href;

    expect(title.length).toBeGreaterThan(20);
    expect(description.length).toBeGreaterThan(70);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      expectedCanonical,
    );
    titles.add(title);
    descriptions.add(description);
  }

  expect(titles.size).toBe(INDEXABLE_ROUTES.length);
  expect(descriptions.size).toBe(INDEXABLE_ROUTES.length);
});

test('publishes crawl controls, sitemap, manifest, and a noindex 404', async ({
  page,
  request,
}) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(robots.headers()['content-type']).toMatch(/text\/plain/);
  expect(await robots.text()).toContain(
    `Sitemap: ${DEFAULT_SITE}/sitemap-index.xml`,
  );

  const sitemapIndex = await request.get('/sitemap-index.xml');
  expect(sitemapIndex.ok()).toBe(true);
  expect(await sitemapIndex.text()).toContain(`${DEFAULT_SITE}/sitemap-0.xml`);

  const sitemap = await request.get('/sitemap-0.xml');
  expect(sitemap.ok()).toBe(true);
  const sitemapSource = await sitemap.text();
  expect(sitemapSource).toContain(`${DEFAULT_SITE}/web-components/tooltip`);
  expect(sitemapSource).toContain(`${DEFAULT_SITE}/vue/examples/tooltip`);
  expect(sitemapSource).not.toContain(`${DEFAULT_SITE}/404`);
  expect(sitemapSource).not.toContain(`${DEFAULT_SITE}/web-components/hide`);

  const manifest = await request.get('/site.webmanifest');
  expect(manifest.ok()).toBe(true);
  expect(await manifest.json()).toMatchObject({
    name: 'Floating UI Plus Demos',
    start_url: '/',
  });

  const response = await page.goto('/missing-seo-route');
  expect(response?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  );
});
