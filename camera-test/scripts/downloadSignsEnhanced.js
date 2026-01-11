// Enhanced script to download ASL sign language images from lessonpix.com
// This version can scrape the category page to find images
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

// Extract unique image filenames and their word mappings
const wordToImageMap = new Map();
const mappingRegex = /"([^"]+)":\s*"([^"]+)"/g;
let match;
while ((match = mappingRegex.exec(signMappingContent)) !== null) {
  const word = match[1].toLowerCase();
  const imageName = match[2];
  if (imageName && imageName.endsWith('.png')) {
    if (!wordToImageMap.has(imageName)) {
      wordToImageMap.set(imageName, []);
    }
    wordToImageMap.get(imageName).push(word);
  }
}

console.log(`Found ${wordToImageMap.size} unique sign images to download`);

// Create signs directory if it doesn't exist
const signsDir = path.join(__dirname, '../public/signs');
if (!fs.existsSync(signsDir)) {
  fs.mkdirSync(signsDir, { recursive: true });
  console.log(`Created directory: ${signsDir}`);
}

// Base URL for lessonpix ASL images
const CATEGORY_URL = 'https://lessonpix.com/clipart/413/ASL+Core+Vocab';

// Function to fetch HTML from URL
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    protocol.get(url, (res) => {
      let html = '';
      res.on('data', (chunk) => { html += chunk; });
      res.on('end', () => resolve(html));
    }).on('error', reject);
  });
}

// Function to extract image URLs from HTML
function extractImageUrls(html, searchWord) {
  const imageUrls = [];
  
  // Try various patterns to find images
  const patterns = [
    // Direct img src
    /<img[^>]+src=["']([^"']*\/[^"']*\.(?:png|jpg|jpeg|gif|webp))["']/gi,
    // data-src (lazy loading)
    /data-src=["']([^"']*\/[^"']*\.(?:png|jpg|jpeg|gif|webp))["']/gi,
    // data-original
    /data-original=["']([^"']*\/[^"']*\.(?:png|jpg|jpeg|gif|webp))["']/gi,
    // Background images
    /background-image:\s*url\(["']?([^"')]*\/[^"')]*\.(?:png|jpg|jpeg|gif|webp))["']?\)/gi,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let url = match[1];
      // Make absolute URL if relative
      if (url.startsWith('//')) {
        url = 'https:' + url;
      } else if (url.startsWith('/')) {
        url = 'https://lessonpix.com' + url;
      } else if (!url.startsWith('http')) {
        url = 'https://lessonpix.com/' + url;
      }
      
      // Check if URL might be related to our search word
      if (!searchWord || url.toLowerCase().includes(searchWord.toLowerCase())) {
        imageUrls.push(url);
      }
    }
  });
  
  return [...new Set(imageUrls)]; // Remove duplicates
}

// Function to download an image from URL
function downloadImageFromUrl(imageUrl, filePath, imageName) {
  return new Promise((resolve, reject) => {
    const protocol = imageUrl.startsWith('https:') ? https : http;
    
    const file = fs.createWriteStream(filePath);
    
    const request = protocol.get(imageUrl, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(filePath);
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          const fullRedirectUrl = redirectUrl.startsWith('http') 
            ? redirectUrl 
            : new URL(redirectUrl, imageUrl).href;
          return downloadImageFromUrl(fullRedirectUrl, filePath, imageName)
            .then(resolve)
            .catch(reject);
        }
        return reject(new Error('Redirect without location'));
      }
      
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      
      // Check content type
      const contentType = response.headers['content-type'];
      if (contentType && !contentType.startsWith('image/')) {
        file.close();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return reject(new Error('Not an image'));
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          resolve({ imageName, size: stats.size });
        } else {
          fs.unlinkSync(filePath);
          reject(new Error('Empty file'));
        }
      });
    });
    
    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      reject(err);
    });
    
    request.setTimeout(15000, () => {
      request.destroy();
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      reject(new Error('Timeout'));
    });
  });
}

// Cache for category page HTML and all image URLs
let categoryPageCache = null;
let allImageUrls = null;

