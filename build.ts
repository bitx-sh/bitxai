
const build = async () => {
  console.log("Starting build...");
  try {
    await Bun.build({
      entrypoints: ['./src/index.ts'],
      outdir: './dist',
      target: 'bun',
      minify: true
    });
    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
};

build();
