// Script to download ASL sign language images from lessonpix.com
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the sign mapping
const signMappingPath = path.join(__dirname, '../src/signMapping.js');
const signMappingContent = fs.readFileSync(signMappingPath, 'utf-8');

// Extract unique image filenames from mapping
const imageFilenames = new Set();
const mappingRegex = /"([^"]+)":\s*"([^"]+)"/g;
let match;
while ((match = mappingRegex.exec(signMappingContent)) !== null) {
  const imageName = match[2];
  if (imageName && imageName.endsWith('.png')) {
    imageFilenames.add(imageName);
  }
}

console.log(`Found ${imageFilenames.size} unique sign images to download`);

// Create signs directory if it doesn't exist
const signsDir = path.join(__dirname, '../public/signs');
if (!fs.existsSync(signsDir)) {
  fs.mkdirSync(signsDir, { recursive: true });
  console.log(`Created directory: ${signsDir}`);
}

// Base URL for lessonpix ASL images
const BASE_URL = 'https://lessonpix.com/clipart/413/ASL+Core+Vocab';
const SEARCH_URL = 'https://lessonpix.com/clipart/413/ASL+Core+Vocab';

// Function to fetch HTML and extract image URLs
async function searchForImageUrl(word) {
  return new Promise((resolve, reject) => {
    const wordForUrl = word.toLowerCase();
    const searchUrl = `${SEARCH_URL}?q=${encodeURIComponent(wordForUrl)}`;
    
    https.get(searchUrl, (res) => {
      let html = '';
      res.on('data', (chunk) => { html += chunk; });
      res.on('end', () => {
        // Try to find image URLs in the HTML
        const imgRegex = /<img[^>]+src=["']([^"']*\/[^"']*\.(?:png|jpg|jpeg|gif))["']/gi;
        const matches = [];
        let match;
        while ((match = imgRegex.exec(html)) !== null) {
          matches.push(match[1]);
        }
        
        // Also try data-src or other attributes
        const dataSrcRegex = /data-src=["']([^"']*\/[^"']*\.(?:png|jpg|jpeg|gif))["']/gi;
        while ((match = dataSrcRegex.exec(html)) !== null) {
          matches.push(match[1]);
        }
        
        resolve(matches);
      });
    }).on('error', reject);
  });
}

// Function to download an image
function downloadImage(word, imageName) {
  return new Promise(async (resolve, reject) => {
    // Remove .png extension for URL
    const wordForUrl = word.replace('.png', '').toLowerCase();
    
    const filePath = path.join(signsDir, imageName);
    
    // Skip if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`✓ Already exists: ${imageName}`);
      resolve({ word: wordForUrl, imageName, status: 'exists' });
      return;
    }
    
    // Try different URL patterns that lessonpix might use
    const possibleUrls = [
      `https://lessonpix.com/clipart/413/ASL+Core+Vocab/${wordForUrl}.png`,
      `https://lessonpix.com/clipart/413/ASL+Core+Vocab/${wordForUrl}`,
      `https://lessonpix.com/images/clipart/413/ASL+Core+Vocab/${wordForUrl}.png`,
      `https://lessonpix.com/clipart/413/${wordForUrl}.png`,
      `https://lessonpix.com/clipart/${wordForUrl}.png`,
      `https://lessonpix.com/images/clipart/${wordForUrl}.png`,
    ];
    
    let urlIndex = 0;
    
    function tryDownload() {
      if (urlIndex >= possibleUrls.length) {
        // Try searching the page for the image
        searchForImageUrl(wordForUrl)
          .then(imageUrls => {
            if (imageUrls.length > 0) {
              // Try the first found URL
              const foundUrl = imageUrls[0].startsWith('http') 
                ? imageUrls[0] 
                : `https://lessonpix.com${imageUrls[0]}`;
              downloadFromUrl(foundUrl, filePath, wordForUrl, imageName, resolve, reject);
            } else {
              reject(new Error(`Could not find image URL for ${imageName}`));
            }
          })
          .catch(() => {
            reject(new Error(`Failed to download ${imageName} from all URL patterns`));
          });
        return;
      }
      
      const url = possibleUrls[urlIndex];
      downloadFromUrl(url, filePath, wordForUrl, imageName, resolve, reject, () => {
        urlIndex++;
        tryDownload();
      });
    }
    
    tryDownload();
  });
}

// Helper function to download from a specific URL
function downloadFromUrl(url, filePath, wordForUrl, imageName, resolve, reject, onError) {
  const protocol = url.startsWith('https:') ? https : http;
  
  console.log(`Trying to download ${imageName} from: ${url}`);
  
  const file = fs.createWriteStream(filePath);
  
  const request = protocol.get(url, (response) => {
    // Handle redirects
    if (response.statusCode === 301 || response.statusCode === 302) {
      const redirectUrl = response.headers.location;
      file.close();
      fs.unlinkSync(filePath);
      if (redirectUrl) {
        const fullRedirectUrl = redirectUrl.startsWith('http') 
          ? redirectUrl 
          : `https://lessonpix.com${redirectUrl}`;
        downloadFromUrl(fullRedirectUrl, filePath, wordForUrl, imageName, resolve, reject, onError);
        return;
      }
    }
    
    if (response.statusCode !== 200) {
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (onError) onError();
      return;
    }
    
    // Check if response is actually an image
    const contentType = response.headers['content-type'];
    if (contentType && !contentType.startsWith('image/')) {
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (onError) onError();
      return;
    }
    
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      // Verify file was actually written and has content
      const stats = fs.statSync(filePath);
      if (stats.size > 0) {
        console.log(`✓ Downloaded: ${imageName} (${stats.size} bytes)`);
        resolve({ word: wordForUrl, imageName, status: 'downloaded' });
      } else {
        fs.unlinkSync(filePath);
        if (onError) onError();
      }
    });
  });
  
  request.on('error', (err) => {
    file.close();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (onError) onError();
  });
  
  request.setTimeout(15000, () => {
    request.destroy();
    file.close();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (onError) onError();
  });
    
    const filePath = path.join(signsDir, imageName);
    
    // Skip if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`✓ Already exists: ${imageName}`);
      resolve({ word: wordForUrl, imageName, status: 'exists' });
      return;
    }
    
    let urlIndex = 0;
    
    function tryDownload() {
      if (urlIndex >= possibleUrls.length) {
        reject(new Error(`Failed to download ${imageName} from all URL patterns`));
        return;
      }
      
      const url = possibleUrls[urlIndex];
      const protocol = url.startsWith('https:') ? https : http;
      
      console.log(`Trying to download ${imageName} from: ${url}`);
      
      const file = fs.createWriteStream(filePath);
      
      const request = protocol.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          fs.unlinkSync(filePath);
          urlIndex++;
          tryDownload();
          return;
        }
        
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(filePath);
          urlIndex++;
          tryDownload();
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`✓ Downloaded: ${imageName}`);
          resolve({ word: wordForUrl, imageName, status: 'downloaded' });
        });
      });
      
      request.on('error', (err) => {
        file.close();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        urlIndex++;
        tryDownload();
      });
      
      request.setTimeout(10000, () => {
        request.destroy();
        file.close();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        urlIndex++;
        tryDownload();
      });
    }
    
    tryDownload();
  });
}

