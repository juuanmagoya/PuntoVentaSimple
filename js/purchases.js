import { db } from "./db.js";

const form = document.getElementById("formCompra");
const tabla = document.getElementById("tablaCompras");
const listaMobile = document.getElementById("listaMobile");

const compraIdInput = document.getElementById("compraId");
const selectProducto = document.getElementById("productoSelect");
const cantidadInput = document.getElementById("cantidad");
const precioInput = document.getElementById("precioCompra");
const proveedorInput = document.getElementById("proveedor");
const fechaInput = document.getElementById("fecha");

fechaInput.valueAsDate = new Date();

cargarProductos();
cargarCompras();

/* ===================
   Productos
=================== */
async function cargarProductos() {
  const productos = await db.productos.toArray();

  selectProducto.innerHTML = `<option value="">Seleccionar producto</option>`;

  productos.forEach(p => {
    selectProducto.innerHTML += `
      <option value="${p.id}">${p.nombre}</option>
    `;
  });
}

/* ===================
   Guardar / editar
=================== */
form.addEventListener("submit", async e => {
  e.preventDefault();

  const compra = {
    producto_id: Number(selectProducto.value),
    cantidad: Number(cantidadInput.value),
    precio_compra: Number(precioInput.value),
    proveedor: proveedorInput.value,
    fecha: fechaInput.value
  };

  const id = compraIdInput.value;

  if (id) {
    await db.compras.update(Number(id), compra);
  } else {
    await db.compras.add(compra);
  }

  limpiarFormulario();
  cargarCompras();
});

/* ===================
   Cargar compras
=================== */
async function cargarCompras() {
  const compras = await db.compras.toArray();
  const productos = await db.productos.toArray();

  tabla.innerHTML = "";
  listaMobile.innerHTML = "";

  compras.forEach(c => {

    const producto = productos.find(p => p.id === c.producto_id);

    const nombreProducto = producto ? producto.nombre : "Eliminado";

    /* Desktop row */
    tabla.innerHTML += `
      <tr class="border-b">
        <td class="p-2">${nombreProducto}</td>
        <td class="p-2">${c.cantidad}</td>
        <td class="p-2">$${c.precio_compra}</td>
        <td class="p-2">${c.proveedor}</td>
        <td class="p-2">${c.fecha}</td>
        <td class="p-2 space-x-2">

          <button onclick="editarCompra(${c.id})"
            class="bg-yellow-500 text-white px-2 rounded">
            Editar
          </button>

          <button onclick="eliminarCompra(${c.id})"
            class="bg-red-600 text-white px-2 rounded">
            Eliminar
          </button>

        </td>
      </tr>
    `;

    /* Mobile card */
    listaMobile.innerHTML += `
      <div class="border rounded-xl p-4 bg-gray-50 shadow-sm">

        <div class="font-semibold text-lg">${nombreProducto}</div>

        <div class="text-sm text-gray-600 mt-1">
          Cantidad: <b>${c.cantidad}</b>
        </div>

        <div class="text-sm text-gray-600">
          Precio: <b>$${c.precio_compra}</b>
        </div>

        <div class="text-sm text-gray-600">
          Proveedor: <b>${c.proveedor}</b>
        </div>

        <div class="text-sm text-gray-600">
          Fecha: <b>${c.fecha}</b>
        </div>

        <div class="flex gap-3 mt-3">

          <button 
            onclick="editarCompra(${c.id})"
            class="flex-1 bg-yellow-500 text-white rounded-lg py-1"
          >
            Editar
          </button>

          <button 
            onclick="eliminarCompra(${c.id})"
            class="flex-1 bg-red-600 text-white rounded-lg py-1"
          >
            Eliminar
          </button>

        </div>

      </div>
    `;
  });
}

/* ===================
   Editar
=================== */
window.editarCompra = async id => {
  const c = await db.compras.get(id);

  compraIdInput.value = c.id;
  selectProducto.value = c.producto_id;
  cantidadInput.value = c.cantidad;
  precioInput.value = c.precio_compra;
  proveedorInput.value = c.proveedor;
  fechaInput.value = c.fecha;
};

/* ===================
   Eliminar
=================== */
window.eliminarCompra = async id => {
  if (confirm("¿Eliminar compra?")) {
    await db.compras.delete(id);
    cargarCompras();
  }
};

/* ===================
   Limpiar
=================== */
function limpiarFormulario() {
  form.reset();
  compraIdInput.value = "";
  fechaInput.valueAsDate = new Date();
}
