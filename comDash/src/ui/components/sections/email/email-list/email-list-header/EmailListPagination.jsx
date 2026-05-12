import { usePathname } from 'next/navigation';
import { IconButton, Typography } from '@mui/material';
import { useEmailContext } from 'providers/EmailProvider';
import IconifyIcon from 'components/base/IconifyIcon';
import CardHeaderAction from 'components/common/CardHeaderAction';

const EmailListPagination = () => {
  const { resizableWidth } = useEmailContext();
  // NEW LOGIC: Extract label from path
  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);
  // Looks for 'list'. If found, grabs the word after it. If not, defaults to 'inbox'.
  const id = pathParts.includes('list') ? pathParts[pathParts.length - 1] : 'inbox';

  return (
    <CardHeaderAction>
      <Typography
        variant="caption"
        sx={[
          { color: 'text.secondary', display: 'none' },
          (!id || resizableWidth > 500) && { display: { sm: 'inline-flex' } },
        ]}
      >
        24{' '}
        <Typography variant="caption" sx={{ mx: 0.5 }}>
          out of
        </Typography>{' '}
        3,234
      </Typography>
      <IconButton size="small">
        <IconifyIcon
          flipOnRTL
          icon="material-symbols:chevron-left-rounded"
          sx={{ fontSize: 20, color: 'text.primary' }}
        />
      </IconButton>
      <IconButton size="small">
        <IconifyIcon
          flipOnRTL
          icon="material-symbols:chevron-right-rounded"
          sx={{ fontSize: 20, color: 'text.primary' }}
        />
      </IconButton>
    </CardHeaderAction>
  );
};

export default EmailListPagination;
