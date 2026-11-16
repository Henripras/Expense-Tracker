import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
let html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

// Find JS and CSS in dist/assets
const assetsDir = path.join(distDir, 'assets');
const files = fs.readdirSync(assetsDir);
const jsFile = files.find(f => f.endsWith('.js'));
const cssFile = files.find(f => f.endsWith('.css'));

if (jsFile && cssFile) {
  const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
  const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');

  // Replace external css link with inline style
  html = html.replace(/<link rel="stylesheet"[^>]*href="[^"]*"[^>]*>/i, `<style>${cssContent}</style>`);
  
  // Replace module script with inline script (no type="module" CORS restrictions on file:///)
  html = html.replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/i, `<script>${jsContent}</script>`);

  // Inline logo.png as base64 if present
  const logoPath = path.resolve('public/logo.png');
  if (fs.existsSync(logoPath)) {
    const logoB64 = fs.readFileSync(logoPath).toString('base64');
    const logoDataUrl = `data:image/png;base64,${logoB64}`;
    html = html.replace(/src=["'](?:\.\/|\/)?logo\.png["']/g, `src="${logoDataUrl}"`);
    html = html.replace(/href=["'](?:\.\/|\/)?logo\.png["']/g, `href="${logoDataUrl}"`);
  }

  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.resolve('standalone.html'), html, 'utf8');
  console.log('Successfully generated standalone dist/index.html and standalone.html!');
} else {
  console.error('JS or CSS asset not found in dist/assets');
}
