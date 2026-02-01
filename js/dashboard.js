import { supabase } from "./supabase.js";

// Elementos del DOM
const desdeInput = document.getElementById("desde");
const hastaInput = document.getElementById("hasta");
const btnFiltrar = document.getElementById("filtrar");
const btnReset = document.getElementById("resetFiltros");
const btnActualizar = document.getElementById("btnActualizar");
const rangoSeleccionado = document.getElementById("rangoSeleccionado");
const statusActualizacion = document.getElementById("statusActualizacion");

// Métricas principales
const totalVentasEl = document.getElementById("totalVentas");
const totalComprasEl = document.getElementById("totalCompras");
const gananciaEl = document.getElementById("ganancia");
const margenGananciaEl = document.getElementById("margenGanancia");
const estadoGananciaEl = document.getElementById("estadoGanancia");
const roiEl = document.getElementById("roi");

// Comparaciones
const comparacionVentasEl = document.getElementById("comparacionVentas");
const comparacionComprasEl = document.getElementById("comparacionCompras");

// Detalles
const cantidadVentasEl = document.getElementById("cantidadVentas");
const productosVendidosEl = document.getElementById("productosVendidos");
const cantidadComprasEl = document.getElementById("cantidadCompras");
const productosCompradosEl = document.getElementById("productosComprados");

// Top productos
const topProductosEl = document.getElementById("topProductos");
const contadorTopProductos = document.getElementById("contadorTopProductos");
const btnTopCantidad = document.getElementById("btnTopCantidad");
const btnTopGanancia = document.getElementById("btnTopGanancia");

// Últimas ventas
const ultimasVentasEl = document.getElementById("ultimasVentas");
const ventasHoyEl = document.getElementById("ventasHoy");
const btnVerTodasVentas = document.getElementById("btnVerTodasVentas");

// Métricas adicionales
const totalProductosEl = document.getElementById("totalProductos");
const ticketPromedioEl = document.getElementById("ticketPromedio");
const ventaPromedioEl = document.getElementById("ventaPromedio");
const ventasPorDiaEl = document.getElementById("ventasPorDia");
const diasPeriodoEl = document.getElementById("diasPeriodo");
const rotacionProductosEl = document.getElementById("rotacionProductos");

// Análisis ABC
const categoriaAEl = document.getElementById("categoriaA");
const categoriaBEl = document.getElementById("categoriaB");
const categoriaCEl = document.getElementById("categoriaC");
const gananciaAEl = document.getElementById("gananciaA");
const gananciaBEl = document.getElementById("gananciaB");
const gananciaCEl = document.getElementById("gananciaC");

// Pronósticos
const ventasProyectadasEl = document.getElementById("ventasProyectadas");
const gananciaProyectadaEl = document.getElementById("gananciaProyectada");
const margenProyectadoEl = document.getElementById("margenProyectado");
const diasRestantesEl = document.getElementById("diasRestantes");

// Mejor/Peor producto
const mejorProductoEl = document.getElementById("mejorProducto");
const peorProductoEl = document.getElementById("peorProducto");

// Gráfico
let graficoVentas = null;
const infoGrafico = document.getElementById("infoGrafico");

// Variables globales
let ventasCache = [];
let comprasCache = [];
let productosCache = [];
let ventasAnterioresCache = [];
let comprasAnterioresCache = [];
let modoTopProductos = "cantidad"; // "cantidad" o "ganancia"

// =======================
// Configuración inicial
// =======================
function configurarFechas() {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  
  desdeInput.value = primerDiaMes.toISOString().split('T')[0];
  hastaInput.value = hoy.toISOString().split('T')[0];
  
  configurarRangosPredefinidos();
  actualizarTextoRango();
}

function configurarRangosPredefinidos() {
  const rangosContainer = document.getElementById("rangosPredefinidos");
  rangosContainer.innerHTML = `
    <button class="rango-btn text-xs bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full transition-colors font-medium whitespace-nowrap" data-dias="1">
      📅 Hoy
    </button>
    <button class="rango-btn text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap" data-dias="7">
      📅 Últimos 7 días
    </button>
    <button class="rango-btn text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap" data-dias="30">
      📅 Últimos 30 días
    </button>
    <button class="rango-btn text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap" data-mes="actual">
      📅 Este mes
    </button>
    <button class="rango-btn text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap" data-mes="anterior">
      📅 Mes anterior
    </button>
  `;
  
  // Configurar eventos de los botones de rangos predefinidos
  rangosContainer.querySelectorAll(".rango-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      aplicarRangoPredefinido(btn);
    });
  });
}

