const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, '..', 'SynthopiaScale Logo(ohne Text).jpg');
const outputDir = path.join(__dirname, '..', 'build');
const outputPath = path.join(outputDir, 'icon.ico');
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
  
  // For ICO, we need multiple sizes - create them
  const sizes = [16, 32, 48, 256];
  for (const size of sizes) {
    const sizePath = path.join(outputDir, `icon-${size}.png`);
    await sharp(inputPath)
      .resize(size, size)
      .png()
      .toFile(sizePath);
    console.log(`Created ${size}x${size} PNG`);
  }
  
  console.log('\nPNG files created. Use an online converter or electron-builder will handle the conversion.');
  console.log('Alternatively, copy icon.png to icon.ico and electron-builder may accept it.');
}

createIcon().catch(console.error);
