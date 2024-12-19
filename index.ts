
const port = process.env.PORT || 3000;

const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  fetch(request) {
    return new Response("Welcome to Bun!");
  },
});

console.log(`Listening on http://0.0.0.0:${server.port}`);
