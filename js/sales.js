import { db } from "./db.js";

const form = document.getElementById("formVenta");
const tabla = document.getElementById("tablaVentas");
const listaMobile = document.getElementById("listaMobile");

const ventaIdInput = document.getElementById("ventaId");
const selectProducto = document.getElementById("productoSelect");
const cantidadInput = document.getElementById("cantidad");
const precioInput = document.getElementById("precioVenta");
const fechaInput = document.getElementById("fecha");

fechaInput.valueAsDate = new Date();

cargarProductos();
cargarVentas();

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

  const venta = {
    producto_id: Number(selectProducto.value),
    cantidad: Number(cantidadInput.value),
    precio_venta: Number(precioInput.value),
    fecha: fechaInput.value
  };

  const id = ventaIdInput.value;

  if (id) {
    await db.ventas.update(Number(id), venta);
  } else {
    await db.ventas.add(venta);
  }

  limpiarFormulario();
  cargarVentas();
});

/* ===================
   Cargar ventas
=================== */
async function cargarVentas() {
  const ventas = await db.ventas.toArray();
  const productos = await db.productos.toArray();

  tabla.innerHTML = "";
  listaMobile.innerHTML = "";

  ventas.forEach(v => {

    const producto = productos.find(p => p.id === v.producto_id);
    const nombreProducto = producto ? producto.nombre : "Eliminado";

    /* Desktop row */
    tabla.innerHTML += `
      <tr class="border-b">
        <td class="p-2">${nombreProducto}</td>
        <td class="p-2">${v.cantidad}</td>
        <td class="p-2">$${v.precio_venta}</td>
        <td class="p-2">${v.fecha}</td>
        <td class="p-2 space-x-2">

          <button onclick="editarVenta(${v.id})"
            class="bg-yellow-500 text-white px-2 rounded">
            Editar
          </button>

          <button onclick="eliminarVenta(${v.id})"
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
          Cantidad: <b>${v.cantidad}</b>
        </div>

        <div class="text-sm text-gray-600">
          Precio: <b>$${v.precio_venta}</b>
        </div>

        <div class="text-sm text-gray-600">
          Fecha: <b>${v.fecha}</b>
        </div>

        <div class="flex gap-3 mt-3">

          <button 
            onclick="editarVenta(${v.id})"
            class="flex-1 bg-yellow-500 text-white rounded-lg py-1"
          >
            Editar
          </button>

          <button 
            onclick="eliminarVenta(${v.id})"
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
window.editarVenta = async id => {
  const v = await db.ventas.get(id);

  ventaIdInput.value = v.id;
  selectProducto.value = v.producto_id;
  cantidadInput.value = v.cantidad;
  precioInput.value = v.precio_venta;
  fechaInput.value = v.fecha;
};

/* ===================
   Eliminar
=================== */
window.eliminarVenta = async id => {
  if (confirm("¿Eliminar venta?")) {
    await db.ventas.delete(id);
    cargarVentas();
  }
};

/* ===================
   Limpiar
=================== */
function limpiarFormulario() {
  form.reset();
  ventaIdInput.value = "";
  fechaInput.valueAsDate = new Date();
}
