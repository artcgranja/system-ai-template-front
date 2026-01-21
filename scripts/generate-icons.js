const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Generate icons from the logo image
 * Creates favicon.ico, icon-192.png, and icon-512.png
 */
async function generateIcons() {
  // Use the icon SVG (white version) for better favicon/app icon visibility
  const iconPath = path.join(__dirname, '../public/astro-icon_branco.svg');
  const appDir = path.join(__dirname, '../src/app');
  const publicDir = path.join(__dirname, '../public');

  // Check if icon exists
  if (!fs.existsSync(iconPath)) {
    console.error(`Error: Icon file not found at ${iconPath}`);
    process.exit(1);
  }

  try {
    console.log('Generating icons from Astro icon...');

    // Read the icon image (SVG)
    const iconBuffer = await sharp(iconPath)
      .ensureAlpha()
      .toBuffer();

    // Generate favicon.ico (32x32 PNG saved as .ico - works with Next.js and modern browsers)
    console.log('Generating favicon.ico...');
    const faviconPath = path.join(appDir, 'favicon.ico');
    await sharp(iconBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 250, g: 245, b: 234, alpha: 1 } // #FAF5EA background for white icon
      })
      .png()
      .toFile(faviconPath);
    console.log(`✓ Created ${faviconPath}`);

    // Generate icon-192.png
    console.log('Generating icon-192.png...');
    const icon192Path = path.join(publicDir, 'icon-192.png');
    await sharp(iconBuffer)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 250, g: 245, b: 234, alpha: 1 } // #FAF5EA background for white icon
      })
      .png()
      .toFile(icon192Path);
    console.log(`✓ Created ${icon192Path}`);

    // Generate icon-512.png
    console.log('Generating icon-512.png...');
    const icon512Path = path.join(publicDir, 'icon-512.png');
    await sharp(iconBuffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 250, g: 245, b: 234, alpha: 1 } // #FAF5EA background for white icon
      })
      .png()
      .toFile(icon512Path);
    console.log(`✓ Created ${icon512Path}`);

    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
