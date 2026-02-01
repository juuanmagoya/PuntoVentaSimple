import { supabase } from "./supabase.js";

const desdeInput = document.getElementById("desde");
const hastaInput = document.getElementById("hasta");
const btnFiltrar = document.getElementById("filtrar");
const btnReset = document.getElementById("resetFiltros");
const rangoSeleccionado = document.getElementById("rangoSeleccionado");

// Métricas principales
const totalVentasEl = document.getElementById("totalVentas");
const totalComprasEl = document.getElementById("totalCompras");
const gananciaEl = document.getElementById("ganancia");
const margenGananciaEl = document.getElementById("margenGanancia");
const estadoGananciaEl = document.getElementById("estadoGanancia");

// Detalles
const cantidadVentasEl = document.getElementById("cantidadVentas");
const productosVendidosEl = document.getElementById("productosVendidos");
const cantidadComprasEl = document.getElementById("cantidadCompras");
const productosCompradosEl = document.getElementById("productosComprados");

// Top productos
const topProductosEl = document.getElementById("topProductos");
const contadorTopProductos = document.getElementById("contadorTopProductos");

// Últimas ventas
const ultimasVentasEl = document.getElementById("ultimasVentas");
const ventasHoyEl = document.getElementById("ventasHoy");

// Métricas adicionales
const totalProductosEl = document.getElementById("totalProductos");
const ventaPromedioEl = document.getElementById("ventaPromedio");
const diasPeriodoEl = document.getElementById("diasPeriodo");
const ventasPorDiaEl = document.getElementById("ventasPorDia");

// =======================
// Configuración inicial
// =======================
function configurarFechas() {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  
  desdeInput.value = primerDiaMes.toISOString().split('T')[0];
  hastaInput.value = hoy.toISOString().split('T')[0];
  
  actualizarTextoRango();
}

function actualizarTextoRango() {
  const desde = new Date(desdeInput.value);
  const hasta = new Date(hastaInput.value);
  
  const formatoDesde = desde.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'short' 
  });
  
  const formatoHasta = hasta.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'short',
    year: 'numeric'
  });
  
  rangoSeleccionado.textContent = `Mostrando datos del ${formatoDesde} al ${formatoHasta}`;
}

// =======================
// Event Listeners
// =======================
btnFiltrar.addEventListener("click", () => {
  cargarDashboard();
  mostrarNotificacion("📊 Filtro aplicado correctamente", "info");
});

btnReset.addEventListener("click", () => {
  const hoy = new Date();
  const hoyStr = hoy.toISOString().split('T')[0];
  
  desdeInput.value = hoyStr;
  hastaInput.value = hoyStr;
  
  cargarDashboard();
  mostrarNotificacion("🔄 Mostrando datos de hoy", "info");
});

// =======================
// Cargar Dashboard
// =======================
async function cargarDashboard() {
  try {
    // Mostrar estado de carga
    mostrarEstadoCarga();
    
    const desde = desdeInput.value;
    const hasta = hastaInput.value;
    
    actualizarTextoRango();
    
    // Cargar datos en paralelo
    const [ventas, compras, productos] = await Promise.all([
      cargarVentas(desde, hasta),
      cargarCompras(desde, hasta),
      cargarProductos()
    ]);
    
    // Calcular métricas
    await calcularMetricas(ventas, compras, productos);
    
    // Cargar secciones adicionales
    await Promise.all([
      cargarTopProductos(ventas, productos),
      cargarUltimasVentas(),
      cargarMetricasAdicionales(ventas, desde, hasta)
    ]);
    
  } catch (error) {
    console.error("Error cargando dashboard:", error);
    mostrarNotificacion("❌ Error al cargar el dashboard", "error");
  }
}

