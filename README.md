# Foodpanda Scraper

Simple local scraper for Foodpanda product data.

It opens a Foodpanda page in Chromium, reads product data from network responses,
and saves a clean JSON list with:

```json
{
  "photo": "https://example.com/product.jpg",
  "barcode": "6902890022497",
  "name": "Product name",
  "price": 3.5
}
```

## Setup

Install Node.js and npm, then run:

```bash
npm install
```

If Chromium is missing, install it with:

```bash
npx playwright install chromium
```

## Use The Web UI

Start the app:

```bash
npm start
```

Open this in your browser:

```text
http://127.0.0.1:3000
```

Then:

1. Paste a Foodpanda URL.
2. Turn on `Show browser` if Foodpanda needs location, login, or verification.
3. Run the scraper.
4. Copy or download the JSON results.

## Use The CLI

Run a scrape from the terminal:

```bash
npm run scrape -- "https://www.foodpanda.com.kh/..."
```

## Output

The scraper creates these local files:

- `foodpanda-products.json` - cleaned product list
- `foodpanda-network-debug.json` - raw captured JSON for debugging

Generated output files are ignored by Git.

## Check The Project

Run the syntax check:

```bash
npm test
```

## Troubleshooting

If port `3000` is busy:

```bash
PORT=3001 npm start
```

If no products are found:

- Run with `Show browser` turned on.
- Complete any Foodpanda location, login, or verification prompt.
- Let the page finish loading before closing the browser.
- Check `foodpanda-network-debug.json` to see what data was captured.
