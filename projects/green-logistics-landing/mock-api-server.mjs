/**
 * Mock API Server for Console Metrics
 * Provides fake data until backend implements real endpoints
 */

import http from 'http';
import { URL } from 'url';

const PORT = 3001; // Different port to avoid conflict

// Mock data
const mockMetricsSummary = {
  totalRequests: 12847,
  successRate: 98.5,
  averageResponseTime: 245,
  totalErrorCount: 193,
};

const mockEndpointMetrics = [
  { method: 'POST', endpoint: '/api/v2/bids/evaluate', requestCount: 3421 },
  { method: 'GET', endpoint: '/api/v2/fleets', requestCount: 2156 },
  { method: 'POST', endpoint: '/api/v2/orders', requestCount: 1847 },
  { method: 'GET', endpoint: '/api/v2/metrics', requestCount: 1234 },
];

const mockQuotaInfo = {
  used: 12847,
  limit: 100000,
  resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

const mockBillingMetrics = {
  currentPeriod: {
    totalCost: 234.50,
    totalRequests: 12847,
  },
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  console.log(`📡 ${req.method} ${path}`);

  // Route handling
  if (path === '/api/v2/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString(), version: 'v2-mock' }));
  } else if (path === '/api/v2/console/metrics/summary') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockMetricsSummary));
  } else if (path === '/api/v2/console/metrics/endpoints') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockEndpointMetrics));
  } else if (path === '/api/v2/console/metrics/quota') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockQuotaInfo));
  } else if (path === '/api/v2/console/metrics/billing') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockBillingMetrics));
  } else if (path === '/api/v2/console/metrics/stream') {
    // SSE endpoint
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send updates every 5 seconds
    const intervalId = setInterval(() => {
      const updatedMetrics = {
        ...mockMetricsSummary,
        totalRequests: mockMetricsSummary.totalRequests + Math.floor(Math.random() * 10),
        averageResponseTime: mockMetricsSummary.averageResponseTime + Math.floor(Math.random() * 20) - 10,
      };
      res.write(`data: ${JSON.stringify(updatedMetrics)}\n\n`);
    }, 5000);

    req.on('close', () => {
      clearInterval(intervalId);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Not Found', statusCode: 404 }));
  }
});

server.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                           ║');
  console.log('║              🚀 Mock API Server for Console Metrics                      ║');
  console.log('║                                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('Available Endpoints:');
  console.log(`  GET  http://localhost:${PORT}/api/v2/health`);
  console.log(`  GET  http://localhost:${PORT}/api/v2/console/metrics/summary?period=DAY`);
  console.log(`  GET  http://localhost:${PORT}/api/v2/console/metrics/endpoints`);
  console.log(`  GET  http://localhost:${PORT}/api/v2/console/metrics/quota`);
  console.log(`  GET  http://localhost:${PORT}/api/v2/console/metrics/billing`);
  console.log(`  SSE  http://localhost:${PORT}/api/v2/console/metrics/stream`);
  console.log('');
  console.log('📝 To use this mock API, update apiClient.ts:');
  console.log(`   const API_BASE_URL = 'http://localhost:${PORT}/api/v2';`);
  console.log('');
  console.log('Press Ctrl+C to stop\n');
});