// =======================
// Cargar datos
// =======================
async function cargarVentas(desde, hasta) {
  const { data, error } = await supabase
    .from("ventas")
    .select(`
      *,
      productos:producto_id (nombre, precio_compra)
    `)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function cargarCompras(desde, hasta) {
  const { data, error } = await supabase
    .from("compras")
    .select("*")
    .gte("fecha", desde)
    .lte("fecha", hasta);

  if (error) throw error;
  return data || [];
}

async function cargarProductos() {
  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre");

  if (error) throw error;
  return data || [];
}

// =======================
// Calcular métricas principales
// =======================
async function calcularMetricas(ventas, compras, productos) {
  // Totales ventas
  let totalVentas = 0;
  let cantidadVentas = ventas.length;
  let productosVendidos = 0;
  
  ventas.forEach(v => {
    const subtotal = v.cantidad * v.precio_venta;
    totalVentas += subtotal;
    productosVendidos += v.cantidad;
  });
  
  // Totales compras
  let totalCompras = 0;
  let cantidadCompras = compras.length;
  let productosComprados = 0;
  
  compras.forEach(c => {
    const subtotal = c.cantidad * c.precio_compra;
    totalCompras += subtotal;
    productosComprados += c.cantidad;
  });
  
  // Ganancia y margen
  const ganancia = totalVentas - totalCompras;
  const margen = totalCompras > 0 ? (ganancia / totalCompras * 100) : 0;
  
  // Actualizar elementos
  totalVentasEl.textContent = `$${totalVentas.toFixed(2)}`;
  totalComprasEl.textContent = `$${totalCompras.toFixed(2)}`;
  gananciaEl.textContent = `$${ganancia.toFixed(2)}`;
  margenGananciaEl.textContent = `${margen.toFixed(1)}%`;
  
  cantidadVentasEl.textContent = cantidadVentas;
  productosVendidosEl.textContent = productosVendidos;
  cantidadComprasEl.textContent = cantidadCompras;
  productosCompradosEl.textContent = productosComprados;
  
  totalProductosEl.textContent = productos.length;
  
  // Estado de ganancia
  let estadoTexto = "🟢 Excelente";
  let estadoClase = "bg-green-100 text-green-800";
  
  if (ganancia <= 0) {
    estadoTexto = "🔴 Pérdida";
    estadoClase = "bg-red-100 text-red-800";
  } else if (margen < 20) {
    estadoTexto = "🟡 Aceptable";
    estadoClase = "bg-yellow-100 text-yellow-800";
  }
  
  estadoGananciaEl.textContent = estadoTexto;
  estadoGananciaEl.className = `text-xs px-2 py-1 rounded-full ${estadoClase}`;
}

// =======================
// Top productos más vendidos
// =======================
async function cargarTopProductos(ventas, productos) {
  // Agrupar ventas por producto
  const ventasPorProducto = {};
  
  ventas.forEach(v => {
    const productoId = v.producto_id;
    const productoNombre = v.productos?.nombre || "Producto eliminado";
    
    if (!ventasPorProducto[productoId]) {
      ventasPorProducto[productoId] = {
        nombre: productoNombre,
        cantidad: 0,
        total: 0
      };
    }
    
    ventasPorProducto[productoId].cantidad += v.cantidad;
    ventasPorProducto[productoId].total += v.cantidad * v.precio_venta;
  });
  
  // Convertir a array y ordenar
  const ranking = Object.values(ventasPorProducto)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);
  
  // Actualizar contador
  contadorTopProductos.textContent = ranking.length;
  
  // Renderizar
  topProductosEl.innerHTML = "";
  
  if (ranking.length === 0) {
    topProductosEl.innerHTML = `
      <div class="text-center py-6 text-gray-400">
        <div class="text-3xl mb-2">📊</div>
        <div>No hay ventas en este período</div>
      </div>
    `;
    return;
  }
  
  ranking.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors";
    
    // Color según posición
    let colorClase = "text-gray-600";
    let bgClase = "bg-gray-100";
    
    if (index === 0) {
      colorClase = "text-yellow-600";
      bgClase = "bg-yellow-50";
    } else if (index === 1) {
      colorClase = "text-gray-500";
      bgClase = "bg-gray-50";
    } else if (index === 2) {
      colorClase = "text-amber-700";
      bgClase = "bg-amber-50";
    }
    
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="${bgClase} ${colorClase} w-8 h-8 rounded-lg flex items-center justify-center font-bold">
          ${index + 1}
        </div>
        <div>
          <div class="font-medium">${item.nombre}</div>
          <div class="text-xs text-gray-500">$${item.total.toFixed(2)} total</div>
        </div>
      </div>
      <div class="text-right">
        <div class="font-bold text-lg">${item.cantidad}</div>
        <div class="text-xs text-gray-500">unidades</div>
      </div>
    `;
    
    topProductosEl.appendChild(card);
  });
}

// =======================
// Últimas ventas
// =======================
async function cargarUltimasVentas() {
  try {
    // Ventas de hoy para el contador
    const hoy = new Date().toISOString().split('T')[0];
    const { data: ventasHoy, error: errorHoy } = await supabase
      .from("ventas")
      .select("*")
      .eq("fecha", hoy);
    
    if (!errorHoy) {
      ventasHoyEl.textContent = ventasHoy?.length || 0;
    }
    
    // Últimas 5 ventas
    const { data: ultimasVentas, error } = await supabase
      .from("ventas")
      .select(`
        *,
        productos:producto_id (nombre)
      `)
      .order("fecha", { ascending: false })
      .order("id", { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    ultimasVentasEl.innerHTML = "";
    
    if (!ultimasVentas || ultimasVentas.length === 0) {
      ultimasVentasEl.innerHTML = `
        <div class="text-center py-6 text-gray-400">
          <div class="text-3xl mb-2">🕒</div>
          <div>No hay ventas recientes</div>
        </div>
      `;
      return;
    }
    
    ultimasVentas.forEach(venta => {
      const productoNombre = venta.productos?.nombre || "Producto eliminado";
      const fecha = new Date(venta.fecha);
      const esHoy = fecha.toDateString() === new Date().toDateString();
      
      const fechaFormateada = fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const subtotal = venta.cantidad * venta.precio_venta;
      
      const card = document.createElement("div");
      card.className = `p-3 rounded-lg border ${esHoy ? 'border-green-200 bg-green-50' : 'border-gray-200'}`;
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <div class="font-medium">${productoNombre}</div>
            <div class="text-xs text-gray-500">${fechaFormateada}</div>
          </div>
          <div class="text-right">
            <div class="font-bold text-green-700">$${subtotal.toFixed(2)}</div>
            <div class="text-xs text-gray-500">${venta.cantidad} und</div>
          </div>
        </div>
      `;
      
      ultimasVentasEl.appendChild(card);
    });
    
  } catch (error) {
    console.error("Error cargando últimas ventas:", error);
  }
}

