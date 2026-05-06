// src/lib/erpBackend.js
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../secrets';
export async function fetchERP(endpoint, role = 'user') {
  const baseUrl = CITYQ_ERPNEXT_URL;

  // Decide which keys to use based on the requested role
  const apiKey = role === 'admin' ? ERPNEXT_API_KEY : ERPNEXT_API_KEY;
  const apiSecret = role === 'admin' ? ERPNEXT_API_SECRET : ERPNEXT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(`ERPNext ${role} API keys are missing in .env file!`);
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `token ${apiKey}:${apiSecret}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`ERPNext API Failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}