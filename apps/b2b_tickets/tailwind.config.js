const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(
      __dirname,
      '{src,pages,components,app}/**/*!(*.stories|*.spec).{ts,tsx,html,jsx}'
    ),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      fontFamily: {
        myCustomFont: ['FrederickaTheGreat', 'serif'], // Add your custom font here
      },
      // keyframes: {
      //   'grow-and-shrink': {
      //     '0%': { transform: 'scale(1)' },
      //     '50%': { transform: 'scale(1.1)' }, // Adjust scale as needed
      //     '100%': { transform: 'scale(1)' },
      //   },
      // },
      // animation: {
      //   'grow-and-shrink': 'grow-and-shrink 1s ease-in-out',
      // },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light'], // Only enable light mode
  },
};
