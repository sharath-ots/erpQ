import { usePathname } from 'next/navigation';
import { IconButton, Typography } from '@mui/material';
import { useEmailContext } from 'providers/EmailProvider';
import IconifyIcon from 'components/base/IconifyIcon';
import CardHeaderAction from 'components/common/CardHeaderAction';

const EmailListPagination = ({ page, setPage, total, rowsPerPage }) => {
  const { resizableWidth } = useEmailContext();
  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);
  const id = pathParts.includes('list') ? pathParts[pathParts.length - 1] : 'inbox';

  // 🚀 MATH LOGIC
  const from = total === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min((page + 1) * rowsPerPage, total);

  const handlePrev = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => (to < total ? p + 1 : p));

  return (
    <CardHeaderAction>
      <Typography
        variant="caption"
        sx={[
          { color: 'text.secondary', display: 'none' },
          (!id || resizableWidth > 500) && { display: { sm: 'inline-flex' } },
        ]}
      >
        {from} - {to}{' '}
        <Typography variant="caption" sx={{ mx: 0.5 }}>
          of
        </Typography>{' '}
        {total}
      </Typography>
      <IconButton size="small" onClick={handlePrev} disabled={page === 0}>
        <IconifyIcon
          flipOnRTL
          icon="material-symbols:chevron-left-rounded"
          sx={{ fontSize: 20, color: page === 0 ? 'text.disabled' : 'text.primary' }}
        />
      </IconButton>
      <IconButton size="small" onClick={handleNext} disabled={to >= total}>
        <IconifyIcon
          flipOnRTL
          icon="material-symbols:chevron-right-rounded"
          sx={{ fontSize: 20, color: to >= total ? 'text.disabled' : 'text.primary' }}
        />
      </IconButton>
    </CardHeaderAction>
  );
};

export default EmailListPagination;