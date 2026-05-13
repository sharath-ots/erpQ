'use client';
import { createContext, use, useReducer, useState, useCallback } from 'react';
import { emailReducer } from 'reducers/EmailReducer';

const EmailContext = createContext({});
export const emailSidebarWidth = 375;

export const EmailProvider = ({ children }) => {
  const [emailState, emailDispatch] = useReducer(emailReducer, {
    emails: [],
    email: null,
    initialEmails: [],
  });

  const [resizableWidth, setResizableWidth] = useState(emailSidebarWidth);

  const fetchEmails = useCallback(async (leadId) => {
    console.log("🔍 [1/3] Calling API for Lead:", leadId);
    try {
      // 🚀 The exact path from your src/app/api/lead/lead-emails/route.js
      const response = await fetch(`/api/lead-emails?lead_id=${leadId}`);

      if (!response.ok) {
        console.error("❌ [2/3] API ROUTE FAILED. Status:", response.status);
        return;
      }

      const data = await response.json();
      console.log("✅ [3/3] API SUCCESS. Items received:", data.length);
      console.log("📦 Data Sample:", data[0]);

      // Use a unique type to ensure it doesn't get overwritten
      emailDispatch({ type: 'LOAD_REAL_DATA', payload: data });
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

export const useEmailContext = () => use(EmailContext);