"use server";

export async function fetchUserRoles(email) {
  if (!email) return { roles: [] };

  try {
    // Falls back to your specific URL if the env variable isn't set
    const erpUrl = process.env.ERPNEXT_URL ?? "https://cityqerp.ortusolis.in";
    
    // Ensure these are set in your .env.local file
    const apiKey = process.env.ERPNEXT_API_KEY;
    const apiSecret = process.env.ERPNEXT_API_SECRET;

    const response = await fetch(`${erpUrl}/api/resource/User/${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `token ${apiKey}:${apiSecret}`
      },
      // Ensure Next.js doesn't cache this so we always get live roles
      cache: "no-store" 
    });

    if (!response.ok) {
      console.error(`ERPNext API failed with status: ${response.status}`);
      return { roles: [] };
    }

    const data = await response.json();
    
    // Map Frappe's child table array into a simple string array: ["System Manager", "Supplier Portal User"]
    const roles = data.data?.roles?.map(r => r.role) || [];
    
    return { roles };
  } catch (error) {
    console.error("Failed to fetch roles securely:", error);
    return { roles: [] };
  }
}