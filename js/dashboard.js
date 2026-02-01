import { db } from "./db.js";

const desdeInput = document.getElementById("desde");
const hastaInput = document.getElementById("hasta");
const btnFiltrar = document.getElementById("filtrar");

const totalVentasEl = document.getElementById("totalVentas");
const totalComprasEl = document.getElementById("totalCompras");
const gananciaEl = document.getElementById("ganancia");

const topProductosEl = document.getElementById("topProductos");

// =======================
// Fechas por defecto (mes actual)
// =======================
const hoy = new Date();
const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

desdeInput.valueAsDate = primerDiaMes;
hastaInput.valueAsDate = hoy;

btnFiltrar.addEventListener("click", cargarDashboard);

cargarDashboard();


// =======================
// Dashboard general
// =======================
async function cargarDashboard() {

  const desde = desdeInput.value;
  const hasta = hastaInput.value;

  // Ventas en rango
  const ventas = await db.ventas
    .where("fecha")
    .between(desde, hasta, true, true)
    .toArray();

  // Compras en rango
  const compras = await db.compras
    .where("fecha")
    .between(desde, hasta, true, true)
    .toArray();

  // ===================
  // Totales
  // ===================

  let totalVentas = 0;
  ventas.forEach(v => {
    totalVentas += v.cantidad * v.precio_venta;
  });

  let totalCompras = 0;
  compras.forEach(c => {
    totalCompras += c.cantidad * c.precio_compra;
  });

  const ganancia = totalVentas - totalCompras;

  totalVentasEl.textContent = `$${totalVentas.toFixed(2)}`;
  totalComprasEl.textContent = `$${totalCompras.toFixed(2)}`;
  gananciaEl.textContent = `$${ganancia.toFixed(2)}`;

  // ===================
  // Top productos vendidos
  // ===================

  await cargarTopProductos(ventas);
}


// =======================
// Top productos
// =======================
async function cargarTopProductos(ventas) {

  const productos = await db.productos.toArray();

  // Agrupar cantidades por producto
  const contador = {};

  ventas.forEach(v => {
    if (!contador[v.producto_id]) {
      contador[v.producto_id] = 0;
    }

    contador[v.producto_id] += v.cantidad;
  });

  // Convertir a array
  let ranking = Object.keys(contador).map(id => {

    const producto = productos.find(p => p.id == id);

    return {
      producto: producto ? producto.nombre : "Eliminado",
      cantidad: contador[id]
    };
  });

  // Ordenar de mayor a menor
  ranking.sort((a, b) => b.cantidad - a.cantidad);

  // Mostrar top 5
  const top5 = ranking.slice(0, 5);

  topProductosEl.innerHTML = "";

  if (top5.length === 0) {
    topProductosEl.innerHTML = `
      <li class="text-gray-500">
        No hay ventas en este rango
      </li>
    `;
    return;
  }

  top5.forEach((item, index) => {

    topProductosEl.innerHTML += `
      <li class="flex justify-between bg-gray-100 p-2 rounded">

        <span>
          ${index + 1}. ${item.producto}
        </span>

        <span class="font-bold">
          ${item.cantidad}
        </span>

      </li>
    `;
  });
}
