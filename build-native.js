#!/usr/bin/env node

/**
 * Build script for Capacitor native apps
 *
 * This script:
 * 1. Copies necessary files to www/ directory
 * 2. Syncs changes to native platforms (Android/iOS)
 * 3. Prepares app for deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WWW_DIR = './www';
const FILES_TO_COPY = [
  'index.html',
  'capacitor-init.js',
  'supabase-config.js',
  'professional-analytics.css',
  'sw.js'
];

const DIRS_TO_COPY = [
  'chat',
  'assets',
  'images'
];

console.log('[Build] Starting native app build...');

// Create www directory if it doesn't exist
if (!fs.existsSync(WWW_DIR)) {
  fs.mkdirSync(WWW_DIR, { recursive: true });
  console.log('[Build] Created www/ directory');
}

// Copy files
console.log('[Build] Copying files to www/...');
FILES_TO_COPY.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(WWW_DIR, file));
    console.log(`[Build] ✓ ${file}`);
  } else {
    console.warn(`[Build] ⚠️  ${file} not found, skipping`);
  }
});

// Copy directories
DIRS_TO_COPY.forEach(dir => {
  const srcDir = `./${dir}`;
  const destDir = path.join(WWW_DIR, dir);

  if (fs.existsSync(srcDir)) {
    // Copy directory recursively
    fs.cpSync(srcDir, destDir, { recursive: true });
    console.log(`[Build] ✓ ${dir}/`);
  } else {
    console.warn(`[Build] ⚠️  ${dir}/ not found, skipping`);
  }
});

// Sync to native platforms
console.log('[Build] Syncing to native platforms...');
try {
  execSync('npx cap sync', { stdio: 'inherit' });
  console.log('[Build] ✅ Native platforms synced');
} catch (error) {
  console.error('[Build] ❌ Sync failed:', error.message);
  process.exit(1);
}

console.log('[Build] ✅ Build complete!');
console.log('\nNext steps:');
console.log('  Android: npx cap open android');
console.log('  iOS:     npx cap open ios');
