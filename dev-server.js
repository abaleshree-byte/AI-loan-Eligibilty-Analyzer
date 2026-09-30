'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 8_192) {
        reject(new Error('Request is too large.'));
        request.pause();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    request.on('error', reject);
  });
}

function createApiResponse(response) {
  return {
    statusCode: 200,
    setHeader(name, value) {
      response.setHeader(name, value);
    },
    end(body) {
      response.statusCode = this.statusCode;
      response.end(body);
    },
  };
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname.startsWith('/api/')) {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return writeJson(response, 405, { error: 'Use POST for this endpoint.' });
    }
    let body;
    try {
      body = await readJson(request);
    } catch (error) {
      return writeJson(response, error.message === 'Request is too large.' ? 413 : 400, { error: error.message });
    }
    const apiName = pathname === '/api/financial-advice' ? 'financial-advice'
      : pathname === '/api/save-analysis' ? 'save-analysis' : null;
    if (!apiName) return writeJson(response, 404, { error: 'API endpoint not found.' });
    const handler = require(path.join(root, 'api', `${apiName}.js`));
    const apiResponse = createApiResponse(response);
    try {
      await handler({ method: request.method, headers: request.headers, body }, apiResponse);
    } catch (error) {
      console.error(`Local API ${apiName} failed:`, error);
      if (!response.headersSent) writeJson(response, 500, { error: 'The request could not be processed.' });
      else response.end();
    }
    return;
  }

  let requestedPath;
  try {
    requestedPath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  } catch {
    return writeJson(response, 400, { error: 'Invalid URL path.' });
  }
  const absolutePath = path.resolve(root, `.${requestedPath}`);
  if (!absolutePath.startsWith(`${root}${path.sep}`)) return writeJson(response, 403, { error: 'Forbidden.' });
  fs.readFile(absolutePath, (error, data) => {
    if (error) return writeJson(response, 404, { error: 'File not found.' });
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(absolutePath)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(data);
  });
});

server.listen(port, () => {
  console.log(`AI Loan Eligibility Checker running at http://localhost:${port}`);
});
