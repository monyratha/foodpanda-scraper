const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const { scrapeFoodpanda } = require("./scrape-foodpanda");

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const publicDir = path.join(__dirname, "public");
const productsPath = path.join(__dirname, "foodpanda-products.json");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

let activeRun = false;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (_) {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    request.on("error", reject);
  });
}

function readProducts() {
  if (!fs.existsSync(productsPath)) return [];
  return JSON.parse(fs.readFileSync(productsPath, "utf8"));
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://localhost:${port}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = path.normalize(path.join(publicDir, pathname));

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath);
    response.writeHead(200, {
      "content-type": mimeTypes[extension] || "application/octet-stream",
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://localhost:${port}`);

  if (request.method === "GET" && requestUrl.pathname === "/api/products") {
    try {
      sendJson(response, 200, { products: readProducts() });
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/scrape") {
    if (activeRun) {
      sendJson(response, 409, {
        error: "A scrape is already running. Wait for it to finish before starting another.",
      });
      return;
    }

    activeRun = true;

    try {
      const payload = await readRequestBody(request);
      const targetUrl = String(payload.url || "").trim();

      if (!isValidHttpUrl(targetUrl)) {
        sendJson(response, 400, { error: "Enter a valid http or https URL." });
        return;
      }

      const logs = [];
      const result = await scrapeFoodpanda(targetUrl, {
        headless: !payload.showBrowser,
        onStatus: (message) => {
          logs.push({
            time: new Date().toISOString(),
            message,
          });
        },
      });

      sendJson(response, 200, {
        count: result.products.length,
        products: result.products,
        logs,
        output: {
          products: result.productOutputPath,
          debug: result.debugOutputPath,
        },
      });
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    } finally {
      activeRun = false;
    }
    return;
  }

  if (request.method === "GET") {
    serveStatic(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
});

server.listen(port, host, () => {
  console.log(`Foodpanda scraper UI running at http://${host}:${port}`);
});