function aplicarRangoPredefinido(boton) {
  const hoy = new Date();
  const rangosBtns = document.querySelectorAll(".rango-btn");
  
  // Remover clase activa de todos los botones
  rangosBtns.forEach(btn => {
    btn.classList.remove("bg-blue-100", "text-blue-800", "font-medium");
    btn.classList.add("bg-gray-100", "text-gray-700");
  });
  
  // Aplicar clase activa al botón seleccionado
  boton.classList.remove("bg-gray-100", "text-gray-700");
  boton.classList.add("bg-blue-100", "text-blue-800", "font-medium");
  
  if (boton.dataset.dias) {
    const dias = parseInt(boton.dataset.dias);
    const fechaInicio = new Date(hoy);
    fechaInicio.setDate(fechaInicio.getDate() - dias + 1);
    
    desdeInput.value = fechaInicio.toISOString().split('T')[0];
    hastaInput.value = hoy.toISOString().split('T')[0];
  } 
  else if (boton.dataset.mes === "actual") {
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    desdeInput.value = primerDiaMes.toISOString().split('T')[0];
    hastaInput.value = ultimoDiaMes.toISOString().split('T')[0];
  }
  else if (boton.dataset.mes === "anterior") {
    const primerDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    
    desdeInput.value = primerDiaMesAnterior.toISOString().split('T')[0];
    hastaInput.value = ultimoDiaMesAnterior.toISOString().split('T')[0];
  }
  
  cargarDashboard();
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

btnActualizar?.addEventListener("click", () => {
  cargarDashboard();
});

btnTopCantidad?.addEventListener("click", () => {
  modoTopProductos = "cantidad";
  btnTopCantidad.classList.add("bg-blue-100", "text-blue-800", "font-medium");
  btnTopCantidad.classList.remove("bg-gray-100", "text-gray-700");
  btnTopGanancia.classList.remove("bg-blue-100", "text-blue-800", "font-medium");
  btnTopGanancia.classList.add("bg-gray-100", "text-gray-700");
  cargarTopProductos(ventasCache, productosCache);
});

btnTopGanancia?.addEventListener("click", () => {
  modoTopProductos = "ganancia";
  btnTopGanancia.classList.add("bg-blue-100", "text-blue-800", "font-medium");
  btnTopGanancia.classList.remove("bg-gray-100", "text-gray-700");
  btnTopCantidad.classList.remove("bg-blue-100", "text-blue-800", "font-medium");
  btnTopCantidad.classList.add("bg-gray-100", "text-gray-700");
  cargarTopProductos(ventasCache, productosCache);
});

btnVerTodasVentas?.addEventListener("click", () => {
  window.location.href = "sales.html";
});

// =======================
// Cargar Dashboard Principal
// =======================
async function cargarDashboard() {
  try {
    mostrarEstadoCarga();
    actualizarStatus("🔄 Cargando datos...", "blue");
    
    const desde = desdeInput.value;
    const hasta = hastaInput.value;
    
    actualizarTextoRango();
    
    // Cargar datos en paralelo para mejor rendimiento
    const [ventas, compras, productos, ventasAnteriores, comprasAnteriores] = await Promise.all([
      cargarVentas(desde, hasta),
      cargarCompras(desde, hasta),
      cargarProductos(),
      cargarDatosPeriodoAnterior(desde, hasta, 'ventas'),
      cargarDatosPeriodoAnterior(desde, hasta, 'compras')
    ]);
    
    // Guardar en caché
    ventasCache = ventas;
    comprasCache = compras;
    productosCache = productos;
    ventasAnterioresCache = ventasAnteriores;
    comprasAnterioresCache = comprasAnteriores;
    
    // Calcular todas las métricas
    await calcularMetricasPrincipales(ventas, compras, productos, ventasAnteriores, comprasAnteriores);
    
    // Cargar secciones adicionales
    await Promise.all([
      cargarTopProductos(ventas, productos),
      cargarUltimasVentas(),
      cargarMetricasAdicionales(ventas, compras, productos, desde, hasta),
      cargarAnalisisABC(ventas, productos),
      cargarGraficoVentas(ventas, desde, hasta),
      cargarPronosticos(ventas, compras, desde, hasta),
      cargarMejorPeorProducto(ventas, productos)
    ]);
    
    actualizarStatus("✅ Actualizado ahora", "green");
    
  } catch (error) {
    console.error("Error cargando dashboard:", error);
    mostrarNotificacion("❌ Error al cargar el dashboard", "error");
    actualizarStatus("❌ Error al cargar", "red");
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
    .order("fecha", { ascending: true });

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
    .select("id, nombre, precio_venta, precio_compra");

  if (error) throw error;
  return data || [];
}

async function cargarDatosPeriodoAnterior(desde, hasta, tipo) {
  try {
    const inicio = new Date(desde);
    const fin = new Date(hasta);
    const duracion = fin.getTime() - inicio.getTime();
    
    const inicioAnterior = new Date(inicio.getTime() - duracion - (24 * 60 * 60 * 1000));
    const finAnterior = new Date(inicio.getTime() - (24 * 60 * 60 * 1000));
    
    const desdeAnterior = inicioAnterior.toISOString().split('T')[0];
    const hastaAnterior = finAnterior.toISOString().split('T')[0];
    
    if (tipo === 'ventas') {
      const { data } = await supabase
        .from("ventas")
        .select("*")
        .gte("fecha", desdeAnterior)
        .lte("fecha", hastaAnterior);
      return data || [];
    } else {
      const { data } = await supabase
        .from("compras")
        .select("*")
        .gte("fecha", desdeAnterior)
        .lte("fecha", hastaAnterior);
      return data || [];
    }
  } catch (error) {
    console.error("Error cargando datos período anterior:", error);
    return [];
  }
}

// =======================
// Calcular métricas principales CORREGIDAS
// =======================
async function calcularMetricasPrincipales(ventas, compras, productos, ventasAnteriores, comprasAnteriores) {
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
  
  // Ganancia y margen CORREGIDO (sobre ventas, no sobre compras)
  const ganancia = totalVentas - totalCompras;
  const margen = totalVentas > 0 ? (ganancia / totalVentas * 100) : 0; // CORRECCIÓN
  
  // ROI (Retorno de Inversión)
  const roi = totalCompras > 0 ? (ganancia / totalCompras * 100) : 0;
  
  // Actualizar elementos
  totalVentasEl.textContent = `$${totalVentas.toFixed(2)}`;
  totalComprasEl.textContent = `$${totalCompras.toFixed(2)}`;
  gananciaEl.textContent = `$${ganancia.toFixed(2)}`;
  margenGananciaEl.textContent = `${margen.toFixed(1)}%`;
  roiEl.textContent = `${roi.toFixed(1)}%`;
  
  cantidadVentasEl.textContent = cantidadVentas;
  productosVendidosEl.textContent = productosVendidos;
  cantidadComprasEl.textContent = cantidadCompras;
  productosCompradosEl.textContent = productosComprados;
  
  totalProductosEl.textContent = productos.length;
  
  // Calcular comparaciones con período anterior
  const totalVentasAnterior = ventasAnteriores.reduce((sum, v) => sum + (v.cantidad * v.precio_venta), 0);
  const totalComprasAnterior = comprasAnteriores.reduce((sum, c) => sum + (c.cantidad * c.precio_compra), 0);
  
  actualizarComparacion(comparacionVentasEl, totalVentas, totalVentasAnterior);
  actualizarComparacion(comparacionComprasEl, totalCompras, totalComprasAnterior);
  
  // Estado de ganancia
  let estadoTexto = "🟢 Excelente";
  let estadoClase = "bg-green-100 text-green-800";
  
  if (ganancia <= 0) {
    estadoTexto = "🔴 Pérdida";
    estadoClase = "bg-red-100 text-red-800";
  } else if (margen < 20) {
    estadoTexto = "🟡 Aceptable";
    estadoClase = "bg-yellow-100 text-yellow-800";
  } else if (margen < 30) {
    estadoTexto = "🟢 Buena";
    estadoClase = "bg-green-100 text-green-800";
  } else {
    estadoTexto = "💎 Excelente";
    estadoClase = "bg-purple-100 text-purple-800";
  }
  
  estadoGananciaEl.textContent = estadoTexto;
  estadoGananciaEl.className = `text-xs px-3 py-1.5 rounded-full font-medium ${estadoClase}`;
}

function actualizarComparacion(elemento, valorActual, valorAnterior) {
  if (valorAnterior > 0) {
    const cambio = ((valorActual - valorAnterior) / valorAnterior * 100).toFixed(1);
    if (cambio > 0) {
      elemento.textContent = `↗️ +${cambio}%`;
      elemento.className = "font-medium text-green-600";
    } else if (cambio < 0) {
      elemento.textContent = `↘️ ${cambio}%`;
      elemento.className = "font-medium text-red-600";
    } else {
      elemento.textContent = "→ Sin cambio";
      elemento.className = "font-medium text-gray-600";
    }
  } else {
    elemento.textContent = "→ Sin comparación";
    elemento.className = "font-medium text-gray-600";
  }
}

// =======================
// Top productos más vendidos o con mayor ganancia
// =======================
async function cargarTopProductos(ventas, productos) {
  // Agrupar ventas por producto
  const ventasPorProducto = {};
  
  ventas.forEach(v => {
    const productoId = v.producto_id;
    const productoNombre = v.productos?.nombre || "Producto eliminado";
    const precioCompra = v.productos?.precio_compra || 0;
    const gananciaUnidad = v.precio_venta - precioCompra;
    const gananciaTotal = gananciaUnidad * v.cantidad;
    
    if (!ventasPorProducto[productoId]) {
      ventasPorProducto[productoId] = {
        nombre: productoNombre,
        cantidad: 0,
        total: 0,
        ganancia: 0
      };
    }
    
    ventasPorProducto[productoId].cantidad += v.cantidad;
    ventasPorProducto[productoId].total += v.cantidad * v.precio_venta;
    ventasPorProducto[productoId].ganancia += gananciaTotal;
  });
  
  // Convertir a array y ordenar según modo seleccionado
  let ranking = Object.values(ventasPorProducto);
  
  if (modoTopProductos === "cantidad") {
    ranking.sort((a, b) => b.cantidad - a.cantidad);
  } else {
    ranking.sort((a, b) => b.ganancia - a.ganancia);
  }
  
  ranking = ranking.slice(0, 5);
  
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
    
    const metrica = modoTopProductos === "cantidad" ? item.cantidad : item.ganancia;
    const etiqueta = modoTopProductos === "cantidad" ? "unidades" : "ganancia";
    const valorFormateado = modoTopProductos === "cantidad" ? 
      item.cantidad : `$${item.ganancia.toFixed(2)}`;
    
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
        <div class="font-bold text-lg">${valorFormateado}</div>
        <div class="text-xs text-gray-500">${etiqueta}</div>
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
    const { data: ventasHoy } = await supabase
      .from("ventas")
      .select("*")
      .eq("fecha", hoy);
    
    ventasHoyEl.textContent = ventasHoy?.length || 0;
    
    // Últimas 5 ventas
    const { data: ultimasVentas } = await supabase
      .from("ventas")
      .select(`
        *,
        productos:producto_id (nombre)
      `)
      .order("fecha", { ascending: false })
      .order("id", { ascending: false })
      .limit(5);
    
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
      card.className = `p-3 rounded-lg border ${esHoy ? 'border-green-200 bg-green-50' : 'border-gray-200'} hover:bg-gray-50 transition-colors`;
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">${productoNombre}</div>
            <div class="text-xs text-gray-500">${fechaFormateada}</div>
          </div>
          <div class="text-right flex-shrink-0 ml-2">
            <div class="font-bold text-green-700">$${subtotal.toFixed(2)}</div>
            <div class="text-xs text-gray-500">${venta.cantidad} und</div>
          </div>
        </div>
      `;
      
      ultimasVentasEl.appendChild(card);
    });
    
  } catch (error) {
    console.error("Error cargando últimas ventas:", error);
    ultimasVentasEl.innerHTML = `
      <div class="text-center py-6 text-gray-400">
        <div class="text-3xl mb-2">⚠️</div>
        <div>Error al cargar ventas</div>
      </div>
    `;
  }
}

// =======================
// Métricas adicionales
// =======================
async function cargarMetricasAdicionales(ventas, compras, productos, desde, hasta) {
  // Venta promedio (por transacción)
  const totalVentas = ventas.reduce((sum, v) => sum + (v.cantidad * v.precio_venta), 0);
  const ventaPromedio = ventas.length > 0 ? totalVentas / ventas.length : 0;
  ventaPromedioEl.textContent = `$${ventaPromedio.toFixed(2)}`;
  
  // Ticket promedio (incluye ganancia)
  const totalGanancia = ventas.reduce((sum, v) => {
    const precioCompra = v.productos?.precio_compra || 0;
    const gananciaUnidad = v.precio_venta - precioCompra;
    return sum + (gananciaUnidad * v.cantidad);
  }, 0);
  const ticketPromedio = ventas.length > 0 ? totalGanancia / ventas.length : 0;
  ticketPromedioEl.textContent = `$${ticketPromedio.toFixed(2)}`;
  
  // Días en período
  const inicio = new Date(desde);
  const fin = new Date(hasta);
  const diferenciaTiempo = fin.getTime() - inicio.getTime();
  const dias = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24)) + 1;
  diasPeriodoEl.textContent = dias;
  
  // Ventas por día
  const ventasPorDia = ventas.length > 0 && dias > 0 ? (totalVentas / dias) : 0;
  ventasPorDiaEl.textContent = `$${ventasPorDia.toFixed(2)}`;
  
  // Rotación de productos
  const totalProductosVendidos = ventas.reduce((sum, v) => sum + v.cantidad, 0);
  const rotacion = productos.length > 0 ? (totalProductosVendidos / productos.length) : 0;
  rotacionProductosEl.textContent = `${rotacion.toFixed(1)}x`;
}

// =======================
// Análisis ABC
// =======================
async function cargarAnalisisABC(ventas, productos) {
  // Calcular ganancia por producto
  const gananciaPorProducto = {};
  
  ventas.forEach(v => {
    const productoId = v.producto_id;
    const productoNombre = v.productos?.nombre || "Producto eliminado";
    const precioCompra = v.productos?.precio_compra || 0;
    const gananciaUnidad = v.precio_venta - precioCompra;
    const gananciaTotal = gananciaUnidad * v.cantidad;
    
    if (!gananciaPorProducto[productoId]) {
      gananciaPorProducto[productoId] = {
        nombre: productoNombre,
        ganancia: 0
      };
    }
    
    gananciaPorProducto[productoId].ganancia += gananciaTotal;
  });
  
  // Convertir a array y ordenar por ganancia descendente
  let productosConGanancia = Object.values(gananciaPorProducto);
  productosConGanancia.sort((a, b) => b.ganancia - a.ganancia);
  
  // Calcular ganancia total
  const gananciaTotal = productosConGanancia.reduce((sum, p) => sum + p.ganancia, 0);
  
  // Clasificar ABC (80/20 rule)
  let acumulado = 0;
  const categoriaA = [];
  const categoriaB = [];
  const categoriaC = [];
  
  productosConGanancia.forEach(producto => {
    acumulado += producto.ganancia;
    const porcentajeAcumulado = (acumulado / gananciaTotal) * 100;
    
    if (porcentajeAcumulado <= 80) {
      categoriaA.push(producto);
    } else if (porcentajeAcumulado <= 95) {
      categoriaB.push(producto);
    } else {
      categoriaC.push(producto);
    }
  });
  
  // Actualizar UI
  categoriaAEl.textContent = `${categoriaA.length} productos`;
  categoriaBEl.textContent = `${categoriaB.length} productos`;
  categoriaCEl.textContent = `${categoriaC.length} productos`;
  
  const gananciaA = categoriaA.reduce((sum, p) => sum + p.ganancia, 0);
  const gananciaB = categoriaB.reduce((sum, p) => sum + p.ganancia, 0);
  const gananciaC = categoriaC.reduce((sum, p) => sum + p.ganancia, 0);
  
  const porcentajeA = gananciaTotal > 0 ? (gananciaA / gananciaTotal * 100).toFixed(1) : "0";
  const porcentajeB = gananciaTotal > 0 ? (gananciaB / gananciaTotal * 100).toFixed(1) : "0";
  const porcentajeC = gananciaTotal > 0 ? (gananciaC / gananciaTotal * 100).toFixed(1) : "0";
  
  gananciaAEl.textContent = `$${gananciaA.toFixed(2)} (${porcentajeA}%)`;
  gananciaBEl.textContent = `$${gananciaB.toFixed(2)} (${porcentajeB}%)`;
  gananciaCEl.textContent = `$${gananciaC.toFixed(2)} (${porcentajeC}%)`;
}

// =======================
// Gráfico de ventas
// =======================
async function cargarGraficoVentas(ventas, desde, hasta) {
  try {
    // Agrupar ventas por fecha
    const ventasPorFecha = {};
    
    ventas.forEach(v => {
      if (!ventasPorFecha[v.fecha]) {
        ventasPorFecha[v.fecha] = 0;
      }
      ventasPorFecha[v.fecha] += v.cantidad * v.precio_venta;
    });
    
    // Ordenar fechas
    const fechas = Object.keys(ventasPorFecha).sort();
    const montos = fechas.map(fecha => ventasPorFecha[fecha]);
    
    // Configurar gráfico
    const ctx = document.getElementById('graficoVentas').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (graficoVentas) {
      graficoVentas.destroy();
    }
    
    if (fechas.length === 0) {
      infoGrafico.textContent = "No hay datos de ventas en este período";
      return;
    }
    
    // Formatear fechas para mostrar mejor
    const fechasFormateadas = fechas.map(fecha => {
      const d = new Date(fecha);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
    
    graficoVentas = new Chart(ctx, {
      type: 'line',
      data: {
        labels: fechasFormateadas,
        datasets: [{
          label: 'Ventas por día',
          data: montos,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `$${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toFixed(0);
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
    
    infoGrafico.textContent = `Mostrando ${fechas.length} días con ventas`;
    
  } catch (error) {
    console.error("Error creando gráfico:", error);
    infoGrafico.textContent = "Error al cargar gráfico de ventas";
  }
}

// =======================
// Pronósticos
// =======================
async function cargarPronosticos(ventas, compras, desde, hasta) {
  try {
    const hoy = new Date();
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const diasRestantes = Math.max(0, finMes.getDate() - hoy.getDate());
    
    diasRestantesEl.textContent = diasRestantes;
    
    if (ventas.length === 0 || diasRestantes === 0) {
      ventasProyectadasEl.textContent = "$0";
      gananciaProyectadaEl.textContent = "$0";
      margenProyectadoEl.textContent = "0%";
      return;
    }
    
    // Calcular ventas diarias promedio
    const inicio = new Date(desde);
    const fin = new Date(hasta);
    const diasTranscurridos = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 3600 * 24)) + 1;
    
    const ventasTotales = ventas.reduce((sum, v) => sum + (v.cantidad * v.precio_venta), 0);
    const comprasTotales = compras.reduce((sum, c) => sum + (c.cantidad * c.precio_compra), 0);
    
    const ventasDiariasPromedio = ventasTotales / diasTranscurridos;
    const gananciaDiariaPromedio = (ventasTotales - comprasTotales) / diasTranscurridos;
    
    // Proyección
    const ventasProyectadas = ventasTotales + (ventasDiariasPromedio * diasRestantes);
    const gananciaProyectada = (ventasTotales - comprasTotales) + (gananciaDiariaPromedio * diasRestantes);
    const margenProyectado = ventasProyectadas > 0 ? (gananciaProyectada / ventasProyectadas * 100) : 0;
    
    ventasProyectadasEl.textContent = `$${ventasProyectadas.toFixed(2)}`;
    gananciaProyectadaEl.textContent = `$${gananciaProyectada.toFixed(2)}`;
    margenProyectadoEl.textContent = `${margenProyectado.toFixed(1)}%`;
    
  } catch (error) {
    console.error("Error calculando pronósticos:", error);
  }
}

