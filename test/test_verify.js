import fetch from 'node-fetch';

const BASE = 'http://localhost:4000';

async function testVerify(code) {
  const res = await fetch(BASE + '/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', code })
  });
  const data = await res.json();
  console.log('Verify:', data);
}

// Replace '123456' with the actual code received by email
testVerify('123456');
