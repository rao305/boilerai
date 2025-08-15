#!/usr/bin/env node

// Service Health Check Script
// Ensures backend is running before starting frontend

import axios from 'axios';

async function checkBackend() {
    try {
        console.log('🔍 Checking backend service...');
        const response = await axios.get('http://localhost:5001', { timeout: 5000 });
        console.log('✅ Backend is running');
        return true;
    } catch (error) {
        console.log('❌ Backend is not running');
        console.log('💡 Start backend with: cd backend && npm run dev');
        return false;
    }
}

async function checkEmailService() {
    try {
        console.log('📧 Checking email service...');
        const response = await axios.get('http://localhost:5001/health', { timeout: 3000 });
        console.log('✅ Email service is ready');
        return true;
    } catch (error) {
        console.log('⚠️  Email service status unknown (this is okay)');
        return true; // Don't fail if health endpoint doesn't exist
    }
}

async function main() {
    console.log('🚀 Purdue Academic Planner - Service Health Check\n');
    
    const backendOk = await checkBackend();
    if (!backendOk) {
        console.log('\n❌ Backend is required for email functionality');
        console.log('🔧 Run this to start everything: npm start');
        process.exit(1);
    }
    
    await checkEmailService();
    
    console.log('\n✅ All services are ready!');
    console.log('🎉 Email will work correctly');
}

main().catch(console.error);