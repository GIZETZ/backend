import fetch from 'node-fetch';

const BASE = 'http://localhost:4000';

async function testRefresh(refresh_token) {
  const res = await fetch(BASE + '/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token })
  });
  const data = await res.json();
  console.log('Refresh:', data);
}

// Replace with actual refresh_token
testRefresh('your_refresh_token_here');
