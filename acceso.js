const accessKey = "leonetiaQuoteAccess";
const accessHash = "9d0743b84758e207f99d6ddac7308280b2ae65477e46613fc7814b7f0e8edb48";
const password = document.querySelector("#accessPassword");
const unlockButton = document.querySelector("#unlockAccess");
const message = document.querySelector("#accessMessage");

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function unlock() {
  const hash = await sha256(password.value);
  if (hash !== accessHash) {
    message.textContent = "Contraseña incorrecta.";
    return;
  }
  sessionStorage.setItem(accessKey, "ok");
  window.location.href = "cotizador.html";
}

unlockButton.addEventListener("click", unlock);
password.addEventListener("keydown", (event) => {
  if (event.key === "Enter") unlock();
});

if (sessionStorage.getItem(accessKey) === "ok") {
  window.location.href = "cotizador.html";
}
