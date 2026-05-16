'use client';

// 🚀 1. Import useContext instead of use
import { createContext, useContext, useReducer, useState, useCallback } from 'react';
import { emailReducer } from 'reducers/EmailReducer';

const EmailContext = createContext({});

export const emailSidebarWidth = 200;

// 🚀 2. Removed "export const" here to restore the default export below
const EmailProvider = ({ children }) => {
  const [emailState, emailDispatch] = useReducer(emailReducer, {
    emails: [],
    email: null,
    initialEmails: [],
  });

  const [resizableWidth, setResizableWidth] = useState(emailSidebarWidth);

  const fetchEmails = useCallback(async (leadId) => {
    console.log("🔍 [1/3] Calling API for Lead:", leadId);
    const timestamp = new Date().getTime();

    try {
      const response = await fetch(`/api/email-app?bypass=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        console.error("❌ [2/3] API ROUTE FAILED. Status:", response.status);
        return;
      }

      const data = await response.json();
      console.log("✅ [3/3] API SUCCESS. Items received:", data.length);

      if (Array.isArray(data)) {
        emailDispatch({ type: 'INITIALIZE_EMAILS', payload: data });
      } else {
        console.error("❌ Data is not an array:", data);
      }

    } catch (error) {
      console.error("❌ FATAL ERROR:", error);
    }
  }, []);

  return (
    <EmailContext.Provider value={{ emailState, emailDispatch, fetchEmails, resizableWidth }}>
      {children}
    </EmailContext.Provider>
  );
};

// 🚀 3. Restored default export so your layout.jsx wrapper actually works!
export default EmailProvider;

// 🚀 4. Safely use standard useContext
export const useEmailContext = () => useContext(EmailContext);