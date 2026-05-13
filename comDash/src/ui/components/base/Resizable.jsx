'use client';

import { useEffect, useRef } from 'react';
import { Box, useTheme } from '@mui/material';
import { Resizable as ReResizable } from 're-resizable';

const Resizable = ({ children, handleResize, sx, ...rest }) => {
  const { direction } = useTheme();
  const resizableRef = useRef(null);

  // 🚀 FIX 1: Add a safety check to ensure it's a function before calling
  const onResize = (e, dir, ref) => {
    if (typeof handleResize === 'function') {
      handleResize(ref.offsetWidth);
    }
  };

  useEffect(() => {
    const updateWidthOnResize = () => {
      // 🚀 FIX 2: Correct way to access the width from re-resizable ref
      const currentWidth = resizableRef.current?.resizable?.offsetWidth || 0;

      if (typeof handleResize === 'function') {
        handleResize(currentWidth);
      }
    };

    window.addEventListener('resize', updateWidthOnResize);

    // Initial call
    updateWidthOnResize();

    // 🚀 FIX 3: Explicitly return the cleanup function
    return () => {
      window.removeEventListener('resize', updateWidthOnResize);
    };
  }, [handleResize]); // Added handleResize to dependency array for safety

  return (
    <Box
      component={ReResizable}
      ref={resizableRef}
      onResize={onResize}
      sx={{ ...sx }}
      enable={{
        top: false,
        right: direction !== 'rtl',
        bottom: false,
        left: direction === 'rtl',
        topRight: false,
        bottomRight: false,
        bottomLeft: false,
        topLeft: false,
      }}
      handleClasses={{ [direction === 'rtl' ? 'left' : 'right']: 'resizable-handler' }}
      minWidth={375}
      {...rest}
    >
      {children}
    </Box>
  );
};

export default Resizable;