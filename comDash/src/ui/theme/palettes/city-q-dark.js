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

export const cityQDarkPaletteMainColors = {
  primary: cityQPrimary[500],
  secondary: cityQSecondary[500],
  error: cityQError[500],
  warning: cityQWarning[500],
  info: cityQInfo[500],
  success: cityQSuccess[500],
  neutral: cityQNeutral[600],
  paper: '#161C24',
};

const common = generatePaletteChannel({ white: basic.white, black: basic.black });
const grey = generatePaletteChannel(cityQNeutral);

const primary = generatePaletteChannel({
  lighter: cityQPrimary[100],
  light: cityQPrimary[300],
  main: cityQPrimary[500],
  dark: cityQPrimary[700],
  darker: cityQPrimary[900],
  contrastText: common.white,
});

const secondary = generatePaletteChannel({
  lighter: cityQSecondary[100],
  light: cityQSecondary[300],
  main: cityQSecondary[500],
  dark: cityQSecondary[700],
  darker: cityQSecondary[900],
  contrastText: common.white,
});

const error = generatePaletteChannel({
  lighter: cityQError[100],
  light: cityQError[300],
  main: cityQError[500],
  dark: cityQError[700],
  darker: cityQError[900],
  contrastText: common.white,
});

const warning = generatePaletteChannel({
  lighter: cityQWarning[100],
  light: cityQWarning[300],
  main: cityQWarning[500],
  dark: cityQWarning[700],
  darker: cityQWarning[900],
  contrastText: common.white,
});

const info = generatePaletteChannel({
  lighter: cityQInfo[100],
  light: cityQInfo[300],
  main: cityQInfo[500],
  dark: cityQInfo[700],
  darker: cityQInfo[900],
  contrastText: common.white,
});

const success = generatePaletteChannel({
  lighter: cityQSuccess[100],
  light: cityQSuccess[300],
  main: cityQSuccess[500],
  dark: cityQSuccess[700],
  darker: cityQSuccess[900],
  contrastText: common.white,
});

const text = generatePaletteChannel({
  primary: common.white,
  secondary: grey[500],
  disabled: grey[600],
});

const background = generatePaletteChannel({
  default: '#0B0F19',
  paper: '#161C24',
  elevation1: grey[900],
  elevation2: grey[800],
  elevation3: grey[800],
  elevation4: grey[700],
  menu: '#161C24',
  menuElevation1: grey[900],
  menuElevation2: grey[800],
});

const divider = grey[700];
const menuDivider = cssVarRgba(grey['700Channel'], 0.5);
const dividerLight = cssVarRgba(grey['700Channel'], 0.2);

const action = {
  active: grey[500],
  hover: cssVarRgba(grey['500Channel'], 0.08),
  selected: cssVarRgba(grey['500Channel'], 0.16),
  disabled: cssVarRgba(grey['500Channel'], 0.8),
  disabledBackground: cssVarRgba(grey['500Channel'], 0.24),
  focus: cssVarRgba(grey['500Channel'], 0.24),
  hoverOpacity: 0.08,
  disabledOpacity: 0.48,
};

const vibrant = {
  listItemHover: cssVarRgba(common.whiteChannel, 0.08),
  buttonHover: cssVarRgba(common.whiteChannel, 0.08),
  textFieldHover: cssVarRgba(common.whiteChannel, 0.08),
  text: {
    secondary: alpha(common.white, 0.7),
    disabled: alpha(common.white, 0.5),
  },
  overlay: cssVarRgba(common.whiteChannel, 0.08),
};

export const cityQDarkPalette = {
  mode: 'dark',
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