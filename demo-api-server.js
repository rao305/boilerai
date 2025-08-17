const http = require('http');
const url = require('url');

// Mock data for demo
const mockData = {
  metrics: {
    activeUsers: {
      daily: 157,
      weekly: 423,
      monthly: 1250,
    },
    performance: {
      uptime: 99.8,
      avgResponseTime: 850,
      successRate: 96.8,
      requestsPerSecond: 12.4,
    }
  },
  users: [
    { id: 1, name: 'John Doe', email: 'j***@purdue.edu', role: 'ADMIN', lastLogin: '2024-01-15T10:30:00Z' },
    { id: 2, name: 'Jane Smith', email: 's***@purdue.edu', role: 'ANALYST', lastLogin: '2024-01-15T09:15:00Z' },
    { id: 3, name: 'Bob Wilson', email: 'w***@purdue.edu', role: 'USER', lastLogin: '2024-01-14T16:45:00Z' },
  ]
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    if (path === '/api/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Boiler AI Admin API'
      }));
    } 
    else if (path === '/api/metrics') {
      res.writeHead(200);
      res.end(JSON.stringify(mockData.metrics));
    } 
    else if (path === '/api/users') {
      res.writeHead(200);
      res.end(JSON.stringify(mockData.users));
    } 
    else if (path === '/api/ai/chat' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const requestData = JSON.parse(body);
          res.writeHead(200);
          res.end(JSON.stringify({
            id: 'demo-response-' + Date.now(),
            choices: [{
              message: {
                role: 'assistant',
                content: 'This is a demo response from the Boiler AI system. In production, this would connect to OpenAI with privacy-first safeguards.'
              }
            }],
            usage: {
              prompt_tokens: 50,
              completion_tokens: 30,
              total_tokens: 80
            },
            model: 'gpt-4-demo'
          }));
        } catch (err) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    } 
    else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Boiler AI Demo API Server running on http://localhost:${PORT}`);
  console.log(`📊 Metrics: http://localhost:${PORT}/api/metrics`);
  console.log(`👥 Users: http://localhost:${PORT}/api/users`);
  console.log(`💬 Chat: POST http://localhost:${PORT}/api/ai/chat`);
  console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
});