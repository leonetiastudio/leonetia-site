const els = {
  body: document.querySelector("#itemsBody"),
  template: document.querySelector("#itemTemplate"),
  ivaRate: document.querySelector("#ivaRate"),
  currency: document.querySelector("#currency"),
  subtotal: document.querySelector("#subtotalAmount"),
  iva: document.querySelector("#ivaAmount"),
  total: document.querySelector("#totalAmount"),
  folio: document.querySelector("#quoteFolio"),
  client: document.querySelector("#clientName"),
  project: document.querySelector("#projectName"),
  date: document.querySelector("#quoteDate"),
  validity: document.querySelector("#quoteValidity"),
  notes: document.querySelector("#quoteNotes"),
};

const storageKey = "leonetiaQuoteDraft";
const archiveKey = "leonetiaQuoteArchive";
const accessKey = "leonetiaQuoteAccess";

if (sessionStorage.getItem(accessKey) !== "ok") {
  window.location.replace("acceso.html");
}

let activeImageRow = null;

const examples = {
  stand: {
    description:
      "Diseño y producción de stand modular para evento, incluye propuesta visual, estructura, gráficos, iluminación básica y montaje.",
    qty: 1,
    price: 45000,
    image: "assets/leonetia-stands.png",
  },
  promo: {
    description:
      "Kit de promocionales personalizados: tote bag, termo, libreta, gorra y materiales de apoyo con aplicación de marca.",
    qty: 50,
    price: 390,
    image: "assets/leonetia-promocionales.png",
  },
};

function money(value) {
  const currency = els.currency.value || "MXN";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(Number.isFinite(value) ? value : 0);
}

function rowValues(row) {
  const qty = Number(row.querySelector(".item-qty").value) || 0;
  const price = Number(row.querySelector(".item-price").value) || 0;
  const ivaRate = (Number(els.ivaRate.value) || 0) / 100;
  const subtotal = qty * price;
  const iva = subtotal * ivaRate;
  return { qty, price, subtotal, iva, total: subtotal + iva };
}

function updateTotals() {
  let subtotal = 0;
  let iva = 0;

  document.querySelectorAll(".quote-row").forEach((row) => {
    const values = rowValues(row);
    subtotal += values.subtotal;
    iva += values.iva;
    row.querySelector(".item-subtotal").textContent = money(values.subtotal);
    row.querySelector(".item-iva").textContent = money(values.iva);
    row.querySelector(".item-total").textContent = money(values.total);
  });

  els.subtotal.textContent = money(subtotal);
  els.iva.textContent = money(iva);
  els.total.textContent = money(subtotal + iva);
}

async function imageToDataUrl(src) {
  const response = await fetch(src);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function setRowImage(row, src) {
  const img = row.querySelector(".item-image");
  img.src = src || "";
  img.classList.toggle("has-image", Boolean(src));
}

function findImageFileFromClipboard(event) {
  const items = [...(event.clipboardData?.items || [])];
  const imageItem = items.find((item) => item.type.startsWith("image/"));
  return imageItem?.getAsFile() || null;
}

function clipboardText(event, type) {
  try {
    return event.clipboardData?.getData(type) || "";
  } catch {
    return "";
  }
}

function imageSourceFromHtml(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.querySelector("img")?.src || "";
}

function imageSourceFromText(text) {
  const value = text.trim();
  if (!value) return "";
  if (value.startsWith("data:image/")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    return "";
  }
  return "";
}

async function urlToDataUrl(src) {
  if (!src) return "";
  if (src.startsWith("data:image/")) return src;
  const response = await fetch(src, { mode: "cors" });
  if (!response.ok) throw new Error("No se pudo leer la imagen.");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("La URL no es una imagen.");
  return fileToDataUrl(blob);
}

function showPasteTarget(row, message) {
  activeImageRow = row;
  const target = row.querySelector(".paste-target");
  target.textContent = message || "Pega aqui la imagen con Cmd/Ctrl + V o toque prolongado";
  target.classList.add("is-active");
  target.focus();
}

async function applyClipboardFile(row, file) {
  if (!file) return false;
  setRowImage(row, await fileToDataUrl(file));
  row.querySelector(".paste-target").classList.remove("is-active");
  return true;
}

async function applyClipboardSource(row, src) {
  if (!src) return false;
  try {
    setRowImage(row, await urlToDataUrl(src));
  } catch {
    setRowImage(row, src);
  }
  row.querySelector(".paste-target").classList.remove("is-active");
  return true;
}

async function pasteImageFromClipboard(row) {
  activeImageRow = row;
  try {
    if (navigator.clipboard?.read) {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await clipboardItem.getType(imageType);
          await applyClipboardFile(row, blob);
          return;
        }

        if (clipboardItem.types.includes("text/html")) {
          const htmlBlob = await clipboardItem.getType("text/html");
          const html = await htmlBlob.text();
          const src = imageSourceFromHtml(html);
          if (src) {
            await applyClipboardSource(row, src);
            return;
          }
        }

        if (clipboardItem.types.includes("text/plain")) {
          const textBlob = await clipboardItem.getType("text/plain");
          const src = imageSourceFromText(await textBlob.text());
          if (src) {
            await applyClipboardSource(row, src);
            return;
          }
        }
      }
    }

    if (navigator.clipboard?.readText) {
      const src = imageSourceFromText(await navigator.clipboard.readText());
      if (src) {
        await applyClipboardSource(row, src);
        return;
      }
    }

    showPasteTarget(row, "No encontre imagen directa. Pega aqui con Cmd/Ctrl + V o toque prolongado.");
  } catch {
    showPasteTarget(row, "El navegador bloqueo el portapapeles. Pega aqui con Cmd/Ctrl + V o toque prolongado.");
  }
}

