import { arcticPalette } from './arctic';
import { darkPalette } from './dark';
import { draculaPalette } from './dracula';
import { emberPalette } from './ember';
import { lightPalette } from './light';
import { luxuryPalette } from './luxury';
import { midnightPalette } from './midnight';
import { naturePalette } from './nature';
import { retroPalette } from './retro';

// 1. Import your new City-Q palettes
import { cityQLightPalette } from './city-q-light';
import { cityQDarkPalette } from './city-q-dark';

export const THEME_DISPLAY_NAMES = {
  'default-light': 'Light',
  'default-dark': 'Dark',
  luxury: 'Luxury',
  retro: 'Retro',
  arctic: 'Arctic',
  nature: 'Nature',
  ember: 'Ember',
  dracula: 'Dracula',
  midnight: 'Midnight',
  // 2. Add display names for the UI
  'city-q-light': 'City-Q Light',
  'city-q-dark': 'City-Q Dark',
};

export const lightPalettes = {
  'default-light': lightPalette,
  luxury: luxuryPalette,
  retro: retroPalette,
  arctic: arcticPalette,
  nature: naturePalette,
  // 3. Register the light palette
  'city-q-light': cityQLightPalette,
};

export const darkPalettes = {
  'default-dark': darkPalette,
  ember: emberPalette,
  dracula: draculaPalette,
  midnight: midnightPalette,
  // 4. Register the dark palette
  'city-q-dark': cityQDarkPalette,
};

export const allPalettes = {
  ...lightPalettes,
  ...darkPalettes,
};