/**
 * Intentionally empty PostCSS config.
 *
 * PostCSS resolves its config by searching UP the directory tree from each
 * source file. Without this file, builds pick up whatever postcss config
 * exists above the repo checkout (e.g. a parent folder declaring tailwindcss)
 * and fail with "Cannot find module 'tailwindcss'". This file stops that
 * search at the repo root. Trellis does not use PostCSS plugins.
 */
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {},
};

export default config;
