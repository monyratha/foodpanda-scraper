const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

function firstValue(...values) {
  const value = values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  return value === undefined ? "" : value;
}

function getPhoto(item) {
  const firstUrl = Array.isArray(item.urls) ? item.urls[0] : "";
  return firstValue(
    item.photo,
    item.image,
    item.image_url,
    item.imageUrl,
    item.logo,
    firstUrl
  );
}

function splitNameAndBarcode(name) {
  const text = String(name || "").trim();
  const match = text.match(/^(.*?)\s+-\s+(\d+)\s*$/);

  if (!match) {
    return { name: text, barcode: "" };
  }

  return {
    name: match[1].trim(),
    barcode: match[2],
  };
}

function findProducts(data, results = []) {
  if (!data || typeof data !== "object") return results;

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") {
        const text = JSON.stringify(item).toLowerCase();

        const hasName = firstValue(
          item.name,
          item.title,
          item.productName,
          item.product_name
        );

        const hasPrice = firstValue(
          item.price,
          item.unit_price,
          item.priceValue,
          item.price_value,
          item.display_price
        );

        if (hasName !== "" && hasPrice !== "") {
          const product = splitNameAndBarcode(hasName);

          results.push({
            photo: getPhoto(item),
            barcode: product.barcode,
            name: product.name,
            price: hasPrice,
          });
        }

        if (
          text.includes("product") ||
          text.includes("price") ||
          text.includes("catalog") ||
          text.includes("menu")
        ) {
          findProducts(item, results);
        }
      }
    }
  } else {
    for (const value of Object.values(data)) {
      findProducts(value, results);
    }
  }

  return results;
}

async function scrapeFoodpanda(targetUrl, options = {}) {
  if (!targetUrl) {
    throw new Error("Foodpanda URL is required.");
  }

  const {
    headless = false,
    productOutputPath = path.join(__dirname, "foodpanda-products.json"),
    debugOutputPath = path.join(__dirname, "foodpanda-network-debug.json"),
    onStatus = () => {},
  } = options;

  onStatus("Launching browser");

  const browser = await chromium.launch({
    headless,
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      locale: "en-KH",
    });

    const jsonResponses = [];

    page.on("response", async (response) => {
      const contentType = response.headers()["content-type"] || "";

      if (!contentType.includes("application/json")) return;

      try {
        const data = await response.json();
        const bodyText = JSON.stringify(data).toLowerCase();

        if (
          bodyText.includes("price") ||
          bodyText.includes("product") ||
          bodyText.includes("catalog") ||
          bodyText.includes("menu")
        ) {
          jsonResponses.push({
            url: response.url(),
            data,
          });
        }
      } catch (_) {}
    });

    onStatus("Opening Foodpanda page");
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    onStatus("Waiting for product data");
    await page.waitForTimeout(5000);

    onStatus("Scrolling to load lazy products");
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(1000);
    }

    const products = [];

    for (const response of jsonResponses) {
      const found = findProducts(response.data);
      products.push(...found);
    }

    // Remove duplicates by barcode when available, otherwise by name + price.
    const uniqueProducts = Array.from(
      new Map(
        products.map((p) => [p.barcode || `${p.name}-${p.price}`, p])
      ).values()
    );

    fs.writeFileSync(productOutputPath, JSON.stringify(uniqueProducts, null, 2));
    fs.writeFileSync(debugOutputPath, JSON.stringify(jsonResponses, null, 2));

    onStatus(`Found ${uniqueProducts.length} products`);

    return {
      products: uniqueProducts,
      debugResponses: jsonResponses.length,
      productOutputPath,
      debugOutputPath,
    };
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  const targetUrl = process.argv[2];

  if (!targetUrl) {
    console.error("Usage: node scrape-foodpanda.js <foodpanda-url>");
    process.exit(1);
  }

  scrapeFoodpanda(targetUrl, {
    headless: false,
    onStatus: (message) => console.log(message),
  })
    .then(({ products }) => {
      console.table(products);
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = {
  findProducts,
  scrapeFoodpanda,
  splitNameAndBarcode,
};
