import { supabase } from "./supabase.js";

const form = document.getElementById("formVenta");
const tabla = document.getElementById("tablaVentas");
const listaMobile = document.getElementById("listaMobile");
const buscador = document.getElementById("buscadorVentas");
const selectProducto = document.getElementById("productoSelect");

const ventaIdInput = document.getElementById("ventaId");
const cantidadInput = document.getElementById("cantidad");
const precioInput = document.getElementById("precioVenta");
const fechaInput = document.getElementById("fecha");

let ventasCache = [];
let productosCache = [];
let productosFiltrados = [];
let selectAbierto = false;

// =====================
// Inicialización
// =====================
document.addEventListener('DOMContentLoaded', () => {
  if (fechaInput && !fechaInput.value) {
    const today = new Date().toISOString().split('T')[0];
    fechaInput.value = today;
  }
  cargarProductos();
  cargarVentas();
});

// =====================
// Cargar productos para el select CON BUSCADOR
// =====================
async function cargarProductos() {
  try {
    const { data, error } = await supabase
      .from("productos")
      .select("id, nombre, precio_venta, precio_compra")
      .order("nombre", { ascending: true });

    if (error) throw error;

    productosCache = data || [];
    productosFiltrados = [...productosCache];
    
    // Reemplazar el select por nuestro custom select con buscador
    reemplazarSelectConBuscador();
    
    if (productosCache.length === 0) {
      mostrarMensajeSinProductos();
    } else {
      actualizarContadorProductos();
    }
    
  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al cargar productos", "error");
  }
}

// =====================
// Reemplazar select por custom select con buscador
// =====================
function reemplazarSelectConBuscador() {
  const contenedorOriginal = selectProducto.parentElement;
  
  // Crear contenedor del custom select
  const customSelectContainer = document.createElement("div");
  customSelectContainer.className = "relative";
  customSelectContainer.id = "customSelectContainer";
  
  // Input para mostrar selección
  const displayInput = document.createElement("input");
  displayInput.type = "text";
  displayInput.placeholder = "📦 Seleccionar producto...";
  displayInput.className = "w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 cursor-pointer bg-white";
  displayInput.readOnly = true;
  displayInput.id = "selectDisplay";
  
  // Icono de flecha
  const flechaIcono = document.createElement("div");
  flechaIcono.className = "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none";
  flechaIcono.innerHTML = "▼";
  
  // Dropdown con buscador
  const dropdown = document.createElement("div");
  dropdown.className = "absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-80 overflow-hidden hidden";
  dropdown.id = "productosDropdown";
  
  // Buscador dentro del dropdown
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "🔍 Buscar producto por nombre o ID...";
  searchInput.className = "w-full p-3 border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 sticky top-0 bg-white";
  searchInput.id = "productoSearch";
  
  // Contador de resultados
  const contadorResultados = document.createElement("div");
  contadorResultados.className = "text-xs text-gray-500 px-3 py-2 border-b border-gray-100 bg-gray-50";
  contadorResultados.id = "contadorResultados";
  
  // Lista de resultados
  const resultadosContainer = document.createElement("div");
  resultadosContainer.className = "max-h-64 overflow-y-auto";
  resultadosContainer.id = "productosResultados";
  
  dropdown.appendChild(searchInput);
  dropdown.appendChild(contadorResultados);
  dropdown.appendChild(resultadosContainer);
  
  customSelectContainer.appendChild(displayInput);
  customSelectContainer.appendChild(flechaIcono);
  customSelectContainer.appendChild(dropdown);
  
  // Reemplazar el select original
  contenedorOriginal.insertBefore(customSelectContainer, selectProducto);
  selectProducto.style.display = "none";
  
  // Configurar eventos
  configurarEventosSelectCustom(displayInput, dropdown, searchInput, resultadosContainer, contadorResultados);
}

// =====================
// Configurar eventos del custom select
// =====================
function configurarEventosSelectCustom(displayInput, dropdown, searchInput, resultadosContainer, contadorResultados) {
  // Mostrar/ocultar dropdown
  displayInput.addEventListener("click", (e) => {
    e.stopPropagation();
    selectAbierto = !selectAbierto;
    dropdown.classList.toggle("hidden", !selectAbierto);
    
    if (selectAbierto) {
      searchInput.value = "";
      filtrarProductos("", resultadosContainer, contadorResultados);
      searchInput.focus();
    }
  });
  
  // Cerrar dropdown al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#customSelectContainer")) {
      selectAbierto = false;
      dropdown.classList.add("hidden");
    }
  });
  
  // Buscar productos
  searchInput.addEventListener("input", (e) => {
    filtrarProductos(e.target.value, resultadosContainer, contadorResultados);
  });
  
  // Manejar teclas en buscador
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      selectAbierto = false;
      dropdown.classList.add("hidden");
    }
    if (e.key === "Enter" && productosFiltrados.length === 1) {
      seleccionarProducto(productosFiltrados[0]);
      dropdown.classList.add("hidden");
      selectAbierto = false;
    }
  });
}

