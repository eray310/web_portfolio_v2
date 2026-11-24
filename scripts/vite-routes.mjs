// Dev / preview server routes: the real pages ("/", "/hakkimda", "/ai-isler"), the form endpoint in
// api/idea.js, and a proper 404 for every other page-like address. On the host the same
// is done by vercel.json (rewrite for /hakkimda) and public/404.html.
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);

export default function pageRoutes() {
  const notFound = () => readFileSync(new URL("public/404.html", root), "utf8");

  const runApi = async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    if (String(req.headers["content-type"] ?? "").includes("application/json")) {
      try {
        req.body = JSON.parse(raw);
      } catch {
        req.body = raw;
      }
    } else req.body = raw;
    res.status = (n) => {
      res.statusCode = n;
      return res;
    };
    res.json = (o) => {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(o));
    };
    const mod = await import(new URL("api/idea.js", root).href + "?t=" + Date.now());
    await mod.default(req, res);
  };

  const handle = (req, res, next) => {
    const [path, query = ""] = (req.url ?? "/").split("?");
    if (path === "/api/idea") {
      runApi(req, res).catch(() => {
        res.statusCode = 500;
        res.end("{}");
      });
      return;
    }
    const page = { "/hakkimda": "/hakkimda/index.html", "/ai-isler": "/ai-isler/index.html" }[path.replace(/\/$/, "")];
    if (page) {
      req.url = page + (query ? "?" + query : "");
      return next();
    }
    const pageLike =
      !path.includes(".") &&
      !path.startsWith("/@") &&
      !path.startsWith("/src/") &&
      !path.startsWith("/node_modules/") &&
      !path.startsWith("/__") &&
      path !== "/";
    if (pageLike) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(notFound());
      return;
    }
    next();
  };

  return {
    name: "page-routes",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}
