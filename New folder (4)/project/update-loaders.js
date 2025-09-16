const fs = require('fs');
const path = require('path');

// Function to update a single HTML file
function updateHtmlFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;

        // Remove loading-screen.css link
        if (content.includes('loading-screen.css')) {
            content = content.replace(/<link[^>]*?loading-screen\.css[^>]*?>\s*/g, '');
            updated = true;
        }

        // Replace loading-screen.js with assets/js/loader.js
        if (content.includes('loading-screen.js')) {
            // Remove the old loading-screen.js script
            content = content.replace(/<script[^>]*?loading-screen\.js[^>]*?>\s*<\/script>\s*/g, '');
            
            // Add the new loader script if not already present
            if (!content.includes('assets/js/loader.js')) {
                const scriptTag = '    <script src="assets/js/loader.js"></script>';
                // Insert before the closing </body> tag
                content = content.replace('</body>', `    ${scriptTag}\n</body>`);
            }
            updated = true;
        }

        // Add the loader styles if not present
        if (!content.includes('.app-loader')) {
            const loaderStyles = `
    <style>
        /* Loader Styles */
        .app-loader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #1a1a1a;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            transition: opacity 0.3s ease-out;
        }
        
        .app-loader.hidden {
            opacity: 0;
            pointer-events: none;
        }
        
        .loader-box {
            text-align: center;
            color: white;
        }
        
        .loader-logo {
            width: 150px;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        }
        
        .progress-track {
            width: 200px;
            height: 4px;
            background: #333;
            border-radius: 2px;
            margin: 0 auto 10px;
            overflow: hidden;
        }
        
        .progress-bar {
            height: 100%;
            width: 0;
            background: #3498db;
            transition: width 0.3s ease-out;
        }
        
        .progress-text {
            font-size: 14px;
            color: #aaa;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        body.is-loading {
            overflow: hidden;
            height: 100vh;
        }
    </style>`;
            
            // Insert before the closing </head> tag
            content = content.replace('</head>', `${loaderStyles}\n    </head>`);
            updated = true;
        }

        if (updated) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated: ${filePath}`);
            return true;
        }
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
    }
    return false;
}

// Find all HTML files in the project directory
function findHtmlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        
        if (stat && stat.isDirectory()) {
            // Skip node_modules and other directories if needed
            if (!['node_modules', '.git', '.github', 'vendor'].includes(path.basename(file))) {
                results = results.concat(findHtmlFiles(file));
            }
        } else if (file.endsWith('.html')) {
            results.push(file);
        }
    });
    
    return results;
}

// Main function
function main() {
    const projectDir = __dirname;
    const htmlFiles = findHtmlFiles(projectDir);
    let updatedCount = 0;
    
    console.log('Updating loader references in HTML files...');
    
    htmlFiles.forEach(file => {
        if (updateHtmlFile(file)) {
            updatedCount++;
        }
    });
    
    console.log(`\nUpdate complete! Processed ${htmlFiles.length} HTML files, updated ${updatedCount} files.`);
}

main();
