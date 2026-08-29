require('dotenv').config();
const https = require('https');

const key = process.env.GEMINI_API_KEY;
console.log('Key prefix:', key.slice(0, 10));

const body = JSON.stringify({
  contents: [{ parts: [{ text: "Say hello" }] }]
});

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('HTTP status:', res.statusCode);
    console.log('Response:', data.slice(0, 500));
  });
});
req.on('error', e => console.log('Network error:', e.message));
req.write(body);
req.end();
