import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

// Common Chrome/Edge paths on Windows
const possiblePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

let executablePath = '';
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    executablePath = p;
    break;
  }
}

if (!executablePath) {
  console.error('Error: Could not find Google Chrome or Microsoft Edge installed on your system.');
  process.exit(1);
}

console.log('Using browser executable at:', executablePath);

const SIZES = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 }
];

const generateIcons = async () => {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true
  });
  const page = await browser.newPage();

  const getSvgHtml = (isRound) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          background: transparent;
          overflow: hidden;
        }
        svg {
          width: 100vw;
          height: 100vh;
        }
      </style>
    </head>
    <body>
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#818cf8" />
            <stop offset="100%" stop-color="#10b981" />
          </linearGradient>
        </defs>
        <!-- Background Shape -->
        <rect x="5" y="5" width="90" height="90" rx="${isRound ? 45 : 24}" fill="#1e1b4b" stroke="url(#logo-grad)" stroke-width="4"/>
        <path d="M25 65 L45 50 L65 55 L75 35" stroke="#10b981" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
        <path d="M70 35 H75 V40" stroke="#10b981" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
        <path d="M35 30 H65 M35 48 H55 M35 30 V70" stroke="#818cf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </body>
    </html>
  `;

  for (const item of SIZES) {
    const resDir = path.resolve('android/app/src/main/res', item.dir);
    if (!fs.existsSync(resDir)) {
      fs.mkdirSync(resDir, { recursive: true });
    }

    // 1. Generate regular ic_launcher.png
    await page.setViewport({ width: item.size, height: item.size, deviceScaleFactor: 1 });
    await page.setContent(getSvgHtml(false));
    let screenshotPath = path.join(resDir, 'ic_launcher.png');
    await page.screenshot({ path: screenshotPath, omitBackground: true });
    console.log(`Generated regular icon: ${screenshotPath} (${item.size}x${item.size})`);

    // 2. Generate round ic_launcher_round.png
    await page.setContent(getSvgHtml(true));
    screenshotPath = path.join(resDir, 'ic_launcher_round.png');
    await page.screenshot({ path: screenshotPath, omitBackground: true });
    console.log(`Generated round icon: ${screenshotPath} (${item.size}x${item.size})`);
  }

  await browser.close();
  console.log('All launcher icons generated successfully!');
};

generateIcons().catch(err => {
  console.error('Error generating launcher icons:', err);
  process.exit(1);
});