// =======================
// Mejor y peor producto por margen
// =======================
async function cargarMejorPeorProducto(ventas, productos) {
  try {
    // Calcular margen por producto
    const margenesPorProducto = {};
    
    ventas.forEach(v => {
      const productoId = v.producto_id;
      const productoNombre = v.productos?.nombre || "Producto eliminado";
      const precioCompra = v.productos?.precio_compra || 0;
      
      if (precioCompra > 0) {
        const margen = ((v.precio_venta - precioCompra) / v.precio_venta * 100);
        
        if (!margenesPorProducto[productoId]) {
          margenesPorProducto[productoId] = {
            nombre: productoNombre,
            margen: margen,
            ventas: v.cantidad * v.precio_venta
          };
        } else {
          // Promedio ponderado por ventas
          const totalVentas = margenesPorProducto[productoId].ventas + (v.cantidad * v.precio_venta);
          const margenPonderado = (
            (margenesPorProducto[productoId].margen * margenesPorProducto[productoId].ventas) + 
            (margen * v.cantidad * v.precio_venta)
          ) / totalVentas;
          
          margenesPorProducto[productoId].margen = margenPonderado;
          margenesPorProducto[productoId].ventas = totalVentas;
        }
      }
    });
    
    // Encontrar mejor y peor margen
    let mejorProducto = null;
    let peorProducto = null;
    let mejorMargen = -Infinity;
    let peorMargen = Infinity;
    
    Object.values(margenesPorProducto).forEach(producto => {
      if (producto.margen > mejorMargen && producto.ventas > 0) {
        mejorMargen = producto.margen;
        mejorProducto = producto;
      }
      if (producto.margen < peorMargen && producto.ventas > 0) {
        peorMargen = producto.margen;
        peorProducto = producto;
      }
    });
    
    // Actualizar UI
    if (mejorProducto) {
      mejorProductoEl.textContent = mejorProducto.nombre;
      mejorProductoEl.title = `${mejorProducto.nombre} - Margen: ${mejorMargen.toFixed(1)}%`;
    } else {
      mejorProductoEl.textContent = "-";
      mejorProductoEl.title = "Sin datos";
    }
    
    if (peorProducto) {
      peorProductoEl.textContent = peorProducto.nombre;
      peorProductoEl.title = `${peorProducto.nombre} - Margen: ${peorMargen.toFixed(1)}%`;
    } else {
      peorProductoEl.textContent = "-";
      peorProductoEl.title = "Sin datos";
    }
    
  } catch (error) {
    console.error("Error calculando mejor/peor producto:", error);
    mejorProductoEl.textContent = "-";
    peorProductoEl.textContent = "-";
  }
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
  estadoGananciaEl.className = "text-xs px-3 py-1.5 rounded-full font-medium bg-gray-100 text-gray-800";
  
  // Comparaciones
  comparacionVentasEl.textContent = "...";
  comparacionComprasEl.textContent = "...";
  
  // Top productos
  topProductosEl.innerHTML = `
    <div class="text-center py-6 text-gray-400">
      <div class="animate-spin text-3xl mb-2">⟳</div>
      <div>Cargando productos más vendidos...</div>
    </div>
  `;
  
  // Gráfico
  infoGrafico.textContent = "Cargando datos del gráfico...";
}

