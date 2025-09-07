#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const environment = args[0] || 'development';

const envFiles = {
  development: 'env.development',
  production: 'env.production'
};

const envFile = envFiles[environment];

if (!envFile) {
  console.error('❌ Environment tidak valid. Gunakan: development atau production');
  console.log('Contoh: node setup-env.js development');
  process.exit(1);
}

const sourceFile = path.join(__dirname, envFile);
const targetFile = path.join(__dirname, '.env');

if (!fs.existsSync(sourceFile)) {
  console.error(`❌ File ${envFile} tidak ditemukan!`);
  process.exit(1);
}

try {
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`✅ Environment ${environment} berhasil di-setup!`);
  console.log(`📁 File .env telah dibuat dari ${envFile}`);
  
  if (environment === 'development') {
    console.log('🔧 Development mode: API akan menggunakan http://localhost:8000');
  } else if (environment === 'production') {
    console.log('🚀 Production mode: API akan menggunakan https://isme.fkkumj.ac.id');
  }
} catch (error) {
  console.error('❌ Error saat setup environment:', error.message);
  process.exit(1);
}
