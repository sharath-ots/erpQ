import CredentialsProvider from "next-auth/providers/credentials";

export const nextAuthOptions = {
  // 👇 1. ADD THE SECRET RIGHT HERE AT THE TOP
  secret: process.env.NEXTAUTH_SECRET || "temporary_fallback_secret_1234567890",

  providers: [
    CredentialsProvider({
      name: "ERPNext",
      credentials: {
        usr: { label: "Email / Username", type: "text" },
        pwd: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const erpnextUrl = process.env.NEXT_PUBLIC_ERPNEXT_URL;

        try {
          // 1. Call ERPNext Login API
          const loginRes = await fetch(`${erpnextUrl}/api/method/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              usr: credentials.usr,
              pwd: credentials.pwd,
            }),
          });

          if (!loginRes.ok) {
            throw new Error("Invalid username or password");
          }

          // 2. Extract the session cookie (sid) sent back by ERPNext
          const setCookieHeader = loginRes.headers.get('set-cookie');
          let sid = null;
          if (setCookieHeader) {
            const match = setCookieHeader.match(/sid=([^;]+)/);
            if (match) {
              sid = match[1];
            }
          }

          if (!sid) throw new Error("Failed to get session ID from ERPNext");

          // 3. Get the logged-in user's email/ID
          const userRes = await fetch(`${erpnextUrl}/api/method/frappe.auth.get_logged_user`, {
            headers: { 'Cookie': `sid=${sid}` }
          });
          const userData = await userRes.json();
          const userId = userData.message;

          // 4. Fetch the full User document to get their actual Name
          const profileRes = await fetch(`${erpnextUrl}/api/resource/User/${userId}`, {
            headers: {
              'Cookie': `sid=${sid}`,
              'Accept': 'application/json'
            }
          });
          const profileData = await profileRes.json();
          const userDoc = profileData.data;

          // 5. Send this data into the Next.js session
          return {
            id: userId,
            name: userDoc.full_name || userId,
            email: userDoc.email || userId,
            sid: sid,
          };
        } catch (error) {
          console.error("Login Error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sid = user.sid;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.sid = token.sid;
      return session;
    }
  },
  pages: {
    signIn: '/authentication/default/jwt/login',
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // Keep session alive for 24 hours
  }
};

// Exporting authOptions explicitly to prevent layout.jsx 500 errors
export const authOptions = nextAuthOptions;