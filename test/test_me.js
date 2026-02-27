import fetch from 'node-fetch';

const BASE = 'http://localhost:4000';

async function testMe(access_token) {
  const res = await fetch(BASE + '/me', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + access_token }
  });
  const data = await res.json();
  console.log('Me:', data);
}

// Replace with actual access_token
testMe('your_access_token_here');