// =====================
// Filtrar y mostrar productos
// =====================
function filtrarProductos(terminoBusqueda, resultadosContainer, contadorResultados) {
  const termino = terminoBusqueda.toLowerCase().trim();
  
  if (termino === "") {
    productosFiltrados = [...productosCache];
  } else {
    productosFiltrados = productosCache.filter(p =>
      p.nombre.toLowerCase().includes(termino) ||
      p.id.toString().includes(termino)
    );
  }
  
  // Actualizar contador
  contadorResultados.textContent = `${productosFiltrados.length} producto${productosFiltrados.length !== 1 ? 's' : ''} encontrado${productosFiltrados.length !== 1 ? 's' : ''}`;
  
  renderizarResultadosBusqueda(resultadosContainer);
}

// =====================
// Renderizar resultados de búsqueda
// =====================
function renderizarResultadosBusqueda(resultadosContainer) {
  resultadosContainer.innerHTML = "";
  
  if (productosFiltrados.length === 0) {
    resultadosContainer.innerHTML = `
      <div class="p-4 text-center text-gray-500">
        <div class="text-2xl mb-2">🔍</div>
        <div>No se encontraron productos</div>
        <div class="text-sm mt-1">Intenta con otro término de búsqueda</div>
      </div>
    `;
    return;
  }
  
  productosFiltrados.forEach(producto => {
    const item = document.createElement("div");
    item.className = "p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-200 flex items-center justify-between";
    item.dataset.id = producto.id;
    item.dataset.nombre = producto.nombre;
    item.dataset.precioVenta = producto.precio_venta;
    item.dataset.precioCompra = producto.precio_compra;
    
    // Calcular margen si tenemos precio_compra
    const margen = producto.precio_venta > 0 
      ? ((producto.precio_venta - producto.precio_compra) / producto.precio_venta * 100).toFixed(1)
      : "0";
    
    const colorMargen = parseFloat(margen) > 0 ? 'text-green-500' : 'text-red-500';
    
    item.innerHTML = `
      <div>
        <div class="font-medium">${producto.nombre}</div>
        <div class="text-sm text-gray-500">ID: ${producto.id}</div>
      </div>
      <div class="text-right">
        <div class="font-semibold text-green-600">$${producto.precio_venta}</div>
        <div class="text-xs ${colorMargen}">
          ${margen}% margen
        </div>
      </div>
    `;
    
    item.addEventListener("click", () => {
      seleccionarProducto(producto);
      document.getElementById("productosDropdown").classList.add("hidden");
      selectAbierto = false;
    });
    
    item.addEventListener("mouseenter", () => {
      item.classList.add("bg-blue-50");
    });
    
    item.addEventListener("mouseleave", () => {
      item.classList.remove("bg-blue-50");
    });
    
    resultadosContainer.appendChild(item);
  });
}

// =====================
// Seleccionar producto
// =====================
function seleccionarProducto(producto) {
  const displayInput = document.getElementById("selectDisplay");
  displayInput.value = producto.nombre;
  
  // Actualizar el select original oculto
  selectProducto.value = producto.id;
  
  // Actualizar precio si está vacío
  if (precioInput && !precioInput.value) {
    precioInput.value = producto.precio_venta;
    
    // Mostrar información completa
    let mensaje = `💰 Precio sugerido: $${producto.precio_venta}`;
    if (producto.precio_compra) {
      const ganancia = producto.precio_venta - producto.precio_compra;
      const margen = producto.precio_compra > 0 ? (ganancia / producto.precio_compra * 100).toFixed(1) : "0";
      mensaje += ` | Ganancia: $${ganancia.toFixed(2)} (${margen}%)`;
    }
    
    mostrarNotificacion(mensaje, "info");
  }
  
  // Agregar estilo de selección
  displayInput.classList.remove("border-gray-300");
  displayInput.classList.add("border-blue-500", "bg-blue-50");
  
  // Enfocar cantidad
  if (cantidadInput) {
    setTimeout(() => cantidadInput.focus(), 100);
  }
}

