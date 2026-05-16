'use client';

import { useMemo, useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Stack, Typography, Dialog, DialogContent, IconButton, Box, Divider } from '@mui/material';
import dayjs from 'dayjs';

import Image from 'components/base/Image';
import SimpleBar from 'components/base/SimpleBar';
import EmailHeader from './EmailHeader';
import EmailList from './EmailList';
import EmailListHeader from './email-list-header/EmailListHeader';
import IconifyIcon from 'components/base/IconifyIcon';
import EmailDetailsContainer from '../email-details/EmailDetailsContainer';

const EmailListContainer = ({ toggleDrawer, explicitEmailList = [] }) => {
  const [selectedEmailPopup, setSelectedEmailPopup] = useState(null);
  const searchParams = useSearchParams();

  const [localEmails, setLocalEmails] = useState(explicitEmailList);

  // 🚀 1. THE FAILSAFE SEARCH STATE
  const [liveSearchQuery, setLiveSearchQuery] = useState('');

  // 🚀 2. EVENT BUBBLING INTERCEPTOR
  // This catches every keystroke typed into the EmailHeader without needing global state!
  const handleSearchIntercept = (e) => {
    if (e.target && e.target.tagName === 'INPUT') {
      setLiveSearchQuery(e.target.value || '');
      setPage(0); // Instantly reset to page 1 when they start typing
    }
  };

  useEffect(() => {
    setLocalEmails(explicitEmailList);
  }, [explicitEmailList]);

  // Bulk UI Updater
  useEffect(() => {
    const handleBulkUpdate = (e) => {
      const { ids, field, value } = e.detail;
      setLocalEmails((prevMails) =>
        prevMails.map((email) =>
          ids.includes(email.id) ? { ...email, [field]: value } : email
        )
      );
    };

    window.addEventListener('APP_BULK_EMAIL_UPDATE', handleBulkUpdate);
    return () => window.removeEventListener('APP_BULK_EMAIL_UPDATE', handleBulkUpdate);
  }, []);

  const [page, setPage] = useState(0);
  const rowsPerPage = 15;

  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);

  const isDetailsView = pathname.includes('/details/');
  let label = isDetailsView
    ? pathParts[pathParts.length - 2]
    : pathParts[pathParts.length - 1] || 'inbox';

  if (!label || label === 'undefined' || label === 'email') {
    label = 'inbox';
  }

  useEffect(() => {
    setPage(0);
  }, [label]);

  // 🚀 3. THE MASTER FILTER (Now powered by live typing)
  const filteredEmails = useMemo(() => {
    let filtered = localEmails.filter((email) => {
      if (label === 'starred') return email.starred === true;
      if (label === 'important') return email.important === true;
      if (label === 'sent') return email.folder === 'sent' || email.label === 'sent';
      if (label === 'inbox') return email.folder === 'inbox' || email.label === 'inbox';

      return email.folder === label || email.label === label;
    });

    // Check our live typing interceptor first, fallback to URL parameters if they hit Enter
    const activeSearch = liveSearchQuery || searchParams.get('search') || searchParams.get('q') || '';
    const searchQuery = activeSearch.toLowerCase().trim();

    if (searchQuery) {
      filtered = filtered.filter((email) =>
        (email.subject && email.subject.toLowerCase().includes(searchQuery)) ||
        (email.sender_email && email.sender_email.toLowerCase().includes(searchQuery)) ||
        (email.user?.name && email.user.name.toLowerCase().includes(searchQuery)) ||
        (email.user?.email && email.user.email.toLowerCase().includes(searchQuery)) ||
        (email.description && email.description.toLowerCase().includes(searchQuery))
      );
    }

    return filtered;
  }, [localEmails, label, liveSearchQuery, searchParams]);

  const paginatedList = useMemo(() => {
    const start = page * rowsPerPage;

    const sortedEmails = [...filteredEmails].sort((a, b) => {
      return dayjs(b.time).valueOf() - dayjs(a.time).valueOf();
    });

    return sortedEmails.slice(start, start + rowsPerPage);
  }, [filteredEmails, page, rowsPerPage]);

  const emailData = useMemo(() => {
    return paginatedList.reduce(
      (acc, val) => {
        const emailDateStr = typeof val.time === 'string' ? val.time.split('T')[0] : dayjs(val.time).format('YYYY-MM-DD');
        const todayStr = dayjs().format('YYYY-MM-DD');
        const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

        if (emailDateStr === todayStr) acc.today.push(val);
        else if (emailDateStr === yesterdayStr) acc.yesterday.push(val);
        else acc.older.push(val);
        return acc;
      },
      { today: [], yesterday: [], older: [] },
    );
  }, [paginatedList]);

  return (
    < Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }
    } onInput={handleSearchIntercept} >
      <SimpleBar sx={{ flex: 1, py: 2 }}>
        <Stack direction="column">

          <EmailHeader toggleDrawer={toggleDrawer} />

          <EmailListHeader
            page={page}
            setPage={setPage}
            total={filteredEmails.length}
            rowsPerPage={rowsPerPage}
          />

          <Stack direction="column" gap={1} sx={{ flex: 1, mt: 2 }}>
            {Object.keys(emailData).map((key) =>
              emailData[key].length > 0 && (
                <EmailList
                  key={key}
                  title={key.charAt(0).toUpperCase() + key.slice(1)}
                  emails={emailData[key]}
                  onEmailClick={(mail) => setSelectedEmailPopup(mail)}
                />
              )
            )}

            {filteredEmails.length === 0 && (
              <Stack direction="column" sx={{ alignItems: 'center', py: 10 }}>
                <Image src={{ light: '/assets/images/illustrations/7.webp', dark: '/assets/images/illustrations/7-dark.webp' }} width={100} height={100} alt="Empty" />
                <Typography variant="subtitle1" sx={{ fontWeight: 500, mt: 2 }}>
                  {liveSearchQuery || searchParams.get('search')
                    ? `No results found for "${liveSearchQuery || searchParams.get('search')}".`
                    : `No conversations found in ${label}.`}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Stack>
      </SimpleBar>

      <Divider />

      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper' }}>
        <Typography variant="caption" color="text.secondary">
          Showing {paginatedList.length} of {filteredEmails.length} conversations
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            size="small"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <IconifyIcon icon="material-symbols:chevron-left" />
          </IconButton>
          <Typography variant="caption">
            Page {page + 1} of {Math.ceil(filteredEmails.length / rowsPerPage) || 1}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setPage(p => (page + 1) * rowsPerPage < filteredEmails.length ? p + 1 : p)}
            disabled={(page + 1) * rowsPerPage >= filteredEmails.length}
          >
            <IconifyIcon icon="material-symbols:chevron-right" />
          </IconButton>
        </Stack>
      </Box>

      <Dialog open={Boolean(selectedEmailPopup)} onClose={() => setSelectedEmailPopup(null)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0 }}>
          {selectedEmailPopup && <EmailDetailsContainer explicitEmails={[selectedEmailPopup]} />}
        </DialogContent>
      </Dialog>
    </Box >
  );
};

export default EmailListContainer;