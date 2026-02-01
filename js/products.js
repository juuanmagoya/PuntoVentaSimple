import { db } from "./db.js";

const form = document.getElementById("formProducto");
const tabla = document.getElementById("tablaProductos");
const listaMobile = document.getElementById("listaMobile");
const buscador = document.getElementById("buscadorProductos");

const productoIdInput = document.getElementById("productoId");
const nombreInput = document.getElementById("nombre");
const precioVentaInput = document.getElementById("precioVenta");
const precioCompraInput = document.getElementById("precioCompra");

let productosCache = [];

cargarProductos();


// =====================
// Guardar / editar
// =====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const producto = {
    nombre: nombreInput.value,
    precio_venta: Number(precioVentaInput.value),
    precio_compra: Number(precioCompraInput.value)
  };

  const id = productoIdInput.value;

  if (id) {
    await db.productos.update(Number(id), producto);
  } else {
    await db.productos.add(producto);
  }

  limpiarFormulario();
  cargarProductos();
});


// =====================
// Cargar productos
// =====================
async function cargarProductos() {
  productosCache = await db.productos.orderBy("nombre").toArray();
  renderizarProductos(productosCache);
}


// =====================
// Render Mobile + Desktop
// =====================
function renderizarProductos(lista) {

  tabla.innerHTML = "";
  listaMobile.innerHTML = "";

  if (lista.length === 0) {

    tabla.innerHTML = `
      <tr>
        <td colspan="4" class="p-4 text-center text-gray-500">
          No hay productos
        </td>
      </tr>
    `;

    listaMobile.innerHTML = `
      <p class="text-center text-gray-500 py-4">
        No hay productos
      </p>
    `;

    return;
  }

  lista.forEach(p => {

    // Desktop
    tabla.innerHTML += `
      <tr class="border-b">

        <td class="p-2 font-medium">${p.nombre}</td>
        <td class="p-2">$${p.precio_venta}</td>
        <td class="p-2">$${p.precio_compra}</td>

        <td class="p-2 space-x-1">

          <button 
            onclick="editarProducto(${p.id})"
            class="bg-yellow-500 text-white px-2 py-1 rounded text-sm"
          >
            Editar
          </button>

          <button 
            onclick="eliminarProducto(${p.id})"
            class="bg-red-600 text-white px-2 py-1 rounded text-sm"
          >
            Eliminar
          </button>

        </td>
      </tr>
    `;

    // Mobile
    listaMobile.innerHTML += `
      <div class="border rounded-xl p-3 shadow-sm flex flex-col gap-2">

        <div class="font-semibold text-lg">${p.nombre}</div>

        <div class="text-sm text-gray-600">
          Venta: <span class="font-medium">$${p.precio_venta}</span>
        </div>

        <div class="text-sm text-gray-600">
          Compra: <span class="font-medium">$${p.precio_compra}</span>
        </div>

        <div class="flex gap-2 pt-2">

          <button 
            onclick="editarProducto(${p.id})"
            class="flex-1 bg-yellow-500 text-white py-1 rounded-lg text-sm"
          >
            Editar
          </button>

          <button 
            onclick="eliminarProducto(${p.id})"
            class="flex-1 bg-red-600 text-white py-1 rounded-lg text-sm"
          >
            Eliminar
          </button>

        </div>

      </div>
    `;
  });
}


// =====================
// Buscador
// =====================
buscador.addEventListener("input", () => {

  const texto = buscador.value.toLowerCase();

  const filtrados = productosCache.filter(p =>
    p.nombre.toLowerCase().includes(texto)
  );

  renderizarProductos(filtrados);
});


// =====================
// Editar
// =====================
window.editarProducto = async (id) => {

  const p = await db.productos.get(id);

  productoIdInput.value = p.id;
  nombreInput.value = p.nombre;
  precioVentaInput.value = p.precio_venta;
  precioCompraInput.value = p.precio_compra;

  window.scrollTo({ top: 0, behavior: "smooth" });
};


// =====================
// Eliminar
// =====================
window.eliminarProducto = async (id) => {

  if (confirm("¿Eliminar producto?")) {
    await db.productos.delete(id);
    cargarProductos();
  }
};


// =====================
// Limpiar
// =====================
function limpiarFormulario() {
  form.reset();
  productoIdInput.value = "";
}
