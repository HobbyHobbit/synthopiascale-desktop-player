const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, '..', 'SynthopiaScale Logo(ohne Text).jpg');
const outputDir = path.join(__dirname, '..', 'build');
const icoPath = path.join(outputDir, 'icon.ico');
const pngPath = path.join(outputDir, 'icon.png');

async function createIcon() {
  // Ensure build directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Convert JPG to PNG with 256x256 size (standard Windows icon size)
  await sharp(inputPath)
    .resize(256, 256)
    .png()
    .toFile(pngPath);

  console.log('Created PNG icon at:', pngPath);
  
  // Create multiple PNG sizes for ICO
  const sizes = [16, 32, 48, 256];
  
  for (const size of sizes) {
    const sizePath = path.join(outputDir, `icon-${size}.png`);
    await sharp(inputPath)
      .resize(size, size)
      .png()
      .toFile(sizePath);
    console.log(`Created ${size}x${size} PNG`);
  }
  
  // Create ICO using png-to-ico (default export)
  const pngToIco = require('png-to-ico').default || require('png-to-ico');
  try {
    const icoBuffer = await pngToIco(path.join(outputDir, 'icon-256.png'));
    fs.writeFileSync(icoPath, icoBuffer);
    console.log('Created ICO icon at:', icoPath);
  } catch (err) {
    console.log('ICO creation skipped - electron-builder will convert PNG automatically');
    // Copy PNG as fallback
    fs.copyFileSync(pngPath, icoPath);
  }
}

createIcon().catch(console.error);
