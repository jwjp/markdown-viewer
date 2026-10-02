import { strict as assert } from 'node:assert';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(pathToFileURL(resolve('docs/index.html')).href);
  await page.locator('#fileInput').setInputFiles({
    name: 'example.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Hello world\n\nA [link](https://example.com) and **bold** text.\n\n## Details\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n- [x] Complete\n- [ ] Next\n\n<script>window.hacked=true</script>')
  });
  await page.locator('#preview h1').waitFor();
  assert.equal(await page.locator('#preview h1').textContent(), 'Hello world');
  assert.equal(await page.locator('#outlineList a').count(), 2);
  assert.equal(await page.locator('#preview table').count(), 1);
  assert.equal(await page.locator('#preview input[type=checkbox]').count(), 2);
  assert.equal(await page.evaluate(() => window.hacked), undefined);
  assert.equal(await page.locator('#preview script').count(), 0);
  await page.locator('#languageSelect').selectOption('ko');
  assert.equal(await page.locator('#openButton').textContent(), '파일 열기');
  await page.locator('#searchInput').fill('bold');
  assert.equal(await page.locator('#searchCount').textContent(), '1/1');
  mkdirSync('.test-artifacts', { recursive: true });
  await page.screenshot({ path: '.test-artifacts/viewer-preview.png', fullPage: true });
  await page.locator('#sourceButton').click();
  assert.equal(await page.locator('#source').isVisible(), true);
  await page.locator('#themeButton').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.screenshot({ path: '.test-artifacts/viewer-smoke.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Browser smoke test passed.');
} finally {
  await browser.close();
}
