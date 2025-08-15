#!/usr/bin/env node

// Simple server to test BoilerAI frontend
const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Starting BoilerAI with simple configuration...');

// Kill any existing processes on our ports
const killPort = (port) => {
  return new Promise((resolve) => {
    const killer = spawn('lsof', ['-ti', `:${port}`]);
    let pids = '';
    
    killer.stdout.on('data', (data) => {
      pids += data.toString();
    });
    
    killer.on('close', () => {
      if (pids.trim()) {
        const killProcess = spawn('kill', ['-9', ...pids.trim().split('\n')]);
        killProcess.on('close', () => resolve());
      } else {
        resolve();
      }
    });
  });
};

const startServices = async () => {
  // Kill existing processes
  await killPort(5001);
  await killPort(3000);
  await killPort(5173);
  
  console.log('✅ Cleaned up existing processes');
  
  // Start backend
  console.log('🔧 Starting backend...');
  const backend = spawn('npm', ['run', 'dev'], {
    cwd: './backend',
    stdio: 'pipe'
  });
  
  // Wait for backend to be ready
  await new Promise((resolve) => {
    const checkBackend = () => {
      http.get('http://localhost:5001/api/health', (res) => {
        if (res.statusCode === 200) {
          console.log('✅ Backend ready');
          resolve();
        } else {
          setTimeout(checkBackend, 1000);
        }
      }).on('error', () => {
        setTimeout(checkBackend, 1000);
      });
    };
    setTimeout(checkBackend, 2000);
  });
  
  // Start frontend with minimal config
  console.log('🎨 Starting frontend...');
  const frontend = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '3000', '--open'], {
    stdio: 'inherit'
  });
  
  console.log('');
  console.log('🎉 BoilerAI is starting...');
  console.log('📱 Frontend: http://localhost:3000');
  console.log('🔧 Backend:  http://localhost:5001');
  console.log('');
  console.log('🛑 Press Ctrl+C to stop');
  
  // Handle cleanup
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });
};

startServices().catch(console.error);