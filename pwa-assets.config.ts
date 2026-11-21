import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Single source of truth for every PWA icon: public/favicon.svg.
// Run `pnpm generate-pwa-assets` after changing the SVG.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // The page background matches the app theme so maskable/apple icons are not transparent.
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { background: '#07080d', fit: 'contain' },
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: { background: '#07080d', fit: 'contain' },
    },
  },
  images: ['public/favicon.svg'],
});