// =====================
// Mostrar mensaje cuando no hay productos
// =====================
function mostrarMensajeSinProductos() {
  const displayInput = document.getElementById("selectDisplay");
  if (displayInput) {
    displayInput.value = "";
    displayInput.placeholder = "⚠️ No hay productos. Agrega primero en Productos";
    displayInput.disabled = true;
    displayInput.classList.add("bg-gray-100", "text-gray-500");
  }
}

// =====================
// Actualizar contador de productos
// =====================
function actualizarContadorProductos() {
  const contadorProductos = document.getElementById("contadorProductos");
  if (contadorProductos) {
    contadorProductos.textContent = `${productosCache.length} producto${productosCache.length !== 1 ? 's' : ''} disponibles`;
  }
}

// =====================
// Guardar / editar venta
// =====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Validar que haya productos disponibles
  if (productosCache.length === 0) {
    mostrarNotificacion("⚠️ Primero debes agregar productos en la sección Productos", "error");
    return;
  }

  const venta = {
    producto_id: Number(selectProducto.value),
    cantidad: Number(cantidadInput.value),
    precio_venta: Number(precioInput.value),
    fecha: fechaInput.value
  };

  // Validaciones básicas
  if (!venta.producto_id) {
    mostrarNotificacion("❌ Selecciona un producto", "error");
    const displayInput = document.getElementById("selectDisplay");
    if (displayInput) displayInput.focus();
    return;
  }

  if (venta.cantidad <= 0) {
    mostrarNotificacion("❌ La cantidad debe ser mayor a 0", "error");
    cantidadInput.focus();
    return;
  }

  if (venta.precio_venta <= 0) {
    mostrarNotificacion("❌ El precio debe ser mayor a 0", "error");
    precioInput.focus();
    return;
  }

  const id = ventaIdInput.value;
  const boton = form.querySelector("button");
  const textoOriginal = boton.textContent;

  try {
    // Mostrar estado de carga
    boton.disabled = true;
    boton.innerHTML = '<span class="animate-spin mr-2">⟳</span>Guardando...';

    if (id) {
      // Editar venta
      const { error } = await supabase
        .from("ventas")
        .update(venta)
        .eq("id", id);

      if (error) throw error;
      mostrarNotificacion("✅ Venta actualizada correctamente");
    } else {
      // Crear nueva venta
      const { error } = await supabase
        .from("ventas")
        .insert([venta]);

      if (error) throw error;
      mostrarNotificacion("✅ Venta registrada exitosamente");
    }

    limpiarFormulario();
    await cargarVentas();
    
  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al procesar la venta", "error");
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
});

// =====================
// Cargar ventas desde Supabase
// =====================
async function cargarVentas() {
  const contenedor = tabla.parentElement;
  const estadoCarga = document.createElement("div");
  estadoCarga.className = "p-8 text-center text-gray-500";
  estadoCarga.innerHTML = '<span class="animate-spin mr-2">⟳</span>Cargando ventas...';
  
  const tablaExistente = contenedor.querySelector(".tabla-ventas-contenedor");
  if (tablaExistente) tablaExistente.style.opacity = "0.5";
  else contenedor.appendChild(estadoCarga);

  try {
    const { data, error } = await supabase
      .from("ventas")
      .select(`
        *,
        productos:producto_id (nombre, precio_compra)
      `)
      .order("fecha", { ascending: false })
      .order("id", { ascending: false });

    if (error) throw error;

    ventasCache = data || [];
    renderizarVentas(ventasCache);
    
    if (ventasCache.length === 0) {
      mostrarNotificacion("📝 No hay ventas registradas. ¡Registra la primera!", "info");
    }

  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al cargar ventas", "error");
  } finally {
    if (tablaExistente) tablaExistente.style.opacity = "1";
    else estadoCarga.remove();
  }
}

