import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACT_DIR = '/Users/ankitrathore/.gemini/antigravity/brain/fabadb40-581e-46fa-ac59-84aef0570fb5';

async function checkResponsiveViews() {
  console.log('Testing mobile & tablet responsive views...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  // 1. Mobile Landing Page
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  const landingScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`Mobile Landing scrollWidth: ${landingScrollWidth} (Expected: 375)`);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot-mobile-landing.png'),
    fullPage: false
  });

  // 2. Mobile Dashboard (after clicking Demo)
  await page.click('#landingExploreDemoBtn');
  await new Promise(r => setTimeout(r, 800));

  const dashScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`Mobile Dashboard scrollWidth: ${dashScrollWidth} (Expected: 375)`);

  // Mobile Dashboard Viewport (First Screen)
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot-mobile-viewport.png'),
    fullPage: false
  });

  // Mobile Dashboard Full Page
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot-mobile-dashboard.png'),
    fullPage: true
  });

  // 3. Open Assistant chat drawer on mobile
  await page.click('#openChatBtn');
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot-mobile-chat.png'),
    fullPage: false
  });

  // Close chat drawer
  await page.click('#closeChatBtn');
  await new Promise(r => setTimeout(r, 400));

  // 4. Receipts History on Mobile
  await page.click('#navReceiptsBtn');
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot-mobile-receipts.png'),
    fullPage: false
  });

  // 5. Tablet Viewport (768x1024)
  console.log('Testing tablet view at 768x1024 (iPad)...');
  await page.setViewport({ width: 768, height: 1024, isMobile: true, hasTouch: true });
  await page.click('#navDashboardBtn');
  await new Promise(r => setTimeout(r, 500));

  const tabletScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`Tablet Dashboard scrollWidth: ${tabletScrollWidth} (Expected: 768)`);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'screenshot-tablet-dashboard.png'),
    fullPage: false
  });

  await browser.close();
  console.log('All responsive verification screenshots captured successfully!');
}

checkResponsiveViews().catch(err => {
  console.error('Responsive test failed:', err);
  process.exit(1);
});
