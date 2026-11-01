const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const screenshotsDir = path.resolve(__dirname, '../submission_documents/screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function capture() {
  console.log('Launching Chrome for screenshot capture...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // 1. Login Page
    console.log('1. Capturing Login Page...');
    await page.goto('http://localhost:4200/login', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(screenshotsDir, '01_login_page.png') });

    // 2. Perform Login
    console.log('2. Performing login...');
    await page.type('input[formcontrolname="username"], input[name="username"], input[type="text"]', 'hcl_student');
    await page.type('input[formcontrolname="password"], input[name="password"], input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // 3. Dashboard
    console.log('3. Capturing Dashboard...');
    await page.screenshot({ path: path.join(screenshotsDir, '02_dashboard.png') });

    // 4. Stock Detail & Interactive Chart
    console.log('4. Capturing Stock Detail (AAPL)...');
    await page.goto('http://localhost:4200/stocks/AAPL', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(screenshotsDir, '03_stock_detail_aapl.png') });

    // 5. Portfolio Page
    console.log('5. Capturing Portfolio Page...');
    await page.goto('http://localhost:4200/portfolio', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(screenshotsDir, '04_portfolio_management.png') });

    // 6. Trade Page
    console.log('6. Capturing Trade Execution Page...');
    await page.goto('http://localhost:4200/trade', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(screenshotsDir, '05_trade_execution.png') });

    // 7. Watchlist Page
    console.log('7. Capturing Watchlist Page...');
    await page.goto('http://localhost:4200/watchlist', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(screenshotsDir, '06_watchlist.png') });

    console.log('All screenshots captured successfully in submission_documents/screenshots!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

capture();