function addRow(data = {}) {
  const row = els.template.content.firstElementChild.cloneNode(true);
  row.tabIndex = 0;
  row.querySelector(".item-description").value = data.description || "";
  row.querySelector(".item-qty").value = data.qty ?? 1;
  row.querySelector(".item-price").value = data.price ?? 0;
  setRowImage(row, data.image || "");

  row.querySelectorAll("input, textarea, select").forEach((input) => {
    input.addEventListener("input", updateTotals);
  });

  row.querySelector(".item-image-input").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (!file) return;
    fileToDataUrl(file).then((src) => setRowImage(row, src));
  });

  row.querySelector(".item-camera-input").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (!file) return;
    fileToDataUrl(file).then((src) => setRowImage(row, src));
  });

  row.querySelector(".paste-image").addEventListener("click", () => {
    pasteImageFromClipboard(row);
  });

  row.addEventListener("paste", async (event) => {
    const file = findImageFileFromClipboard(event);
    if (file) {
      event.preventDefault();
      await applyClipboardFile(row, file);
      return;
    }

    const src = imageSourceFromHtml(clipboardText(event, "text/html")) || imageSourceFromText(clipboardText(event, "text/plain"));
    if (!src) return;
    event.preventDefault();
    try {
      await applyClipboardSource(row, src);
    } catch {
      showPasteTarget(row, "La imagen copiada es una referencia que el navegador no puede leer. Usa Cargar o Foto/Galeria.");
    }
  });

  row.querySelector(".paste-target").addEventListener("paste", async (event) => {
    const file = findImageFileFromClipboard(event);
    if (file) {
      event.preventDefault();
      await applyClipboardFile(row, file);
      return;
    }

    const src = imageSourceFromHtml(clipboardText(event, "text/html")) || imageSourceFromText(clipboardText(event, "text/plain"));
    if (!src) return;
    event.preventDefault();
    try {
      await applyClipboardSource(row, src);
    } catch {
      showPasteTarget(row, "La imagen copiada es una referencia que el navegador no puede leer. Usa Cargar o Foto/Galeria.");
    }
  });

  row.addEventListener("focusin", () => {
    activeImageRow = row;
  });

  row.querySelector(".remove-image").addEventListener("click", () => {
    row.querySelector(".item-image-input").value = "";
    row.querySelector(".item-camera-input").value = "";
    setRowImage(row, "");
  });

  row.querySelector(".delete-row").addEventListener("click", () => {
    row.remove();
    if (!document.querySelector(".quote-row")) addRow();
    updateTotals();
  });

  els.body.append(row);
  updateTotals();
}

