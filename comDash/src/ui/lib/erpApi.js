// src/lib/erpApi.js

export const ERP_CONFIG = {
  // Notice we changed the baseUrl to our local proxy!
  baseUrl: '/api/erpnext',
  
  // ADMINISTRATOR CREDENTIALS 
  adminApiKey: 'YOUR_ADMIN_API_KEY_HERE',
  adminApiSecret: 'YOUR_ADMIN_API_SECRET_HERE',

  // USER / MANAGER CREDENTIALS
  userApiKey: 'YOUR_USER_API_KEY_HERE',
  userApiSecret: 'YOUR_USER_API_SECRET_HERE'
};

export async function fetchUserDetails() {
  const { baseUrl, userApiKey, userApiSecret } = ERP_CONFIG;

  if (!userApiKey || userApiKey === 'YOUR_USER_API_KEY_HERE') {
    return { fullName: 'Captain' }; 
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `token ${userApiKey}:${userApiSecret}`
  };

  try {
    // 1. Get the current logged-in user's ID
    const authResponse = await fetch(`${baseUrl}/method/frappe.auth.get_logged_user`, { 
      method: 'GET', headers, cache: 'no-store' 
    });
    
    const authData = await authResponse.json();
    const userEmail = authData.message;

    if (!userEmail) return { fullName: 'Captain' };

    // 2. Fetch the User document to get their actual First Name
    const userResponse = await fetch(`${baseUrl}/resource/User/${userEmail}`, { 
      method: 'GET', headers, cache: 'no-store' 
    });
    const userData = await userResponse.json();
    
    return {
      fullName: userData.data.first_name || userData.data.full_name || 'Captain',
      email: userEmail
    };

  } catch (error) {
    console.error("Failed to fetch User Details:", error);
    return { fullName: 'Captain' }; 
  }
}