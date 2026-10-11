const TOTAL = 20;

// El tamaño y el enfoque los procesa image_filter en el servidor: viajan en la URL.
function urlImagen(numero, size, sharpen) {
  const id = String(numero).padStart(2, "0");
  return `/img/image${id}.jpg?size=${size}&sharpen=${sharpen}`;
}

// Las 20 miniaturas se crean una sola vez.
function crearGaleria() {
  const contenedor = document.getElementById("galeria");
  for (let i = 1; i <= TOTAL; i++) {
    const img = document.createElement("img");
    img.alt = `Imagen ${i}`;
    contenedor.appendChild(img);
  }
}

// Borde, color y desenfoque son efectos de presentacion: los aplica el cliente.
function aplicarEfectos(borde, color, desenfoque) {
  document.querySelectorAll("#galeria img").forEach((img) => {
    img.style.borderStyle = "solid";
    img.style.borderWidth = `${borde}px`;
    img.style.borderColor = color;
    img.style.filter = desenfoque > 0 ? `blur(${desenfoque}px)` : "none";
  });
}

function render() {
  const size = document.getElementById("size").value;
  const sharpen = document.getElementById("sharpen").value;
  const borde = document.getElementById("border").value;
  const color = document.getElementById("borderColor").value;
  const desenfoque = document.getElementById("blur").value;

  document.querySelectorAll("#galeria img").forEach((img, indice) => {
    img.src = urlImagen(indice + 1, size, sharpen);
  });
  aplicarEfectos(borde, color, desenfoque);
}

document.addEventListener("DOMContentLoaded", () => {
  crearGaleria();
  document.getElementById("controles").addEventListener("submit", (evento) => {
    evento.preventDefault();
    render();
  });
  render();   // primer render con los valores por defecto
});
