const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const QUALITY = 80; // Quality for WebP (1-100)
const WIDTHS = [800, 1200, 1600]; // Different widths for responsive images

async function optimizeImages(dir) {
  try {
    const files = await readdir(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const fileStat = await stat(filePath);
      
      if (fileStat.isDirectory()) {
        await optimizeImages(filePath); // Recurse into subdirectories
      } else {
        const ext = path.extname(file).toLowerCase();
        
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          try {
            const fileName = path.basename(file, ext);
            const outputDir = path.join(dir, 'optimized');
            
            // Create optimized directory if it doesn't exist
            if (!fs.existsSync(outputDir)) {
              await mkdir(outputDir);
            }
            
            // Generate WebP versions at different sizes
            for (const width of WIDTHS) {
              const outputPath = path.join(
                outputDir, 
                `${fileName}-${width}w.webp`
              );
              
              await sharp(filePath)
                .resize(width)
                .webp({ quality: QUALITY })
                .toFile(outputPath);
                
              console.log(`Created: ${outputPath}`);
            }
            
            // Also create a high-quality WebP version
            await sharp(filePath)
              .webp({ quality: QUALITY + 5 })
              .toFile(path.join(outputDir, `${fileName}.webp`));
              
            console.log(`Optimized: ${filePath}`);
            
          } catch (err) {
            console.error(`Error optimizing ${filePath}:`, err.message);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error reading directory:', err);
  }
}

// Start optimization from the current directory
optimizeImages(__dirname).then(() => {
  console.log('Image optimization complete!');
});
