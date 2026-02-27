import fetch from 'node-fetch';

const BASE = 'http://localhost:4000';

async function testRequest() {
  const res = await fetch(BASE + '/auth/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com' })
  });
  const data = await res.json();
  console.log('Request:', data);
}

testRequest();
