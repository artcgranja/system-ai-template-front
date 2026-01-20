const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Generate icons from the logo image
 * Creates favicon.ico, icon-192.png, and icon-512.png
 */
async function generateIcons() {
  const logoPath = path.join(__dirname, '../public/logo-vora-verde-branco.png');
  const appDir = path.join(__dirname, '../src/app');
  const publicDir = path.join(__dirname, '../public');

  // Check if logo exists
  if (!fs.existsSync(logoPath)) {
    console.error(`Error: Logo file not found at ${logoPath}`);
    process.exit(1);
  }

  try {
    console.log('Generating icons from logo...');

    // Read the logo image
    const logoBuffer = await sharp(logoPath).toBuffer();

    // Ensure the logo has alpha channel for transparency
    const logoWithAlpha = await sharp(logoBuffer)
      .ensureAlpha()
      .toBuffer();

    // Generate favicon.ico (32x32 PNG saved as .ico - works with Next.js and modern browsers)
    console.log('Generating favicon.ico...');
    const faviconPath = path.join(appDir, 'favicon.ico');
    await sharp(logoWithAlpha)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(faviconPath);
    console.log(`✓ Created ${faviconPath}`);

    // Generate icon-192.png
    console.log('Generating icon-192.png...');
    const icon192Path = path.join(publicDir, 'icon-192.png');
    await sharp(logoWithAlpha)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(icon192Path);
    console.log(`✓ Created ${icon192Path}`);

    // Generate icon-512.png
    console.log('Generating icon-512.png...');
    const icon512Path = path.join(publicDir, 'icon-512.png');
    await sharp(logoWithAlpha)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
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
