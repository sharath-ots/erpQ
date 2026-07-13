"use server"; // This magic line tells Next.js this runs securely on the Node backend

// NOTE: Adjust the path to secrets.js based on where it actually lives!
import { ERPNEXT_API_KEY, ERPNEXT_API_SECRET, CITYQ_ERPNEXT_URL } from '../../../secrets';

export async function fetchUserRoles(accessToken) {
  try {

    // 1. Identify User using the access token passed from the frontend
    const userRes = await fetch(`${CITYQ_ERPNEXT_URL}/api/method/frappe.auth.get_logged_user`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`, // Adjust to 'token ...' if using frappe keys here
        "Content-Type": "application/json"
      }
    });

    if (!userRes.ok) {
      return { success: false, error: "Unauthorized: Could not verify user token" };
    }

    const userData = await userRes.json();
    const userId = userData.message;

    // 2. Setup Admin Headers using your System Keys
    const adminHeaders = new Headers({
      "Content-Type": "application/json",
      "Authorization": `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`
    });

    // 3. Fetch the User Document
    const userDocRes = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/User/${encodeURIComponent(userId)}`, {
      headers: adminHeaders
    });

    if (!userDocRes.ok) return { success: false, error: "Failed to fetch user document with API Keys" };
    
    const userDocData = await userDocRes.json();
    const roleProfileName = userDocData.data.role_profile_name;

    if (!roleProfileName) {
      return { success: true, profile: "No Profile Assigned", roles: [] };
    }

    // 4. Fetch the Role Profile Document
    const roleProfileRes = await fetch(`${CITYQ_ERPNEXT_URL}/api/resource/Role Profile/${encodeURIComponent(roleProfileName)}`, {
      headers: adminHeaders
    });

    if (!roleProfileRes.ok) return { success: false, error: "Failed to fetch role profile" };
    
    const roleProfileData = await roleProfileRes.json();
    const assignedRoles = roleProfileData.data.roles.map(row => row.role);

    return { success: true, profile: roleProfileName, roles: assignedRoles };

  } catch (error) {
    console.error("Server Action Error:", error);
    return { success: false, error: error.message };
  }
}