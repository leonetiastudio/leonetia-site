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

function setRowImage(row, src) {
  const img = row.querySelector(".item-image");
  img.src = src || "";
  img.classList.toggle("has-image", Boolean(src));
}

function addRow(data = {}) {
  const row = els.template.content.firstElementChild.cloneNode(true);
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
    const reader = new FileReader();
    reader.onload = () => setRowImage(row, reader.result);
    reader.readAsDataURL(file);
  });

  row.querySelector(".remove-image").addEventListener("click", () => {
    row.querySelector(".item-image-input").value = "";
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
document.querySelector("#resetQuote").addEventListener("click", resetQuote);
document.querySelector("#printQuote").addEventListener("click", () => {
  updateTotals();
  window.print();
});

[els.ivaRate, els.currency].forEach((input) => input.addEventListener("input", updateTotals));

const draft = localStorage.getItem(storageKey);
loadQuote(draft ? JSON.parse(draft) : {});
