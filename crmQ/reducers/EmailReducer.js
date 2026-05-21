import dayjs from 'dayjs';

export const DELETE_EMAIL = 'DELETE_EMAIL';
export const ARCHIVE_EMAIL = 'ARCHIVE_EMAIL';
export const SNOOZE_EMAIL = 'SNOOZE_EMAIL';
export const STARRED_EMAIL = 'STARRED_EMAIL';
export const IMPORTANT_EMAIL = 'IMPORTANT_EMAIL';
export const UPDATE_MESSAGE_STATUS = 'UPDATE_MESSAGE_STATUS';
export const SEARCH_EMAIL = 'SEARCH_EMAIL';
export const REFRESH_EMAILS = 'REFRESH_EMAILS';
export const GET_EMAILS = 'GET_EMAILS';
export const GET_EMAIL = 'GET_EMAIL';
export const INITIALIZE_EMAILS = 'INITIALIZE_EMAILS';

export const emailReducer = (state, action) => {
  switch (action.type) {
    case INITIALIZE_EMAILS:
    case 'INITIALIZE_EMAILS': {
      const safeData = Array.isArray(action.payload) ? action.payload : [];
      return {
        ...state,
        initialEmails: safeData,
        emails: safeData, // Force all data to show immediately
      };
    }

    case GET_EMAILS:
    case 'GET_EMAILS': {
      const folder = (action.payload || 'inbox').toLowerCase();
      const sourceData = state.initialEmails || [];

      // 🚀 CRITICAL FIX: If folder is missing from API, assume it's INBOX
      const filteredEmails = sourceData.filter((email) => {
        const emailFolder = (email.folder || 'inbox').toLowerCase();

        if (folder === 'inbox') return emailFolder === 'inbox' && email.folder !== 'trash';
        if (folder === 'starred') return email.starred === true;
        if (folder === 'important') return email.important === true;
        if (folder === 'snoozed') return email.snoozedTill !== null;

        return emailFolder === folder;
      });

      return { ...state, emails: filteredEmails };
    }

    case SEARCH_EMAIL:
    case 'SEARCH_EMAIL': {
      const { query } = action.payload;
      const queryText = (query || '').toLowerCase();
      const sourceData = state.initialEmails || [];

      const searchedEmails = sourceData.filter((email) => {
        if (email.folder === 'trash') return false;
        const userEmail = (email?.user?.email || '').toLowerCase();
        const userName = (email?.user?.name || '').toLowerCase();
        const subject = (email?.subject || '').toLowerCase();
        return userEmail.includes(queryText) || userName.includes(queryText) || subject.includes(queryText);
      });

      return { ...state, emails: searchedEmails };
    }

    case GET_EMAIL:
    case 'GET_EMAIL': {
      const targetId = action.payload ? String(action.payload) : null;
      const found = state.initialEmails.find((e) => String(e.id) === targetId);
      return { ...state, email: found || null };
    }

    default:
      return state;
  }
};