function actualizarStatus(mensaje, color) {
  if (!statusActualizacion) return;
  
  let colorClase = "bg-blue-100 text-blue-800";
  if (color === "green") colorClase = "bg-green-100 text-green-800";
  if (color === "red") colorClase = "bg-red-100 text-red-800";
  
  statusActualizacion.textContent = mensaje;
  statusActualizacion.className = `text-sm ${colorClase} px-2 py-1 rounded-full`;
}

function mostrarNotificacion(mensaje, tipo = "success") {
  const notificacionAnterior = document.querySelector(".notificacion-flotante");
  if (notificacionAnterior) notificacionAnterior.remove();

  const notificacion = document.createElement("div");
  notificacion.className = `notificacion-flotante fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 ${
    tipo === "error" ? "bg-red-100 text-red-800 border-l-4 border-red-500" :
    tipo === "info" ? "bg-blue-100 text-blue-800 border-l-4 border-blue-500" :
    tipo === "warning" ? "bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500" :
    "bg-green-100 text-green-800 border-l-4 border-green-500"
  }`;
  
  notificacion.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-xl">${tipo === "error" ? "❌" : tipo === "info" ? "ℹ️" : tipo === "warning" ? "⚠️" : "✅"}</span>
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
  
  // Actualizar hora del status cada minuto
  setInterval(() => {
    const ahora = new Date();
    const hora = ahora.getHours().toString().padStart(2, '0');
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    statusActualizacion.textContent = `↻ Actualizado ${hora}:${minutos}`;
  }, 60000);
});