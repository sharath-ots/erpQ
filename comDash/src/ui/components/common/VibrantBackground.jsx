import { Box, useTheme } from '@mui/material';
import sidebarVibrant from '../../../../public/assets/images/background/8.webp';
import topbarVibrant from '../../../../public/assets/images/background/7.webp';

const VibrantBackground = ({ position }) => {
  const theme = useTheme();

  return (
    <Box
      sx={[
        {
          backgroundPositionX: theme.direction === 'rtl' ? 'right' : 'left',
          backgroundPositionY: 'top',
          top: 0,
          position: 'absolute',
          transform: theme.direction === 'rtl' ? 'scaleX(-1)' : 'none',
          height: '100%',
          width: '100%',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'background.default',
            opacity: 0.8,
          },
        },
        position === 'top' && {
          background: `url(${topbarVibrant.src}) no-repeat`,
          backgroundSize: 'cover',
        },
        position === 'side' && {
          background: `url(${sidebarVibrant.src}) no-repeat`,
          backgroundSize: 'cover',
        },
      ]}
    />
  );
};

export default VibrantBackground;
