/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // <--- Gunakan yang ada @-nya
    'autoprefixer': {},         // <--- Pastikan ini ada
  },
};

export default config;