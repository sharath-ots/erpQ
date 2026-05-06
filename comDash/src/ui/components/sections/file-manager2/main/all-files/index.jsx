'use client';

import { usePathname, useRouter } from 'next/navigation';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import dayjs from 'dayjs';

import { useFileManager } from 'providers/FileManagerProvider';
import paths from 'routes/paths';
import IconifyIcon from 'components/base/IconifyIcon';
import FilterAndSort from './FilterAndSort';
import NoFilesFound from './NoFilesFound';
import GridView from './grid-view';
import ListView from './list-view';

// Import your working Zoho Hook
import { useZohoWorkdrive } from 'services/swr/api-hooks/useZohoWorkdrive';

const AllFiles = () => {
  const { viewMode, selectedFiles, filter } = useFileManager();
  const router = useRouter();
  const pathname = usePathname();

  // Fetch the live data
  const { files: zohoFiles, isLoading, isError } = useZohoWorkdrive();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', width: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !Array.isArray(zohoFiles)) {
    return <Typography color="error" sx={{ p: 5 }}>Error loading Zoho files.</Typography>;
  }

  // Use the Zoho files instead of the dummy data
  const currentFolder = zohoFiles.find((folder) => folder.id.toString() === pathname.split('/').pop());

  const currentFiles = zohoFiles.filter((file) => {
    switch (filter) {
      case 'all':
        return file;
      case 'recent':
        return dayjs().diff(dayjs(file.uploadedAt), 'month') <= 12; // Show files from the last year
      case 'folder':
        return file.type === 'folder';
      case 'favorite':
        return file.favorite;
      case 'shared':
        return file.shared?.length > 0;
      default:
        return file;
    }
  });

  return (
    <Paper sx={{ height: 1, p: { xs: 3, md: 5 }, flexGrow: 1 }}>
      <Container maxWidth={false} sx={{ maxWidth: 1, height: 1, p: '0 !important' }}>
        {!(pathname === paths.fileManager || pathname === paths.fileManager + '/') ? (
          <Breadcrumbs
            separator={<IconifyIcon icon="material-symbols:navigate-next" sx={{ fontSize: 20 }} />}
            sx={{ mb: 2 }}
          >
            <Typography
              component={Link}
              onClick={() => router.back()}
              variant="h5"
              sx={{ fontSize: { xs: 20, md: 24 }, cursor: 'pointer' }}
            >
              My Folders
            </Typography>
            <Typography variant="h5" sx={{ fontSize: { xs: 20, md: 24 } }}>
              {currentFolder?.name || 'Folder'}
            </Typography>
          </Breadcrumbs>
        ) : (
          <Typography variant="h5" sx={{ mb: 2, fontSize: { xs: 20, md: 24 } }}>
            My Folders (Zoho)
          </Typography>
        )}

        {zohoFiles.length > 0 && <FilterAndSort />}
        {currentFiles.length === 0 && <NoFilesFound />}

        {viewMode === 'grid' && currentFiles.length > 0 && <GridView allFiles={currentFiles} />}
        {viewMode === 'list' && currentFiles.length > 0 && (
          <ListView allFiles={currentFiles} selectedFiles={selectedFiles} />
        )}
      </Container>
    </Paper>
  );
};

export default AllFiles;