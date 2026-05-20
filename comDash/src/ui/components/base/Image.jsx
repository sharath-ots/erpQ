'use client';

import NextImage from 'next/image';
import { styled } from '@mui/material/styles';
import { useThemeMode } from 'hooks/useThemeMode';

const StyledNextImage = styled(NextImage)({});

const Image = ({ src, alt = '', sx, ...props }) => {
  const { isDark } = useThemeMode();

  // 1. Safeguard: If src is missing entirely, render nothing (or put a placeholder string here)
  if (!src) {
    return null; 
  }

  let imageSrc;

  // 2. Process the src safely
  if (typeof src === 'string' || src?.src) {
    imageSrc = src;
  } else {
    // 3. Optional chaining (?.) added just to be extra safe
    imageSrc = isDark ? src?.dark : src?.light;
  }

  // Next/Image will throw a hard error if passed an empty string, so check one last time
  if (!imageSrc) return null;

  return <StyledNextImage src={imageSrc} alt={alt} unoptimized={true} sx={sx} {...props} />;
};

export default Image;