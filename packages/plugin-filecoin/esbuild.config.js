const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.js'], // Your main JS/TS entry point
  bundle: true,
  outdir: 'dist',
  loader: {
    '.html': 'file', // Treat .html files as static files and copy them to the output
  },
}).then(() => {
  console.log('Build succeeded');
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});