// Function to get all images from category page (cached)
async function getAllCategoryImages() {
  if (categoryPageCache && allImageUrls) {
    return allImageUrls;
  }
  
  console.log('Fetching category page to get all available images...');
  const html = await fetchHTML(CATEGORY_URL);
  categoryPageCache = html;
  
  // Extract all image URLs from the page
  allImageUrls = extractImageUrls(html);
  console.log(`Found ${allImageUrls.length} total images on category page`);
  
  return allImageUrls;
}

// Function to find best matching image URL for a word
function findMatchingImageUrl(imageUrls, word) {
  const wordLower = word.toLowerCase();
  
  // Try exact match in URL
  for (const url of imageUrls) {
    const urlLower = url.toLowerCase();
    // Check if word appears in the URL path or filename
    if (urlLower.includes(`/${wordLower}`) || urlLower.includes(`/${wordLower}.`)) {
      return url;
    }
  }
  
  // Try partial match
  for (const url of imageUrls) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes(wordLower)) {
      return url;
    }
  }
  
  return null;
}

// Function to download an image
async function downloadImage(imageName, words) {
  const filePath = path.join(signsDir, imageName);
  
  // Skip if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`✓ Already exists: ${imageName}`);
    return { imageName, status: 'exists' };
  }
  
  // Try to fetch the category page and find the image
  try {
    console.log(`Searching for: ${imageName} (words: ${words.join(', ')})`);
    
    // Get all images from category page
    const allImageUrls = await getAllCategoryImages();
    
    // Try to find matching image for each word
    let matchingUrl = null;
    for (const word of words) {
      matchingUrl = findMatchingImageUrl(allImageUrls, word);
      if (matchingUrl) {
        console.log(`Found potential match for "${word}": ${matchingUrl}`);
        break;
      }
    }
    
    // If found a match, try to download it
    if (matchingUrl) {
      try {
        await downloadImageFromUrl(matchingUrl, filePath, imageName);
        console.log(`✓ Downloaded: ${imageName}`);
        return { imageName, status: 'downloaded' };
      } catch (err) {
        console.log(`Failed to download from matched URL, trying alternatives...`);
      }
    }
    
    // Try direct URL patterns as fallback
    
    // If category page didn't work, try direct URL patterns
    const wordForUrl = words[0];
    const directUrls = [
      `https://lessonpix.com/clipart/413/ASL+Core+Vocab/${wordForUrl}.png`,
      `https://lessonpix.com/images/clipart/413/ASL+Core+Vocab/${wordForUrl}.png`,
      `https://lessonpix.com/clipart/413/${wordForUrl}.png`,
      `https://lessonpix.com/clipart/${wordForUrl}.png`,
    ];
    
    for (const url of directUrls) {
      try {
        await downloadImageFromUrl(url, filePath, imageName);
        console.log(`✓ Downloaded: ${imageName} from ${url}`);
        return { imageName, status: 'downloaded' };
      } catch (err) {
        continue;
      }
    }
    
    return { imageName, status: 'failed', error: 'Could not find image' };
  } catch (err) {
    return { imageName, status: 'failed', error: err.message };
  }
}

// Function to download all images with rate limiting
async function downloadAllImages() {
  const images = Array.from(wordToImageMap.entries());
  const results = {
    downloaded: [],
    failed: [],
    exists: []
  };
  
  // Process in batches to avoid overwhelming the server
  const batchSize = 3;
  const delay = 1000; // 1 second delay between batches
  
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    
    const promises = batch.map(([imageName, words]) => 
      downloadImage(imageName, words).catch(err => {
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
      console.log(`\nWaiting ${delay}ms before next batch...\n`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}

// Main execution
console.log('Starting enhanced download process...\n');
console.log(`Category URL: ${CATEGORY_URL}\n`);
downloadAllImages()
  .then(results => {
    console.log('\n=== Download Summary ===');
    console.log(`Downloaded: ${results.downloaded.length}`);
    console.log(`Already existed: ${results.exists.length}`);
    console.log(`Failed: ${results.failed.length}`);
    
    if (results.failed.length > 0) {
      console.log('\nFailed images (first 20):');
      results.failed.slice(0, 20).forEach(img => console.log(`  - ${img}`));
      if (results.failed.length > 20) {
        console.log(`  ... and ${results.failed.length - 20} more`);
      }
    }
    
    console.log('\nDone!');
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