function quoteData(includeImages = true) {
  return {
    folio: els.folio.value,
    client: els.client.value,
    project: els.project.value,
    date: els.date.value,
    validity: els.validity.value,
    ivaRate: els.ivaRate.value,
    currency: els.currency.value,
    notes: els.notes.value,
    items: [...document.querySelectorAll(".quote-row")].map((row) => ({
      description: row.querySelector(".item-description").value,
      qty: row.querySelector(".item-qty").value,
      price: row.querySelector(".item-price").value,
      image: includeImages ? row.querySelector(".item-image").src : "",
    })),
  };
}

function loadQuote(data) {
  els.folio.value = data.folio || "LEO-0001";
  els.client.value = data.client || "";
  els.project.value = data.project || "";
  els.date.value = data.date || new Date().toISOString().slice(0, 10);
  els.validity.value = data.validity || "15 dias";
  els.ivaRate.value = data.ivaRate || 16;
  els.currency.value = data.currency || "MXN";
  els.notes.value =
    data.notes ||
    "Precios sujetos a cambios segun alcance final, materiales, tiempos de entrega y aprobacion de artes.";
  els.body.innerHTML = "";
  const items = data.items?.length ? data.items : [{}];
  items.forEach(addRow);
  updateTotals();
}

function saveDraft() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(quoteData(true)));
    alert("Borrador guardado en este navegador.");
  } catch {
    localStorage.setItem(storageKey, JSON.stringify(quoteData(false)));
    alert("Borrador guardado sin imagenes porque el navegador no tenia espacio suficiente.");
  }
}

function archiveItems() {
  try {
    return JSON.parse(localStorage.getItem(archiveKey) || "[]");
  } catch {
    return [];
  }
}

function renderArchive() {
  const list = document.querySelector("#archiveList");
  const items = archiveItems();
  list.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("span");
    empty.textContent = "Sin propuestas guardadas";
    list.append(empty);
    return;
  }

  items.slice(0, 8).forEach((entry) => {
    const load = document.createElement("button");
    load.type = "button";
    load.textContent = entry.label;
    load.addEventListener("click", () => loadQuote(entry.data));
    list.append(load);
  });
}

function saveArchive() {
  const data = quoteData(true);
  const labelParts = [data.folio, data.client || "Cliente", data.project || "Proyecto"].filter(Boolean);
  const entry = {
    id: Date.now(),
    label: labelParts.join(" | "),
    data,
  };
  try {
    const items = [entry, ...archiveItems()].slice(0, 20);
    localStorage.setItem(archiveKey, JSON.stringify(items));
    renderArchive();
    alert("Propuesta guardada en el historial local.");
  } catch {
    alert("No se pudo guardar con imagenes. Prueba guardar el PDF o reducir imagenes.");
  }
}

function resetQuote() {
  if (!confirm("¿Limpiar esta cotizacion?")) return;
  localStorage.removeItem(storageKey);
  loadQuote({});
}

async function addExample(type) {
  const data = { ...examples[type] };
  data.image = await imageToDataUrl(data.image);
  addRow(data);
}

document.querySelector("#addItem").addEventListener("click", () => addRow());
document.querySelector("#addStandPack").addEventListener("click", () => addExample("stand"));
document.querySelector("#addPromoPack").addEventListener("click", () => addExample("promo"));
document.querySelector("#saveQuote").addEventListener("click", saveDraft);
document.querySelector("#saveArchive").addEventListener("click", saveArchive);
document.querySelector("#resetQuote").addEventListener("click", resetQuote);
document.querySelector("#printQuote").addEventListener("click", () => {
  updateTotals();
  window.print();
});

[els.ivaRate, els.currency].forEach((input) => input.addEventListener("input", updateTotals));

const draft = localStorage.getItem(storageKey);
loadQuote(draft ? JSON.parse(draft) : {});
renderArchive();

document.addEventListener("paste", async (event) => {
  if (!activeImageRow) return;
  const file = findImageFileFromClipboard(event);
  if (file) {
    event.preventDefault();
    await applyClipboardFile(activeImageRow, file);
    return;
  }

  const src = imageSourceFromHtml(clipboardText(event, "text/html")) || imageSourceFromText(clipboardText(event, "text/plain"));
  if (!src) return;
  event.preventDefault();
  try {
    await applyClipboardSource(activeImageRow, src);
  } catch {
    showPasteTarget(activeImageRow, "La imagen copiada es una referencia que el navegador no puede leer. Usa Cargar o Foto/Galeria.");
  }
});