// =====================
// Renderizar ventas
// =====================
function renderizarVentas(lista) {
  tabla.innerHTML = "";
  listaMobile.innerHTML = "";

  if (lista.length === 0) {
    tabla.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-gray-500">
          <div class="py-8">
            <span class="text-4xl block mb-2">💰</span>
            No hay ventas registradas
            <p class="text-sm text-gray-400 mt-1">Registra tu primera venta usando el formulario</p>
          </div>
        </td>
      </tr>
    `;
    
    listaMobile.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <span class="text-4xl block mb-2">💰</span>
        No hay ventas
        <p class="text-sm text-gray-400">Usa el formulario para registrar una</p>
      </div>
    `;
    return;
  }

  let totalVentas = 0;
  let totalGanancia = 0;
  let totalCantidad = 0;

  lista.forEach((venta, index) => {
    const productoNombre = venta.productos?.nombre || "Producto eliminado";
    const precioCompra = venta.productos?.precio_compra || 0;
    const subtotal = venta.cantidad * venta.precio_venta;
    const costo = venta.cantidad * precioCompra;
    const ganancia = subtotal - costo;
    const margen = venta.precio_venta > 0 ? (ganancia / venta.precio_venta * 100) : 0;  
    
    totalVentas += subtotal;
    totalGanancia += ganancia;
    totalCantidad += venta.cantidad;
    
    // Formatear fecha
    const fechaObj = new Date(venta.fecha);
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    
    const esHoy = fechaObj.toDateString() === new Date().toDateString();

    // Colores para ganancia
    let claseGanancia = "text-green-600 font-semibold";
    let iconoGanancia = "📈";
    if (ganancia <= 0) {
      claseGanancia = "text-red-600 font-semibold";
      iconoGanancia = "📉";
    } else if (margen < 20) {
      claseGanancia = "text-yellow-600 font-semibold";
      iconoGanancia = "📊";
    }

    // Desktop
    const filaDesktop = document.createElement("tr");
    filaDesktop.className = `border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50' : ''} ${esHoy ? 'bg-green-50' : ''}`;
    filaDesktop.innerHTML = `
      <td class="p-3">
        <div class="font-medium">${productoNombre}</div>
        <div class="text-xs text-gray-500">ID: ${venta.id}</div>
      </td>
      <td class="p-3 text-center">
        <span class="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
          ${venta.cantidad} und
        </span>
      </td>
      <td class="p-3">
        <div class="text-lg font-bold text-green-700">$${venta.precio_venta.toFixed(2)}</div>
        <div class="text-xs text-gray-500">c/u</div>
      </td>
      <td class="p-3">
        <div class="text-lg font-bold text-purple-700">$${subtotal.toFixed(2)}</div>
        <div class="text-xs text-gray-500">subtotal</div>
      </td>
      <td class="p-3">
        <div class="${claseGanancia}">
          <div class="flex items-center gap-1">
            <span>${iconoGanancia}</span>
            $${ganancia.toFixed(2)}
          </div>
          <div class="text-xs text-gray-500">${margen.toFixed(1)}% margen</div>
        </div>
      </td>
      <td class="p-3">
        <div class="${esHoy ? 'text-green-600 font-bold' : 'text-gray-700'}">
          ${fechaFormateada}
          ${esHoy ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 ml-2 rounded-full">HOY</span>' : ''}
        </div>
      </td>
      <td class="p-3">
        <div class="flex gap-2">
          <button onclick="editarVenta(${venta.id})"
            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors">
            <span>✏️</span> Editar
          </button>
          <button onclick="eliminarVenta(${venta.id})"
            class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors">
            <span>🗑️</span> Eliminar
          </button>
        </div>
      </td>
    `;
    tabla.appendChild(filaDesktop);

    // Mobile
    const cardMobile = document.createElement("div");
    cardMobile.className = `border rounded-xl p-4 shadow-sm hover:shadow transition-shadow bg-white ${esHoy ? 'border-green-300 bg-green-50' : ''}`;
    cardMobile.innerHTML = `
      <div class="flex justify-between items-start mb-3">
        <div>
          <div class="font-bold text-lg">${productoNombre}</div>
          <div class="text-xs text-gray-500">ID: ${venta.id}</div>
        </div>
        <span class="text-2xl ${esHoy ? 'text-green-500' : 'text-purple-500'}">💰</span>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="bg-blue-50 p-2 rounded-lg">
          <div class="text-xs text-gray-600">Cantidad</div>
          <div class="font-bold text-blue-700 text-lg">${venta.cantidad} und</div>
        </div>
        <div class="bg-green-50 p-2 rounded-lg">
          <div class="text-xs text-gray-600">Precio c/u</div>
          <div class="font-bold text-green-700 text-lg">$${venta.precio_venta.toFixed(2)}</div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="bg-purple-50 p-2 rounded-lg">
          <div class="text-xs text-gray-600">Subtotal</div>
          <div class="font-bold text-purple-700 text-lg">$${subtotal.toFixed(2)}</div>
        </div>
        <div class="bg-yellow-50 p-2 rounded-lg">
          <div class="text-xs text-gray-600">Ganancia</div>
          <div class="${claseGanancia} text-lg">
            $${ganancia.toFixed(2)}
          </div>
        </div>
      </div>
      
      <div class="mb-3 p-2 bg-gray-50 rounded-lg">
        <div class="text-xs text-gray-600">Margen de ganancia</div>
        <div class="font-bold text-gray-700">${margen.toFixed(1)}%</div>
      </div>
      
      <div class="mb-3">
        <div class="text-xs text-gray-600">Fecha</div>
        <div class="font-medium ${esHoy ? 'text-green-600 font-bold' : ''} flex items-center gap-2">
          ${fechaFormateada}
          ${esHoy ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">HOY</span>' : ''}
        </div>
      </div>
      
      <div class="flex gap-2">
        <button onclick="editarVenta(${venta.id})"
          class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
          <span>✏️</span> Editar
        </button>
        <button onclick="eliminarVenta(${venta.id})"
          class="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
          <span>🗑️</span> Eliminar
        </button>
      </div>
    `;
    listaMobile.appendChild(cardMobile);
  });

  // Agregar totales (solo en desktop)
  if (lista.length > 0) {
    const filaTotales = document.createElement("tr");
    filaTotales.className = "bg-gray-100 font-bold border-t-2 border-gray-300";
    filaTotales.innerHTML = `
      <td class="p-3 text-right" colspan="3">
        <span class="text-gray-600">TOTALES:</span>
      </td>
      <td class="p-3 text-xl text-purple-700">
        $${totalVentas.toFixed(2)}
      </td>
      <td class="p-3 text-xl ${totalGanancia >= 0 ? 'text-green-700' : 'text-red-700'}">
        $${totalGanancia.toFixed(2)}
      </td>
      <td class="p-3">
        ${totalCantidad} und
      </td>
      <td class="p-3">
        ${lista.length} venta${lista.length !== 1 ? 's' : ''}
      </td>
    `;
    tabla.appendChild(filaTotales);
  }
}

