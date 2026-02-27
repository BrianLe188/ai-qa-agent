// ============================================================
// Demo App — Simple static file server for QA testing
// ============================================================

const server = Bun.serve({
  port: 4000,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Default to index.html
    if (path === "/") path = "/index.html";

    // Serve static files from public/
    const filePath = `./public${path}`;
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    // 404
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`
╔══════════════════════════════════════════════╗
║  🛒 ShopDemo — Test Target App              ║
║  Running on http://localhost:${server.port}              ║
║                                              ║
║  Pages:                                      ║
║  • /              Login                      ║
║  • /register.html Register                   ║
║  • /dashboard.html Dashboard (after login)   ║
║  • /products.html  Products + Cart           ║
║  • /profile.html   Edit Profile              ║
║                                              ║
║  Test credentials:                           ║
║  Email:    user@example.com                  ║
║  Password: Password123!                      ║
╚══════════════════════════════════════════════╝
`);
