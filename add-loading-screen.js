const fs = require('fs');
const path = require('path');

// Paths to the loading screen files
const loadingScreenCSS = path.join(__dirname, 'loading-screen.css');
const loadingScreenJS = path.join(__dirname, 'loading-screen.js');

// Directory to process
const rootDir = path.join(__dirname);

// Find all HTML files recursively
function findHTMLFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    
    if (stat && stat.isDirectory()) {
      // Skip node_modules and .git directories
      if (!file.includes('node_modules') && !file.includes('\.git')) {
        results = results.concat(findHTMLFiles(file));
      }
    } else if (file.endsWith('.html')) {
      results.push(file);
    }
  });
  
  return results;
}

// Add loading screen to HTML files
function addLoadingScreen(htmlFiles) {
  htmlFiles.forEach(file => {
    try {
      let content = fs.readFileSync(file, 'utf8');
      
      // Skip if already has loading screen
      if (content.includes('loading-screen.css') || content.includes('loading-screen.js')) {
        console.log(`Skipping ${file} - already has loading screen`);
        return;
      }
      
      // Add CSS link in head
      const cssLink = '\n    <link rel="stylesheet" href="../loading-screen.css">';
      content = content.replace('</head>', `${cssLink}\n  </head>`);
      
      // Add script before closing body
      const jsScript = '\n    <script src="../loading-screen.js"></script>';
      content = content.replace('</body>', `${jsScript}\n  </body>`);
      
      // Save the file
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
      
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  });
  
  console.log('\nLoading screen added to all HTML files.');
  console.log('Make sure to copy loading-screen.css and loading-screen.js to your project root directory.');
}

// Run the script
const htmlFiles = findHTMLFiles(rootDir);
console.log(`Found ${htmlFiles.length} HTML files to process`);
addLoadingScreen(htmlFiles);