// =====================
// Editar venta
// =====================
window.editarVenta = async (id) => {
  try {
    const { data, error } = await supabase
      .from("ventas")
      .select(`
        *,
        productos:producto_id (nombre)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    ventaIdInput.value = data.id;
    
    // Actualizar custom select
    const displayInput = document.getElementById("selectDisplay");
    if (displayInput) {
      displayInput.value = data.productos?.nombre || "";
      displayInput.classList.remove("border-gray-300");
      displayInput.classList.add("border-blue-500", "bg-blue-50");
    }
    
    // Actualizar select original
    selectProducto.value = data.producto_id;
    
    cantidadInput.value = data.cantidad;
    precioInput.value = data.precio_venta;
    fechaInput.value = data.fecha;

    // Cambiar título del formulario
    const tituloForm = form.querySelector("h2");
    if (tituloForm) tituloForm.textContent = "✏️ Editando venta";
    
    // Cambiar texto del botón
    const boton = form.querySelector("button");
    boton.innerHTML = '<span>💾</span> Actualizar venta';
    boton.className = boton.className.replace("bg-green-600", "bg-blue-600 hover:bg-blue-700");

    // Hacer scroll suave
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    
    // Enfocar el campo cantidad
    cantidadInput.focus();
    
    mostrarNotificacion("✏️ Editando venta. Modifica los campos y guarda.", "info");

  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al cargar la venta", "error");
  }
};

// =====================
// Eliminar venta
// =====================
window.eliminarVenta = async (id) => {
  const venta = ventasCache.find(v => v.id === id);
  if (!venta) return;

  const productoNombre = venta.productos?.nombre || "Producto desconocido";
  const subtotal = venta.cantidad * venta.precio_venta;

  const confirmar = await mostrarConfirmacion(
    `¿Eliminar venta?`,
    `Venta ID: <strong>${venta.id}</strong><br>
     Producto: <strong>${productoNombre}</strong><br>
     Cantidad: <strong>${venta.cantidad} und</strong><br>
     Total: <strong>$${subtotal.toFixed(2)}</strong>`,
    "warning"
  );

  if (!confirmar) return;

  try {
    const { error } = await supabase
      .from("ventas")
      .delete()
      .eq("id", id);

    if (error) throw error;

    mostrarNotificacion("✅ Venta eliminada correctamente");
    await cargarVentas();
    
  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al eliminar la venta", "error");
  }
};

// =====================
// Limpiar formulario
// =====================
function limpiarFormulario() {
  form.reset();
  ventaIdInput.value = "";
  
  // Restablecer fecha actual
  const today = new Date().toISOString().split('T')[0];
  fechaInput.value = today;
  
  // Limpiar custom select
  const displayInput = document.getElementById("selectDisplay");
  if (displayInput) {
    displayInput.value = "";
    displayInput.placeholder = "📦 Seleccionar producto...";
    displayInput.classList.remove("border-blue-500", "bg-blue-50");
    displayInput.classList.add("border-gray-300", "bg-white");
    if (productosCache.length > 0) {
      displayInput.disabled = false;
    }
  }
  
  // Restaurar título y botón
  const tituloForm = form.querySelector("h2");
  if (tituloForm) tituloForm.textContent = "➕ Agregar venta";
  
  const boton = form.querySelector("button");
  boton.innerHTML = '<span>➕</span> Guardar venta';
  boton.className = boton.className.replace("bg-blue-600 hover:bg-blue-700", "bg-green-600 hover:bg-green-700");
  
  // Enfocar campo producto
  if (productosCache.length > 0) {
    const displayInput = document.getElementById("selectDisplay");
    if (displayInput) displayInput.focus();
  }
}

// =====================
// Buscador de ventas
// =====================
if (buscador) {
  let timeoutBusqueda;
  buscador.addEventListener("input", (e) => {
    clearTimeout(timeoutBusqueda);
    
    timeoutBusqueda = setTimeout(() => {
      const texto = e.target.value.toLowerCase().trim();
      
      if (texto === "") {
        renderizarVentas(ventasCache);
        return;
      }

      const filtrados = ventasCache.filter(v => {
        const productoNombre = v.productos?.nombre?.toLowerCase() || "";
        const fecha = v.fecha?.toLowerCase() || "";
        const precio = v.precio_venta?.toString() || "";
        
        return productoNombre.includes(texto) ||
               fecha.includes(texto) ||
               precio.includes(texto) ||
               v.id.toString().includes(texto);
      });
      
      renderizarVentas(filtrados);
      
      // Mostrar contador de resultados
      const contador = document.createElement("div");
      contador.className = "text-sm text-gray-600 mb-2";
      contador.id = "contadorBusqueda";
      contador.textContent = `Encontradas: ${filtrados.length} venta${filtrados.length !== 1 ? 's' : ''}`;
      
      const contadorExistente = document.getElementById("contadorBusqueda");
      if (contadorExistente) contadorExistente.remove();
      
      buscador.parentNode.appendChild(contador);
    }, 300);
  });
}

// =====================
// Utilidades: Notificaciones
// =====================
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
  }, 4000);
}

// =====================
// Utilidades: Confirmación personalizada
// =====================
function mostrarConfirmacion(titulo, mensaje, tipo = "warning") {
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-95">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-4">
            <span class="text-3xl">${tipo === "warning" ? "⚠️" : "❓"}</span>
            <h3 class="text-xl font-bold">${titulo}</h3>
          </div>
          <div class="text-gray-600 mb-6">${mensaje}</div>
          <div class="flex gap-3">
            <button id="btnCancelar" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium transition-colors">
              Cancelar
            </button>
            <button id="btnConfirmar" class="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium transition-colors">
              Sí, eliminar
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    setTimeout(() => {
      modal.querySelector(".scale-95").classList.replace("scale-95", "scale-100");
    }, 10);

    modal.querySelector("#btnCancelar").addEventListener("click", () => {
      modal.remove();
      resolve(false);
    });

    modal.querySelector("#btnConfirmar").addEventListener("click", () => {
      modal.remove();
      resolve(true);
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    });
  });
}

// =====================
// Inicialización adicional
// =====================
document.addEventListener("DOMContentLoaded", () => {
  // Agregar contador de productos
  const productoContainer = document.querySelector("#customSelectContainer")?.parentElement;
  if (productoContainer) {
    const contadorProductos = document.createElement("div");
    contadorProductos.id = "contadorProductos";
    contadorProductos.className = "text-xs text-gray-500 mt-1";
    productoContainer.appendChild(contadorProductos);
  }
  
  // Agregar estilos CSS adicionales
  const style = document.createElement('style');
  style.textContent = `
    #productosResultados::-webkit-scrollbar {
      width: 6px;
    }
    #productosResultados::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }
    #productosResultados::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 3px;
    }
    #productosResultados::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
    #productosDropdown {
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
});