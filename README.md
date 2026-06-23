# Foodpanda Scraper

A local Foodpanda product scraper with a small browser UI and a CLI command.

The scraper listens to Foodpanda JSON network responses, extracts product data,
and writes a clean product list with only:

```json
{
  "photo": "https://example.com/product.jpg",
  "barcode": "6902890022497",
  "name": "Shuang Hui Pork Suasage 400g",
  "price": 3.5
}
```

If Foodpanda returns a product name like:

```text
Shuang Hui Pork Suasage 400g - 6902890022497
```

the scraper removes the trailing barcode from `name` and stores it in `barcode`.
Products without a trailing ` - digits` suffix keep their full name and use an
empty barcode.

## Requirements

- Node.js
- npm
- Chromium support through Playwright

Install dependencies:

```bash
npm install
```

If Playwright reports that Chromium is missing, install it with:

```bash
npx playwright install chromium
```

## Run The UI

Start the local server:

```bash
npm start
```

Open:

```text
http://127.0.0.1:3000
```

The UI lets you:

- Enter a Foodpanda URL
- Run the scraper
- Choose whether to show the browser while scraping
- View results in a table
- Filter by name or barcode
- Copy or download the JSON output

## Run From CLI

Use the CLI when you only need to scrape and write the output files:

```bash
npm run scrape -- "https://www.foodpanda.com.kh/..."
```

The CLI opens Chromium in visible mode because Foodpanda may require browser
session, location, or manual interaction.

## Check The Project

Run the lightweight syntax checks:

```bash
npm test
```

## Output Files

The scraper writes:

- `foodpanda-products.json`: clean product list for use in other tools
- `foodpanda-network-debug.json`: captured Foodpanda JSON responses for debugging

These files are generated locally and ignored by Git.

`foodpanda-products.json` contains only these keys for each product:

- `photo`
- `barcode`
- `name`
- `price`

## How It Works

1. Opens the Foodpanda page with Playwright.
2. Captures JSON network responses that look like menu, catalog, product, or price data.
3. Recursively scans those responses for product-like objects.
4. Extracts product photo, barcode, name, and price.
5. Deduplicates products by barcode when available, otherwise by `name + price`.
6. Saves the result to `foodpanda-products.json`.

## Troubleshooting

If the UI cannot start on port `3000`, use another port:

```bash
PORT=3001 npm start
```

If no products are found:

- Run with `Show browser` enabled in the UI.
- Check whether Foodpanda asks for location, login, or bot verification.
- Wait for the page to finish loading before closing any browser window.
- Inspect `foodpanda-network-debug.json` to see what JSON responses were captured.

If photos are empty for some products, Foodpanda did not provide a supported
photo field for that item in the captured response.