// =======================
// Métricas adicionales
// =======================
async function cargarMetricasAdicionales(ventas, desde, hasta) {
  // Venta promedio
  const totalVentas = ventas.reduce((sum, v) => sum + (v.cantidad * v.precio_venta), 0);
  const ventaPromedio = ventas.length > 0 ? totalVentas / ventas.length : 0;
  ventaPromedioEl.textContent = `$${ventaPromedio.toFixed(2)}`;
  
  // Días en período
  const inicio = new Date(desde);
  const fin = new Date(hasta);
  const diferenciaTiempo = fin.getTime() - inicio.getTime();
  const dias = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24)) + 1;
  diasPeriodoEl.textContent = dias;
  
  // Ventas por día
  const ventasPorDia = ventas.length > 0 && dias > 0 ? ventas.length / dias : 0;
  ventasPorDiaEl.textContent = ventasPorDia.toFixed(1);
}

// =======================
// Utilidades
// =======================
function mostrarEstadoCarga() {
  // Métricas principales
  totalVentasEl.textContent = "$...";
  totalComprasEl.textContent = "$...";
  gananciaEl.textContent = "$...";
  margenGananciaEl.textContent = "...%";
  estadoGananciaEl.textContent = "Cargando...";
  estadoGananciaEl.className = "text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800";
  
  // Top productos
  topProductosEl.innerHTML = `
    <div class="text-center py-6 text-gray-400">
      <div class="animate-spin text-3xl mb-2">⟳</div>
      <div>Cargando productos más vendidos...</div>
    </div>
  `;
}

function mostrarNotificacion(mensaje, tipo = "success") {
  const notificacionAnterior = document.querySelector(".notificacion-flotante");
  if (notificacionAnterior) notificacionAnterior.remove();

  const notificacion = document.createElement("div");
  notificacion.className = `notificacion-flotante fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 ${
    tipo === "error" ? "bg-red-100 text-red-800 border-l-4 border-red-500" :
    tipo === "info" ? "bg-blue-100 text-blue-800 border-l-4 border-blue-500" :
    "bg-green-100 text-green-800 border-l-4 border-green-500"
  }`;
  
  notificacion.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-xl">${tipo === "error" ? "❌" : tipo === "info" ? "ℹ️" : "✅"}</span>
      <div>${mensaje}</div>
    </div>
  `;

  document.body.appendChild(notificacion);

  setTimeout(() => {
    notificacion.style.opacity = "0";
    notificacion.style.transform = "translateX(100%)";
    setTimeout(() => notificacion.remove(), 300);
  }, 3000);
}

// =======================
// Inicialización
// =======================
document.addEventListener('DOMContentLoaded', () => {
  configurarFechas();
  cargarDashboard();
  
  // Actualizar automáticamente cada 30 segundos
  setInterval(() => {
    cargarDashboard();
  }, 30000);
});