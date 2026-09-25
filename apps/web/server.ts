// Static server for the web SPA on Bun, replacing nginx (formerly
// apps/web/nginx.conf). Same behavior:
//   - security headers on every response. nginx never actually sent them:
//     each location's own add_header replaced the server-level ones. So the
//     CSP starts as Report-Only; set CSP_ENFORCE=true once the browser
//     console shows no violations (Mapbox GL, for one, needs worker-src blob:);
//   - /assets/* immutable for a year, /sitemap.xml for an hour, everything
//     else no-store;
//   - SPA fallback: unknown paths get index.html;
//   - precompressed files from vite-plugin-compression: .br when the client
//     accepts Brotli (new; nginx lacked the module), else .gz.
import { join, normalize, sep } from "node:path";
import { stat } from "node:fs/promises";

const root = join(import.meta.dir, "dist");
const port = Number(process.env.PORT ?? 4173);

const securityHeaders: Record<string, string> = {
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=(self)",
  [process.env.CSP_ENFORCE === "true" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only"]:
    "default-src 'self'; script-src 'self' https://accounts.google.com https://apis.google.com https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://appleid.cdn-apple.com https://js.stripe.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: blob: https://*.mapbox.com https://www.themealdb.com https://*.unsplash.com https://static.exercisedb.dev https://lh3.googleusercontent.com https://avatars.githubusercontent.com; font-src 'self' data:; connect-src 'self' https://accounts.google.com https://appleid.apple.com https://www.google-analytics.com https://region1.google-analytics.com https://api.mapbox.com https://events.mapbox.com https://js.stripe.com https://www.themealdb.com https://static.exercisedb.dev https://*.unsplash.com wss:; frame-src 'self' https://accounts.google.com https://www.google.com https://appleid.apple.com https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';",
};

// Resolves a URL path to a file under dist/, or null. Rejects paths that
// escape dist/, and serves a directory's index.html like nginx's `$uri/`.
async function resolveFile(pathname: string): Promise<string | null> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const full = normalize(join(root, decoded));
  if (full !== root && !full.startsWith(root + sep)) return null;
  const info = await stat(full).catch(() => null);
  if (info?.isFile()) return full;
  if (info?.isDirectory()) {
    const index = join(full, "index.html");
    if ((await stat(index).catch(() => null))?.isFile()) return index;
  }
  return null;
}

// Encodings the client accepts (q > 0), from Accept-Encoding.
function acceptedEncodings(req: Request): Set<string> {
  const accepted = new Set<string>();
  for (const part of (req.headers.get("accept-encoding") ?? "").split(",")) {
    const [name, ...params] = part.trim().split(";");
    const q = params.find((p) => p.trim().startsWith("q="));
    if (name && !(q && Number(q.trim().slice(2)) === 0)) accepted.add(name.trim().toLowerCase());
  }
  return accepted;
}

async function serveFile(req: Request, path: string, cacheControl: string): Promise<Response> {
  const headers = new Headers(securityHeaders);
  headers.set("Cache-Control", cacheControl);
  headers.set("Content-Type", Bun.file(path).type);
  headers.set("Vary", "Accept-Encoding");
  let body = Bun.file(path);
  const accepted = acceptedEncodings(req);
  for (const [encoding, extension] of [["br", ".br"], ["gzip", ".gz"]] as const) {
    if (!accepted.has(encoding)) continue;
    const compressed = Bun.file(path + extension);
    if (await compressed.exists()) {
      headers.set("Content-Encoding", encoding);
      body = compressed;
      break;
    }
  }
  return new Response(body, { headers });
}

function notFound(): Response {
  return new Response("Not Found\n", {
    status: 404,
    headers: { ...securityHeaders, "Content-Type": "text/plain; charset=utf-8" },
  });
}

Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(req) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { ...securityHeaders, Allow: "GET, HEAD" } });
    }
    const { pathname } = new URL(req.url);

    if (pathname.startsWith("/assets/")) {
      const file = await resolveFile(pathname);
      return file ? serveFile(req, file, "public, max-age=31536000, immutable") : notFound();
    }
    if (pathname === "/sitemap.xml") {
      const file = await resolveFile(pathname);
      return file ? serveFile(req, file, "public, max-age=3600") : notFound();
    }
    const file = (await resolveFile(pathname)) ?? join(root, "index.html");
    return serveFile(req, file, "no-store");
  },
});

console.log(`web: serving ${root} on :${port}`);
