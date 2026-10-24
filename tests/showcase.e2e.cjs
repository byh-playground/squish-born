const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const createStaticServer = require('./static-server.cjs');

async function main() {
  const root = path.resolve(__dirname, '..');
  const server = createStaticServer({ root });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/#/showcase';
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] });
    for (const viewport of [{ width: 1280, height: 800 }, { width: 844, height: 390 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      const response = await page.goto(url, { waitUntil: 'load', timeout: 40000 });
      assert.equal(response.status(), 200);
      await page.locator('#bloom-showcase:not([hidden])').waitFor({ state: 'visible', timeout: 28000 });
      await page.locator('#bloom-showcase iframe').waitFor({ state: 'attached' });
      await page.waitForFunction(() => {
        const win = document.querySelector('#bloom-showcase iframe')?.contentWindow;
        return win?.BloomHatchery?.inspect?.().simulation?.state === 'running';
      }, null, { timeout: 25000 });
      await page.waitForFunction(() => {
        const win = document.querySelector('#bloom-showcase iframe')?.contentWindow;
        return (win?.BloomHatchery?.inspect?.().simulation?.time ?? 0) > 2;
      }, null, { timeout: 25000 });
      const box = await page.locator('#bloom-showcase [data-action="close"]').boundingBox();
      assert.ok(box && box.width >= 40 && box.height >= 40);
      await page.locator('#bloom-showcase [data-action="close"]').click();
      assert.equal(await page.locator('#bloom-showcase').isHidden(), true);
      const profile = await page.evaluate(() => BloomHatchery.inspect().profile);
      assert.equal(profile.shells, 0);
      assert.deepEqual(profile.records, { hatches: 0, perfect: 0, bestWave: 0, wins: 0 });
      assert.deepEqual(errors, [], 'No JavaScript errors while opening and closing the isolated intro');
      console.log('PASS showcase desktop/mobile', JSON.stringify(viewport));
      await page.close();
    }
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
