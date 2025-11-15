#!/usr/bin/env node

// Script to generate simple SVG icons for PWA
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, '../public');

// Create SVG icon template
const createSvgIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2563eb"/>
  <path d="M${size * 0.25} ${size * 0.3}h${size * 0.5}v${size * 0.05}h-${size * 0.5}z" fill="white"/>
  <rect x="${size * 0.3}" y="${size * 0.4}" width="${size * 0.4}" height="${size * 0.3}" rx="${size * 0.02}" fill="white"/>
  <circle cx="${size * 0.35}" cy="${size * 0.75}" r="${size * 0.06}" fill="#2563eb"/>
  <circle cx="${size * 0.65}" cy="${size * 0.75}" r="${size * 0.06}" fill="#2563eb"/>
  <text x="50%" y="55%" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size * 0.12}" font-weight="bold" fill="#2563eb">T4u</text>
</svg>
`.trim();

// Generate icons
sizes.forEach(size => {
  const filename = `icon-${size}x${size}.png`;
  const svgContent = createSvgIcon(size);
  
  // For now, we'll create SVG files (you can convert to PNG later)
  const svgFilename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(publicDir, svgFilename), svgContent);
  console.log(`✓ Created ${svgFilename}`);
});

console.log('\n✅ All PWA icons generated!');
console.log('Note: These are SVG files. For production, convert them to PNG using a tool like ImageMagick or an online converter.');
