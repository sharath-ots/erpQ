'use client';

import { useMemo, useState, useEffect, useRef } from 'react'; // 🚀 Added useRef
import { usePathname, useSearchParams, useRouter } from 'next/navigation'; // 🚀 Added useRouter
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
  const searchParams = useSearchParams();
  const router = useRouter(); // 🚀 Hook for updating URL

  const [selectedEmailPopup, setSelectedEmailPopup] = useState(null);
  const [localEmails, setLocalEmails] = useState(explicitEmailList);
  const [liveSearchQuery, setLiveSearchQuery] = useState('');

  // 🚀 1. Grab the page from the URL if it exists (Default to 0)
  const initialPage = parseInt(searchParams.get('page') || '0', 10);
  const [page, setPage] = useState(initialPage);
  const rowsPerPage = 15;

  useEffect(() => {
    const query = searchParams.get('search');
    if (query !== null) {
      setLiveSearchQuery(query);
    }
  }, [searchParams]);

  const handleSearchIntercept = (e) => {
    if (e.target && e.target.tagName === 'INPUT' && e.target.id === 'search-box') {
      setLiveSearchQuery(e.target.value || '');
      setPage(0); 
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

  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);

  const isDetailsView = pathname.includes('/details/');
  let label = isDetailsView
    ? pathParts[pathParts.length - 2]
    : pathParts[pathParts.length - 1] || 'inbox';

  if (!label || label === 'undefined' || label === 'email') {
    label = 'inbox';
  }

  // 🚀 2. Only reset the page if the FOLDER changes (prevents resetting when opening an email)
  const prevLabelRef = useRef(label);
  useEffect(() => {
    if (prevLabelRef.current !== label) {
      setPage(0);
      prevLabelRef.current = label;
    }
  }, [label]);

  // 🚀 3. Automatically sync the URL when the page state changes
  useEffect(() => {
    const currentUrlPage = parseInt(searchParams.get('page') || '0', 10);
    if (currentUrlPage !== page) {
      const params = new URLSearchParams(searchParams.toString());
      if (page > 0) {
        params.set('page', page.toString());
      } else {
        params.delete('page');
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [page, pathname, router, searchParams]);

  const filteredEmails = useMemo(() => {
    const searchQuery = liveSearchQuery.toLowerCase().trim();

    return localEmails.filter((email) => {
      if (searchQuery) {
        return (
          (email.subject?.toLowerCase().includes(searchQuery)) ||
          (email.sender_email?.toLowerCase().includes(searchQuery)) ||
          (email.user?.name?.toLowerCase().includes(searchQuery)) ||
          (email.details?.toLowerCase().includes(searchQuery))
        );
      }

      if (label === 'starred') return email.starred === true;
      if (label === 'important') return email.important === true;
      return email.folder === label || email.label === label;
    });
  }, [localEmails, label, liveSearchQuery]);

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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }} onInput={handleSearchIntercept}>
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
    </Box>
  );
};

export default EmailListContainer;