#!/usr/bin/env node

// Gmail Setup Helper - Interactive configuration
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateAppPassword(password) {
    // App passwords are 16 characters, often with spaces
    const cleaned = password.replace(/\s/g, '');
    return cleaned.length === 16 && /^[a-zA-Z0-9]+$/.test(cleaned);
}

async function checkCurrentConfig() {
    const envPath = path.join(__dirname, 'backend', '.env');
    if (!fs.existsSync(envPath)) {
        console.log('❌ Backend .env file not found');
        return null;
    }
    
    const content = fs.readFileSync(envPath, 'utf8');
    const emailUserMatch = content.match(/^EMAIL_USER=(.+)$/m);
    const emailPassMatch = content.match(/^EMAIL_PASS=(.+)$/m);
    
    return {
        hasEmailUser: emailUserMatch && !emailUserMatch[1].startsWith('#'),
        hasEmailPass: emailPassMatch && !emailPassMatch[1].startsWith('#'),
        emailUser: emailUserMatch ? emailUserMatch[1] : null,
        content
    };
}

async function updateEnvFile(email, appPassword) {
    const envPath = path.join(__dirname, 'backend', '.env');
    let content = fs.readFileSync(envPath, 'utf8');
    
    // Update or add EMAIL_USER
    if (content.includes('EMAIL_USER=')) {
        content = content.replace(/^#?\s*EMAIL_USER=.*$/m, `EMAIL_USER=${email}`);
    } else {
        content += `\nEMAIL_USER=${email}`;
    }
    
    // Update or add EMAIL_PASS
    if (content.includes('EMAIL_PASS=')) {
        content = content.replace(/^#?\s*EMAIL_PASS=.*$/m, `EMAIL_PASS=${appPassword}`);
    } else {
        content += `\nEMAIL_PASS=${appPassword}`;
    }
    
    fs.writeFileSync(envPath, content);
}

async function main() {
    console.log('🔧 Gmail Setup Helper\n');
    
    // Check current configuration
    const config = await checkCurrentConfig();
    if (!config) {
        console.log('❌ Cannot find backend/.env file');
        process.exit(1);
    }
    
    if (config.hasEmailUser && config.hasEmailPass) {
        console.log('✅ Gmail is already configured!');
        console.log(`   Email: ${config.emailUser}`);
        console.log('');
        const reconfigure = await question('Do you want to reconfigure? (y/N): ');
        if (reconfigure.toLowerCase() !== 'y') {
            console.log('👍 Keeping current configuration');
            rl.close();
            return;
        }
    }
    
    console.log('📧 Let\'s set up Gmail for your app!\n');
    
    // Step 1: Check 2FA
    console.log('Step 1: 2-Factor Authentication');
    console.log('🔒 Go to: https://myaccount.google.com/security');
    console.log('🔒 Make sure "2-Step Verification" is ON');
    console.log('');
    
    const has2FA = await question('✅ Do you have 2-Factor Authentication enabled? (y/N): ');
    if (has2FA.toLowerCase() !== 'y') {
        console.log('');
        console.log('❌ You MUST enable 2-Factor Authentication first!');
        console.log('🔗 Go to: https://myaccount.google.com/security');
        console.log('🔗 Enable "2-Step Verification"');
        console.log('🔗 Then run this script again');
        rl.close();
        return;
    }
    
    // Step 2: App Password
    console.log('');
    console.log('Step 2: Generate App Password');
    console.log('🔑 Go to: https://myaccount.google.com/security');
    console.log('🔑 Click "App passwords"');
    console.log('🔑 Select "Mail" and click "Generate"');
    console.log('🔑 Copy the 16-character password');
    console.log('');
    
    // Get email
    let email;
    while (true) {
        email = await question('📧 Enter your Gmail address: ');
        if (validateEmail(email)) {
            break;
        }
        console.log('❌ Please enter a valid email address');
    }
    
    // Get app password
    let appPassword;
    while (true) {
        appPassword = await question('🔑 Enter your App Password (16 characters): ');
        if (validateAppPassword(appPassword)) {
            // Remove spaces for storage
            appPassword = appPassword.replace(/\s/g, '');
            break;
        }
        console.log('❌ App Password should be 16 characters (letters/numbers only)');
        console.log('💡 Example: abcd efgh ijkl mnop');
    }
    
    // Update configuration
    console.log('');
    console.log('💾 Updating configuration...');
    
    try {
        await updateEnvFile(email, appPassword);
        console.log('✅ Configuration saved!');
        console.log('');
        console.log('🚀 Now restart your app:');
        console.log('   npm start');
        console.log('');
        console.log('📧 You should see: "Production email configured"');
    } catch (error) {
        console.log('❌ Failed to update configuration:', error.message);
    }
    
    rl.close();
}

main().catch(console.error);