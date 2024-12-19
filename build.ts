const build = async () => {
  await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    target: 'bun',
    minify: true,
  });
};

build().catch(console.error);