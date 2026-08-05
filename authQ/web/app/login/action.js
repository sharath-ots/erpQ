// app/login/action.js
"use server";

export async function fetchUserRoles(email) {
  if (!email) return { roles: [] };

  try {
    // 1. Read directly from standard Node.js environment variables!
    // Since this is a "use server" file, these are read dynamically at RUNTIME
    // inside your Docker container. No external config.js needed.
    const erpUrl = process.env.VERSAQ_ERPNEXT_URL;
    const apiKey = process.env.VERSAQ_ERPNEXT_API_KEY;
    const apiSecret = process.env.VERSAQ_ERPNEXT_API_SECRET;

    if (!erpUrl || !apiKey || !apiSecret) {
      console.error("Missing ERPNext credentials in environment variables.");
      return { roles: [] };
    }

    // 2. Fetch from ERPNext securely
    const response = await fetch(`${erpUrl}/api/resource/User/${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `token ${apiKey}:${apiSecret}`
      },
      // cache: "no-store" forces Next.js to run this live, never caching the roles
      cache: "no-store" 
    });

    if (!response.ok) {
      console.error(`ERPNext API failed with status: ${response.status}`);
      return { roles: [] };
    }

    const data = await response.json();
    
    // 3. Map the roles and return them to the client
    const roles = data.data?.roles?.map(r => r.role) || [];
    
    return { roles };
  } catch (error) {
    console.error("Failed to fetch roles securely:", error);
    return { roles: [] };
  }
}