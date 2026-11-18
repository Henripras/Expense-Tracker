import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
let html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

// Find JS, CSS, and Images in dist/assets
const assetsDir = path.join(distDir, 'assets');
const files = fs.readdirSync(assetsDir);
const jsFile = files.find(f => f.endsWith('.js'));
const cssFile = files.find(f => f.endsWith('.css'));

if (jsFile && cssFile) {
  const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
  const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');

  // Replace external css link with inline style (using replacer function so $ in css is not treated as replacement pattern)
  html = html.replace(/<link rel="stylesheet"[^>]*href="[^"]*"[^>]*>/i, () => `<style>${cssContent}</style>`);
  
  // Replace module script with inline script (using replacer function so $&, $' in minified js are not substituted)
  html = html.replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/i, () => `<script>${jsContent}</script>`);

  // Inline all image assets in dist/assets as base64
  const imageFiles = files.filter(f => f.match(/\.(png|jpe?g|svg|webp|ico|gif)$/i));
  imageFiles.forEach(imgFile => {
    const imgPath = path.join(assetsDir, imgFile);
    const ext = path.extname(imgFile).slice(1).toLowerCase();
    const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' ? 'image/jpeg' : (ext === 'gif' ? 'image/gif' : `image/${ext}`));
    const imgB64 = fs.readFileSync(imgPath).toString('base64');
    const dataUrl = `data:${mime};base64,${imgB64}`;
    
    // Replace all references in html or css/js
    const regex = new RegExp(`["']?(?:/|\\./)?assets/${imgFile.replace('.', '\\.')}["']?`, 'g');
    html = html.replace(regex, () => `"${dataUrl}"`);
  });

  // Also replace any remaining /logo.png references
  const logoPath = path.resolve('public/logo.png');
  if (fs.existsSync(logoPath)) {
    const logoB64 = fs.readFileSync(logoPath).toString('base64');
    const logoDataUrl = `data:image/png;base64,${logoB64}`;
    html = html.replace(/src=["'](?:\.\/|\/)?logo\.png["']/g, () => `src="${logoDataUrl}"`);
    html = html.replace(/href=["'](?:\.\/|\/)?logo\.png["']/g, () => `href="${logoDataUrl}"`);
  }

  // Also replace any /opener.gif references with inlined base64 GIF
  const openerPath = path.resolve('public/opener.gif');
  if (fs.existsSync(openerPath)) {
    const openerB64 = fs.readFileSync(openerPath).toString('base64');
    const openerDataUrl = `data:image/gif;base64,${openerB64}`;
    html = html.replace(/src=["'](?:\.\/|\/)?opener\.gif["']/g, () => `src="${openerDataUrl}"`);
  }

  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.resolve('standalone.html'), html, 'utf8');

  // Also sync directly to workspace root for instant Live Server access
  const rootIndex = path.resolve('../index.html');
  const rootExpense = path.resolve('../Expense Tracker.html');
  try {
    fs.writeFileSync(rootIndex, html, 'utf8');
    fs.writeFileSync(rootExpense, html, 'utf8');
  } catch (e) {}

  console.log('Successfully generated standalone dist/index.html and standalone.html with inlined base64 images!');
} else {
  console.error('JS or CSS asset not found in dist/assets');
}
