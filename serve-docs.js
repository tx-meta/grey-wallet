#!/usr/bin/env node

/**
 * Simple HTTP server to serve API documentation
 * Usage: node serve-docs.js [port]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.argv[2] || 8080;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.md': 'text/markdown'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Handle root path
  if (req.url === '/' || req.url === '/index.html') {
    req.url = '/index.html';
  }

  // Determine file path
  let filePath = path.join(__dirname + '/docs', req.url);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File not found, try to serve documentation files
      if (req.url === '/api-docs') {
        filePath = path.join(__dirname, 'API_DOCUMENTATION.md');
      } else if (req.url === '/openapi') {
        filePath = path.join(__dirname, 'openapi.yml');
      } else {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
    }

    // Read and serve file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Internal server error');
        return;
      }

      // Determine content type
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'text/plain';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(port, () => {
  console.log(`📚 API Documentation Server`);
  console.log(`🌐 Server running at http://localhost:${port}`);
  console.log(`📖 HTML Documentation: http://localhost:${port}/docs/`);
  console.log(`📄 Markdown Documentation: http://localhost:${port}/api-docs`);
  console.log(`🔧 OpenAPI Spec: http://localhost:${port}/openapi`);
  console.log(`\nPress Ctrl+C to stop the server`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down documentation server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down documentation server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
}); 