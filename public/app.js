const form = document.querySelector("#scrapeForm");
const targetUrl = document.querySelector("#targetUrl");
const showBrowser = document.querySelector("#showBrowser");
const runButton = document.querySelector("#runButton");
const runState = document.querySelector("#runState");
const statusText = document.querySelector("#statusText");
const productCount = document.querySelector("#productCount");
const barcodeCount = document.querySelector("#barcodeCount");
const photoCount = document.querySelector("#photoCount");
const resultsBody = document.querySelector("#resultsBody");
const emptyState = document.querySelector("#emptyState");
const filterInput = document.querySelector("#filterInput");
const copyJson = document.querySelector("#copyJson");
const downloadJson = document.querySelector("#downloadJson");

let products = [];

function setStatus(message, state = "ready") {
  statusText.textContent = message;
  runState.textContent = state === "running" ? "Running" : state === "error" ? "Error" : "Ready";
  runState.classList.toggle("running", state === "running");
  runState.classList.toggle("error", state === "error");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(value) {
  if (typeof value === "number") return value.toFixed(2);
  return String(value ?? "");
}

function visibleProducts() {
  const query = filterInput.value.trim().toLowerCase();
  if (!query) return products;

  return products.filter((product) => {
    return `${product.name} ${product.barcode}`.toLowerCase().includes(query);
  });
}

function renderMetrics() {
  productCount.textContent = products.length;
  barcodeCount.textContent = products.filter((product) => product.barcode).length;
  photoCount.textContent = products.filter((product) => product.photo).length;
}

function renderTable() {
  const rows = visibleProducts();
  emptyState.hidden = rows.length > 0;

  resultsBody.innerHTML = rows
    .map((product) => {
      const photoCell = product.photo
        ? `<img class="product-photo" src="${escapeHtml(product.photo)}" alt="${escapeHtml(product.name)}" loading="lazy" referrerpolicy="no-referrer" />`
        : `<span class="photo-placeholder">No img</span>`;

      return `
        <tr>
          <td>${photoCell}</td>
          <td class="barcode ${product.barcode ? "" : "missing"}">${escapeHtml(product.barcode || "No barcode")}</td>
          <td class="product-name">${escapeHtml(product.name)}</td>
          <td class="price">${escapeHtml(formatPrice(product.price))}</td>
        </tr>
      `;
    })
    .join("");
}

function setProducts(nextProducts, message) {
  products = Array.isArray(nextProducts) ? nextProducts : [];
  renderMetrics();
  renderTable();
  setStatus(message || `${products.length} products loaded`);
}

async function loadSavedProducts() {
  try {
    const response = await fetch("/api/products");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Could not load saved output.");
    }

    setProducts(payload.products, `${payload.products.length} saved products loaded`);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function runScrape(event) {
  event.preventDefault();

  runButton.disabled = true;
  copyJson.disabled = true;
  downloadJson.disabled = true;
  setStatus("Scrape running. Keep this page open.", "running");

  try {
    const response = await fetch("/api/scrape", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl.value,
        showBrowser: showBrowser.checked,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Scrape failed.");
    }

    setProducts(payload.products, `Scrape complete: ${payload.count} products saved`);
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    runButton.disabled = false;
    copyJson.disabled = false;
    downloadJson.disabled = false;
  }
}

async function copyProductsJson() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(products, null, 2));
    setStatus("JSON copied to clipboard");
  } catch (_) {
    setStatus("Clipboard is unavailable in this browser.", "error");
  }
}

function downloadProductsJson() {
  const blob = new Blob([JSON.stringify(products, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "foodpanda-products.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus("JSON download started");
}

form.addEventListener("submit", runScrape);
filterInput.addEventListener("input", renderTable);
copyJson.addEventListener("click", copyProductsJson);
downloadJson.addEventListener("click", downloadProductsJson);

loadSavedProducts();
