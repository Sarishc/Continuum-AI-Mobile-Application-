/**
 * Continuum AI — App Icon Generator
 * Usage: node generate-icon.js
 * Requires: npm install canvas --save-dev
 *
 * Generates assets/icon.png (1024×1024) and assets/splash.png (1284×2778)
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background — deep navy
  ctx.fillStyle = '#03060F';
  ctx.fillRect(0, 0, size, size);

  // Subtle radial gradient center glow
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.55);
  grad.addColorStop(0, 'rgba(56, 139, 253, 0.18)');
  grad.addColorStop(1, 'rgba(56, 139, 253, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // "C" letterform
  const fontSize = size * 0.55;
  ctx.font = `${fontSize}px serif`;
  ctx.fillStyle = '#388BFD';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Blue glow
  ctx.shadowColor = '#388BFD';
  ctx.shadowBlur = size * 0.08;
  ctx.fillText('C', size / 2, size / 2 + size * 0.02);

  return canvas;
}

function drawSplash() {
  const W = 1284, H = 2778;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#03060F';
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
  grad.addColorStop(0, 'rgba(56, 139, 253, 0.12)');
  grad.addColorStop(1, 'rgba(56, 139, 253, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const iconSize = 180;
  ctx.font = `${iconSize}px serif`;
  ctx.fillStyle = '#388BFD';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#388BFD';
  ctx.shadowBlur = 40;
  ctx.fillText('C', W / 2, H / 2 - 20);

  ctx.font = '48px sans-serif';
  ctx.fillStyle = 'rgba(230, 237, 243, 0.7)';
  ctx.shadowBlur = 0;
  ctx.fillText('Continuum AI', W / 2, H / 2 + 100);

  return canvas;
}

const outDir = path.join(__dirname);

const icon = drawIcon(1024);
fs.writeFileSync(path.join(outDir, 'icon.png'), icon.toBuffer('image/png'));
fs.writeFileSync(path.join(outDir, 'adaptive-icon.png'), icon.toBuffer('image/png'));
console.log('✓ icon.png + adaptive-icon.png written');

const splash = drawSplash();
fs.writeFileSync(path.join(outDir, 'splash.png'), splash.toBuffer('image/png'));
console.log('✓ splash.png written');

// ─── Notification icon (Android: white on transparent, 96×96) ─────────────────

function generateNotificationIcon() {
  const size = 96;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, size, size);

  // White "C" letterform
  ctx.font = `${size * 0.58}px serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('C', size / 2, size / 2 + size * 0.02);

  return canvas;
}

const notif = generateNotificationIcon();
fs.writeFileSync(path.join(outDir, 'notification-icon.png'), notif.toBuffer('image/png'));
console.log('✓ notification-icon.png written');