// Function to download all images with rate limiting
async function downloadAllImages() {
  const images = Array.from(imageFilenames);
  const results = {
    downloaded: [],
    failed: [],
    exists: []
  };
  
  // Process in batches to avoid overwhelming the server
  const batchSize = 5;
  const delay = 500; // 500ms delay between batches
  
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    
    const promises = batch.map(imageName => 
      downloadImage(imageName, imageName).catch(err => {
        console.error(`✗ Failed: ${imageName} - ${err.message}`);
        return { imageName, status: 'failed', error: err.message };
      })
    );
    
    const batchResults = await Promise.all(promises);
    
    batchResults.forEach(result => {
      if (result.status === 'downloaded') {
        results.downloaded.push(result.imageName);
      } else if (result.status === 'exists') {
        results.exists.push(result.imageName);
      } else if (result.status === 'failed') {
        results.failed.push(result.imageName);
      }
    });
    
    // Delay between batches
    if (i + batchSize < images.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}

// Main execution
console.log('Starting download process...\n');
downloadAllImages()
  .then(results => {
    console.log('\n=== Download Summary ===');
    console.log(`Downloaded: ${results.downloaded.length}`);
    console.log(`Already existed: ${results.exists.length}`);
    console.log(`Failed: ${results.failed.length}`);
    
    if (results.failed.length > 0) {
      console.log('\nFailed images:');
      results.failed.forEach(img => console.log(`  - ${img}`));
    }
    
    console.log('\nDone!');
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
