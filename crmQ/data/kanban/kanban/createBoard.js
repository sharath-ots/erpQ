import { initialConfig } from 'config';
import { users } from 'data/users';

const bgImage = (index) => `/next-images/kanban/background/${index}.webp`;

export const backgroundImageOptions = [
  {
    id: 1,
    label: 'bgOption1',
    type: 'image', // 🚀 Added type
    src: bgImage(1),
    background: bgImage(1),
  },
  {
    id: 2,
    label: 'bgOption2',
    type: 'image',
    src: bgImage(2),
    background: bgImage(2),
  },
  {
    id: 3,
    label: 'bgOption3',
    type: 'image',
    src: bgImage(3),
    background: bgImage(3),
  },
  {
    id: 4,
    label: 'bgOption4',
    type: 'image',
    src: bgImage(4),
    background: bgImage(4),
  },
  {
    id: 5,
    label: 'bgOption5',
    type: 'image',
    src: bgImage(5),
    background: bgImage(5),
  },
  {
    id: 6,
    label: 'bgOption6',
    type: 'image',
    src: bgImage(6),
    background: bgImage(6),
  },
  {
    id: 7,
    label: 'bgOption7',
    type: 'image',
    src: bgImage(7),
    background: bgImage(7),
  },
  {
    id: 8,
    label: 'bgOption8',
    type: 'image',
    src: bgImage(8),
    background: bgImage(8),
  },
];

export const backgroundColorOptions = [
  {
    id: 1,
    label: 'default',
    type: 'color', // 🚀 Added type
    src: 'transparent',
    background: 'transparent',
  },
  {
    id: 2,
    label: 'gradient1',
    type: 'color',
    src: `linear-gradient(94.94deg, #EF32D9 -53.8%, #89FFFD 100.84%)`, 
    background: `linear-gradient(94.94deg, #EF32D9 -53.8%, #89FFFD 100.84%)`, 
  },
  {
    id: 3,
    label: 'gradient2',
    type: 'color',
    src: `linear-gradient(to right, #C6DDFB, rgba(198, 221, 251, 1))`,
    background: `linear-gradient(to right, #C6DDFB, rgba(198, 221, 251, 1))`,
  },
  {
    id: 4,
    label: 'gradient3',
    type: 'color',
    src: `linear-gradient(198.31deg, rgba(32, 222, 153, 0) 17.04%, #20DE99 92.77%)`,
    background: `linear-gradient(198.31deg, rgba(32, 222, 153, 0) 17.04%, #20DE99 92.77%)`,
  },
  {
    id: 5,
    label: 'gradient4',
    type: 'color',
    src: `linear-gradient(93.39deg, #20DE99 -0.48%, #7DB1F5 59.38%, #5A9EF6 106.49%)`,
    background: `linear-gradient(93.39deg, #20DE99 -0.48%, #7DB1F5 59.38%, #5A9EF6 106.49%)`,
  },
  {
    id: 6,
    label: 'gradient5',
    type: 'color',
    src: `linear-gradient(90deg, #ED4264 0%, #FFEDBC 100%)`,
    background: `linear-gradient(90deg, #ED4264 0%, #FFEDBC 100%)`,
  },
  {
    id: 7,
    label: 'gradient6',
    type: 'color',
    src: `linear-gradient(90deg, #00416A 0%, #E4E5E6 100%)`,
    background: `linear-gradient(90deg, #00416A 0%, #E4E5E6 100%)`,
  },
  {
    id: 8,
    label: 'gradient7',
    type: 'color',
    src: `linear-gradient(90deg, #E8CBC0 0%, #636FA4 100%)`,
    background: `linear-gradient(90deg, #E8CBC0 0%, #636FA4 100%)`,
  },
];