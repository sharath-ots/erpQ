import { addCollection } from '@iconify/react';
import icons from 'lib/iconify/icon-datasets';

// In some build/resolve edge-cases (monorepo, server/client boundaries),
// this import can end up undefined during early boot. Never let that crash the app.
const safeIcons = icons && typeof icons === 'object' ? icons : {};

const isIconData = (obj) => {
  return typeof obj === 'object' && obj !== null && 'body' in obj;
};

const collections = Object.entries(
  Object.entries(safeIcons).reduce((acc, [key, value]) => {
    const [prefix, iconName] = key.split(':');
    if (!acc[prefix]) acc[prefix] = {};

    if (isIconData(value)) {
      acc[prefix][iconName] = value;
    } else {
      console.warn(`Invalid icon data for ${prefix}:${iconName}`);
    }

    return acc;
  }, {}),
).map(([prefix, icons]) => ({
  prefix,
  icons,
  width: prefix === 'twemoji' ? 36 : 24,
  height: prefix === 'twemoji' ? 36 : 24,
}));

export const allIconNames = Object.keys(safeIcons);

export const registerIcons = () => {
  // Prevent repeated registrations on every IconifyIcon render.
  if (registerIcons.__didRegister) return;
  collections.forEach((collection) => addCollection(collection));
  registerIcons.__didRegister = true;
};
