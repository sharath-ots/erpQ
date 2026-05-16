import { usePathname } from 'next/navigation';
import Grid from '@mui/material/Grid';
import { useEmailContext } from 'providers/EmailProvider';
import CardHeaderAction from 'components/common/CardHeaderAction';
import EmailListActions from './EmailListActions';
import EmailListPagination from './EmailListPagination';

// 🚀 ACCEPT THE PROPS
const EmailListHeader = ({ page, setPage, total, rowsPerPage }) => {
  const { resizableWidth } = useEmailContext();
  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);
  const id = pathParts.includes('list') ? pathParts[pathParts.length - 1] : 'inbox';

  const isInvalidOrLargeWidth = !id || resizableWidth > 500;

  return (
    <Grid
      container
      rowSpacing={1}
      alignItems="center"
      sx={[
        {
          px: 3,
          py: 3,
          position: 'sticky',
          top: 0,
          bgcolor: 'background.default',
          zIndex: 5,
          marginLeft: '1px',
          flexWrap: 'wrap',
        },
        isInvalidOrLargeWidth && { px: { sm: 5 } },
      ]}
    >
      <Grid>
        <CardHeaderAction sx={{ mx: '-7px' }}>
          <EmailListActions />
        </CardHeaderAction>
      </Grid>
      <Grid sx={{ ml: 'auto' }}>
        {/* 🚀 PASS THEM DOWN */}
        <EmailListPagination page={page} setPage={setPage} total={total} rowsPerPage={rowsPerPage} />
      </Grid>
    </Grid>
  );
};

export default EmailListHeader;