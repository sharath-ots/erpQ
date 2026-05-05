import { alpha } from '@mui/material/styles';
import { cssVarRgba, generatePaletteChannel } from 'lib/utils';
import { basic } from '../colors/base';
import {
  cityQError,
  cityQInfo,
  cityQNeutral,
  cityQPrimary,
  cityQSecondary,
  cityQSuccess,
  cityQWarning,
} from '../colors/city-q';

export const cityQLightPaletteMainColors = {
  primary: cityQPrimary[500],
  secondary: cityQSecondary[500],
  error: cityQError[500],
  warning: cityQWarning[500],
  info: cityQInfo[500],
  success: cityQSuccess[500],
  neutral: cityQNeutral[600],
  paper: '#FFFFFF',
};

const common = generatePaletteChannel({ white: basic.white, black: basic.black });
const grey = generatePaletteChannel(cityQNeutral);

const primary = generatePaletteChannel({
  lighter: cityQPrimary[50],
  light: cityQPrimary[400],
  main: cityQPrimary[500],
  dark: cityQPrimary[600],
  darker: cityQPrimary[900],
  contrastText: common.white,
});

const secondary = generatePaletteChannel({
  lighter: cityQSecondary[50],
  light: cityQSecondary[400],
  main: cityQSecondary[500],
  dark: cityQSecondary[600],
  darker: cityQSecondary[900],
  contrastText: common.white,
});

const error = generatePaletteChannel({
  lighter: cityQError[50],
  light: cityQError[400],
  main: cityQError[500],
  dark: cityQError[600],
  darker: cityQError[900],
  contrastText: common.white,
});

const warning = generatePaletteChannel({
  lighter: cityQWarning[50],
  light: cityQWarning[400],
  main: cityQWarning[500],
  dark: cityQWarning[600],
  darker: cityQWarning[900],
  contrastText: common.white,
});

const info = generatePaletteChannel({
  lighter: cityQInfo[50],
  light: cityQInfo[400],
  main: cityQInfo[500],
  dark: cityQInfo[600],
  darker: cityQInfo[900],
  contrastText: common.white,
});

const success = generatePaletteChannel({
  lighter: cityQSuccess[50],
  light: cityQSuccess[400],
  main: cityQSuccess[500],
  dark: cityQSuccess[600],
  darker: cityQSuccess[900],
  contrastText: common.white,
});

const text = generatePaletteChannel({
  primary: grey[800],
  secondary: grey[600],
  disabled: grey[400],
});

const background = generatePaletteChannel({
  default: '#F4F6F8',
  paper: '#FFFFFF',
  elevation1: grey[50],
  elevation2: grey[100],
  elevation3: grey[200],
  elevation4: grey[300],
  menu: '#FFFFFF',
  menuElevation1: grey[50],
  menuElevation2: grey[100],
});

const divider = grey[300];
const menuDivider = cssVarRgba(grey['300Channel'], 0.5);
const dividerLight = cssVarRgba(grey['300Channel'], 0.6);

const action = {
  active: grey[600],
  hover: cssVarRgba(grey['500Channel'], 0.08),
  selected: cssVarRgba(grey['500Channel'], 0.16),
  disabled: cssVarRgba(grey['500Channel'], 0.8),
  disabledBackground: cssVarRgba(grey['500Channel'], 0.24),
  focus: cssVarRgba(grey['500Channel'], 0.24),
  hoverOpacity: 0.08,
  disabledOpacity: 0.48,
};

const vibrant = {
  listItemHover: cssVarRgba(common.whiteChannel, 0.5),
  buttonHover: cssVarRgba(common.whiteChannel, 0.7),
  textFieldHover: cssVarRgba(common.whiteChannel, 0.7),
  text: {
    secondary: alpha('#1B150F', 0.76),
    disabled: alpha('#1B150F', 0.4),
  },
  overlay: cssVarRgba(common.whiteChannel, 0.7),
};

export const cityQLightPalette = {
  mode: 'light',
  primary,
  secondary,
  error,
  warning,
  info,
  success,
  grey,
  common,
  text,
  background,
  divider,
  menuDivider,
  dividerLight,
  action,
  vibrant,
};