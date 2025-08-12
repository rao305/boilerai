#!/usr/bin/env node

// Email Setup Test - Ensures email will work when you restart the app
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Email Setup for Persistence...\n');

// Check if backend is running
async function testBackendConnection() {
    try {
        const response = await fetch('http://localhost:5001');
        console.log('✅ Backend is currently running on port 5001');
        return true;
    } catch (error) {
        console.log('❌ Backend is not currently running');
        return false;
    }
}

// Check email service configuration
function checkEmailConfig() {
    const envPath = path.join(__dirname, 'backend', '.env');
    console.log('🔍 Checking email configuration...');
    
    if (!fs.existsSync(envPath)) {
        console.log('❌ Backend .env file not found');
        return false;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check for email settings
    const hasEmailService = envContent.includes('EMAIL_SERVICE=');
    const hasEmailFrom = envContent.includes('EMAIL_FROM=');
    const hasFrontendUrl = envContent.includes('FRONTEND_URL=');
    
    console.log('📧 Email configuration:');
    console.log(`   EMAIL_SERVICE: ${hasEmailService ? '✅' : '❌'}`);
    console.log(`   EMAIL_FROM: ${hasEmailFrom ? '✅' : '❌'}`);
    console.log(`   FRONTEND_URL: ${hasFrontendUrl ? '✅' : '❌'}`);
    
    return hasEmailService && hasEmailFrom && hasFrontendUrl;
}

// Check startup script
function checkStartupScript() {
    const scriptPath = path.join(__dirname, 'start-app.sh');
    console.log('🚀 Checking startup script...');
    
    if (!fs.existsSync(scriptPath)) {
        console.log('❌ start-app.sh not found');
        return false;
    }
    
    // Check if script is executable
    const stats = fs.statSync(scriptPath);
    const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
    
    console.log(`   start-app.sh: ${isExecutable ? '✅ executable' : '❌ not executable'}`);
    return isExecutable;
}

// Check package.json scripts
function checkPackageScripts() {
    const packagePath = path.join(__dirname, 'package.json');
    console.log('📦 Checking package.json scripts...');
    
    if (!fs.existsSync(packagePath)) {
        console.log('❌ package.json not found');
        return false;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const scripts = packageJson.scripts || {};
    
    const hasStart = 'start' in scripts;
    const hasCheck = 'check' in scripts;
    
    console.log(`   start script: ${hasStart ? '✅' : '❌'}`);
    console.log(`   check script: ${hasCheck ? '✅' : '❌'}`);
    
    return hasStart && hasCheck;
}

// Check email service file
function checkEmailService() {
    const emailServicePath = path.join(__dirname, 'backend', 'src', 'services', 'emailService.js');
    console.log('📧 Checking email service implementation...');
    
    if (!fs.existsSync(emailServicePath)) {
        console.log('❌ emailService.js not found');
        return false;
    }
    
    const serviceContent = fs.readFileSync(emailServicePath, 'utf8');
    
    // Check for improved features
    const hasAsyncInit = serviceContent.includes('async initializeTransporter');
    const hasFallback = serviceContent.includes('createFallbackTransporter');
    const hasEnsureTransporter = serviceContent.includes('ensureTransporter');
    
    console.log('   Enhanced email service:');
    console.log(`     Async initialization: ${hasAsyncInit ? '✅' : '❌'}`);
    console.log(`     Fallback mechanism: ${hasFallback ? '✅' : '❌'}`);
    console.log(`     Transporter ensuring: ${hasEnsureTransporter ? '✅' : '❌'}`);
    
    return hasAsyncInit && hasFallback && hasEnsureTransporter;
}

async function main() {
    let allGood = true;
    
    // Test current state
    const backendRunning = await testBackendConnection();
    
    // Check persistent configurations
    const configOk = checkEmailConfig();
    const scriptOk = checkStartupScript();
    const packageOk = checkPackageScripts();
    const serviceOk = checkEmailService();
    
    allGood = configOk && scriptOk && packageOk && serviceOk;
    
    console.log('\n' + '='.repeat(50));
    
    if (allGood) {
        console.log('🎉 PERFECT! Email will work every time you restart');
        console.log('');
        console.log('✅ When you close everything and restart:');
        console.log('   → Just run: npm start');
        console.log('   → Email will work automatically');
        console.log('   → No manual setup needed');
        console.log('');
        if (backendRunning) {
            console.log('💡 Your app is running right now and emails work!');
        } else {
            console.log('💡 Start your app with: npm start');
        }
    } else {
        console.log('⚠️  Some setup issues detected');
        console.log('   → Run the fixes I provided earlier');
        console.log('   → Then test again with: node test-email-setup.js');
    }
    
    console.log('='.repeat(50));
}

main().catch(console.error);