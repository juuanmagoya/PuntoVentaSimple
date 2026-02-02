import { supabase } from "./supabase.js";

const form = document.getElementById("formCompra");
const tabla = document.getElementById("tablaCompras");
const listaMobile = document.getElementById("listaMobile");
const selectProducto = document.getElementById("productoSelect");

const compraIdInput = document.getElementById("compraId");
const cantidadInput = document.getElementById("cantidad");
const precioInput = document.getElementById("precioCompra");
const proveedorInput = document.getElementById("proveedor");
const fechaInput = document.getElementById("fecha");

// Establecer fecha actual por defecto
fechaInput.valueAsDate = new Date();

let comprasCache = [];
let productosCache = [];
let productosFiltrados = [];
let selectAbierto = false;

cargarProductos();
cargarCompras();

// =====================
// Cargar productos para el select
// =====================
async function cargarProductos() {
  try {
    const { data, error } = await supabase
      .from("productos")
      .select("id, nombre, precio_compra")
      .order("nombre", { ascending: true });

    if (error) throw error;

    productosCache = data || [];
    productosFiltrados = [...productosCache];
    
    // Actualizar el select original con los productos
    actualizarSelectOriginal();
    
    // Si hay productos, reemplazar por custom select
    if (productosCache.length > 0) {
      reemplazarSelectConBuscador();
    } else {
      mostrarMensajeSinProductos();
    }
    
    actualizarContadorProductos();
    
  } catch (error) {
    console.error("Error cargando productos:", error);
    mostrarNotificacion("❌ Error al cargar productos", "error");
  }
}

// =====================
// Actualizar select original (oculto)
// =====================
function actualizarSelectOriginal() {
  selectProducto.innerHTML = '<option value="">Seleccionar producto</option>';
  
  productosCache.forEach(producto => {
    const option = document.createElement("option");
    option.value = producto.id;
    option.textContent = `${producto.nombre} - $${producto.precio_compra}`;
    option.dataset.nombre = producto.nombre;
    selectProducto.appendChild(option);
  });
}

// =====================
// Reemplazar select por custom select con buscador
// =====================
function reemplazarSelectConBuscador() {
  // Si ya existe el custom select, no hacer nada
  if (document.getElementById("customSelectContainer")) return;
  
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
  flechaIcono.className = "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none transition-transform";
  flechaIcono.id = "flechaIcono";
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
    
    // Rotar flecha
    const flecha = document.getElementById("flechaIcono");
    if (selectAbierto) {
      flecha.style.transform = "translateY(-50%) rotate(180deg)";
      searchInput.value = "";
      filtrarProductos("", resultadosContainer, contadorResultados);
      searchInput.focus();
    } else {
      flecha.style.transform = "translateY(-50%) rotate(0deg)";
    }
  });
  
  // Cerrar dropdown al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#customSelectContainer")) {
      selectAbierto = false;
      dropdown.classList.add("hidden");
      const flecha = document.getElementById("flechaIcono");
      flecha.style.transform = "translateY(-50%) rotate(0deg)";
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
      const flecha = document.getElementById("flechaIcono");
      flecha.style.transform = "translateY(-50%) rotate(0deg)";
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
    item.dataset.precio = producto.precio_compra;
    
    item.innerHTML = `
      <div>
        <div class="font-medium">${producto.nombre}</div>
        <div class="text-sm text-gray-500">ID: ${producto.id}</div>
      </div>
      <div class="text-right">
        <div class="font-semibold text-blue-600">$${producto.precio_compra}</div>
        <div class="text-xs text-gray-500">precio compra</div>
      </div>
    `;
    
    item.addEventListener("click", () => {
      seleccionarProducto(producto);
      document.getElementById("productosDropdown").classList.add("hidden");
      selectAbierto = false;
      const flecha = document.getElementById("flechaIcono");
      flecha.style.transform = "translateY(-50%) rotate(0deg)";
    });
    
    resultadosContainer.appendChild(item);
  });
}

// =====================
// Seleccionar producto
// =====================
function seleccionarProducto(producto) {
  const displayInput = document.getElementById("selectDisplay");
  if (displayInput) {
    displayInput.value = producto.nombre;
  }
  
  // Actualizar el select original oculto
  selectProducto.value = producto.id;
  
  // Actualizar precio si está vacío
  if (precioInput && !precioInput.value) {
    precioInput.value = producto.precio_compra;
  }
  
  // Agregar estilo de selección
  if (displayInput) {
    displayInput.classList.remove("border-gray-300");
    displayInput.classList.add("border-blue-500", "bg-blue-50");
  }
  
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
// Guardar / editar compra - CORREGIDO
// =====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Validar que haya productos disponibles
  if (productosCache.length === 0) {
    mostrarNotificacion("⚠️ Primero debes agregar productos en la sección Productos", "error");
    return;
  }

  // CORRECCIÓN: Verificar que se haya seleccionado un producto
  const productoId = Number(selectProducto.value);
  if (!productoId || productoId === 0 || selectProducto.value === "") {
    mostrarNotificacion("❌ Selecciona un producto", "error");
    const displayInput = document.getElementById("selectDisplay");
    if (displayInput) displayInput.focus();
    return;
  }

  // CORRECCIÓN: Asegurarnos que la fecha esté en formato correcto
  let fechaSeleccionada = fechaInput.value;
  if (!fechaSeleccionada) {
    const hoy = new Date();
    fechaSeleccionada = hoy.toISOString().split('T')[0];
    fechaInput.value = fechaSeleccionada;
  }

  const compra = {
    producto_id: productoId,
    cantidad: Number(cantidadInput.value),
    precio_compra: Number(precioInput.value),
    proveedor: proveedorInput.value.trim(),
    fecha: fechaSeleccionada
  };

  console.log("Datos a guardar:", compra);

  // Validaciones
  if (compra.cantidad <= 0 || isNaN(compra.cantidad)) {
    mostrarNotificacion("❌ La cantidad debe ser mayor a 0", "error");
    cantidadInput.focus();
    return;
  }

  if (compra.precio_compra <= 0 || isNaN(compra.precio_compra)) {
    mostrarNotificacion("❌ El precio debe ser mayor a 0", "error");
    precioInput.focus();
    return;
  }

  if (!compra.proveedor) {
    mostrarNotificacion("❌ Ingresa un proveedor", "error");
    proveedorInput.focus();
    return;
  }

  const id = compraIdInput.value;
  const boton = form.querySelector("button");
  const textoOriginal = boton.textContent;

  try {
    // Mostrar estado de carga
    boton.disabled = true;
    boton.innerHTML = '<span class="animate-spin mr-2">⟳</span>Guardando...';

    if (id) {
      // Editar compra
      const { error } = await supabase
        .from("compras")
        .update(compra)
        .eq("id", id);

      if (error) throw error;
      
      mostrarNotificacion("✅ Compra actualizada correctamente");
    } else {
      // Crear nueva compra
      const { error } = await supabase
        .from("compras")
        .insert([compra]);

      if (error) throw error;
      
      mostrarNotificacion("✅ Compra registrada correctamente");
    }

    limpiarFormulario();
    await cargarCompras();
    
  } catch (error) {
    console.error("Error completo al guardar:", error);
    mostrarNotificacion("❌ Error al guardar la compra: " + error.message, "error");
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
});

// =====================
// Cargar compras desde Supabase - CORREGIDO
// =====================
async function cargarCompras() {
  try {
    const { data, error } = await supabase
      .from("compras")
      .select(`
        *,
        productos (nombre)
      `)
      .order("fecha", { ascending: false })
      .order("id", { ascending: false });

    if (error) throw error;

    comprasCache = data || [];
    console.log("Compras cargadas:", comprasCache);
    renderizarCompras(comprasCache);
    
    if (comprasCache.length === 0) {
      mostrarNotificacion("📝 No hay compras registradas. ¡Registra la primera!", "info");
    }

  } catch (error) {
    console.error("Error completo al cargar compras:", error);
    mostrarNotificacion("❌ Error al cargar compras: " + error.message, "error");
  }
}

// =====================
// Renderizar compras - CORREGIDO
// =====================
function renderizarCompras(lista) {
  tabla.innerHTML = "";
  listaMobile.innerHTML = "";

  if (lista.length === 0) {
    tabla.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-gray-500">
          <div class="py-8">
            <span class="text-4xl block mb-2">🛒</span>
            No hay compras registradas
            <p class="text-sm text-gray-400 mt-1">Registra tu primera compra usando el formulario</p>
          </div>
        </td>
      </tr>
    `;
    
    listaMobile.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <span class="text-4xl block mb-2">🛒</span>
        No hay compras
        <p class="text-sm text-gray-400">Usa el formulario para registrar una</p>
      </div>
    `;
    return;
  }

  let totalInversion = 0;
  let totalCantidad = 0;

  lista.forEach((compra, index) => {
    // CORRECCIÓN: Acceder correctamente a los datos del producto
    const productoNombre = compra.productos?.nombre || "Producto eliminado";
    const subtotal = compra.cantidad * compra.precio_compra;
    totalInversion += subtotal;
    totalCantidad += compra.cantidad;
    
    // Formatear fecha - CORRECCIÓN: Manejar diferentes formatos de fecha
    let fechaFormateada;
    try {
      const fechaObj = new Date(compra.fecha);
      fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      fechaFormateada = compra.fecha || "Fecha inválida";
    }
    
    const esReciente = (new Date() - new Date(compra.fecha)) < (7 * 24 * 60 * 60 * 1000);

    // Desktop
    const filaDesktop = document.createElement("tr");
    filaDesktop.className = `border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50' : ''} ${esReciente ? 'bg-green-50' : ''}`;
    filaDesktop.innerHTML = `
      <td class="p-3">
        <div class="font-medium">${productoNombre}</div>
        <div class="text-xs text-gray-500">ID Compra: ${compra.id}</div>
      </td>
      <td class="p-3 text-center">
        <span class="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
          ${compra.cantidad} und
        </span>
      </td>
      <td class="p-3">
        <div class="text-gray-700">$${compra.precio_compra.toFixed(2)}</div>
        <div class="text-xs text-gray-500">c/u</div>
      </td>
      <td class="p-3">
        <div class="text-gray-700">$${subtotal.toFixed(2)}</div>
        <div class="text-xs text-gray-500">subtotal</div>
      </td>
      <td class="p-3">
        <div class="font-medium">${compra.proveedor}</div>
      </td>
      <td class="p-3">
        <div class="${esReciente ? 'text-green-600 font-semibold' : 'text-gray-700'}">
          ${fechaFormateada}
        </div>
      </td>
      <td class="p-3">
        <div class="flex gap-2">
          <button onclick="editarCompra(${compra.id})"
            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors">
            <span>✏️</span> Editar
          </button>
          <button onclick="eliminarCompra(${compra.id})"
            class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors">
            <span>🗑️</span> Eliminar
          </button>
        </div>
      </td>
    `;
    tabla.appendChild(filaDesktop);

    // Mobile
    const cardMobile = document.createElement("div");
    cardMobile.className = `border rounded-xl p-4 shadow-sm hover:shadow transition-shadow bg-white ${esReciente ? 'border-green-300' : ''}`;
    cardMobile.innerHTML = `
      <div class="flex justify-between items-start mb-3">
        <div>
          <div class="font-bold text-lg">${productoNombre}</div>
          <div class="text-xs text-gray-500">ID: ${compra.id}</div>
        </div>
        <span class="text-2xl ${esReciente ? 'text-green-500' : 'text-blue-500'}">🛒</span>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="bg-blue-50 p-2 rounded-lg">
          <div class="text-xs text-gray-600">Cantidad</div>
          <div class="font-bold text-blue-700 text-lg">${compra.cantidad} und</div>
        </div>
        <div class="bg-green-50 p-2 rounded-lg">
          <div class="text-xs text-gray-600">Precio c/u</div>
          <div class="font-bold text-green-700 text-lg">$${compra.precio_compra.toFixed(2)}</div>
        </div>
      </div>
      
      <div class="mb-3 p-2 bg-yellow-50 rounded-lg">
        <div class="text-xs text-gray-600">Subtotal compra</div>
        <div class="font-bold text-yellow-700 text-xl">$${subtotal.toFixed(2)}</div>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="p-2">
          <div class="text-xs text-gray-600">Proveedor</div>
          <div class="font-medium">${compra.proveedor}</div>
        </div>
        <div class="p-2">
          <div class="text-xs text-gray-600">Fecha</div>
          <div class="font-medium ${esReciente ? 'text-green-600' : ''}">${fechaFormateada}</div>
        </div>
      </div>
      
      <div class="flex gap-2">
        <button onclick="editarCompra(${compra.id})"
          class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
          <span>✏️</span> Editar
        </button>
        <button onclick="eliminarCompra(${compra.id})"
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
    filaTotales.className = "bg-gray-100 font-bold";
    filaTotales.innerHTML = `
      <td class="p-3 text-right" colspan="3">
        <span class="text-gray-600">TOTALES:</span>
      </td>
      <td class="p-3 text-lg text-green-700">
        $${totalInversion.toFixed(2)}
      </td>
      <td class="p-3">
        ${totalCantidad} und
      </td>
      <td class="p-3" colspan="2">
        ${lista.length} compra${lista.length !== 1 ? 's' : ''}
      </td>
    `;
    tabla.appendChild(filaTotales);
  }
}

// =====================
// Editar compra - CORREGIDO
// =====================
window.editarCompra = async (id) => {
  try {
    const { data, error } = await supabase
      .from("compras")
      .select(`
        *,
        productos (nombre)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    console.log("Compra cargada para editar:", data);

    compraIdInput.value = data.id;
    
    // Actualizar custom select
    const displayInput = document.getElementById("selectDisplay");
    if (displayInput) {
      const productoSeleccionado = productosCache.find(p => p.id === data.producto_id);
      if (productoSeleccionado) {
        displayInput.value = productoSeleccionado.nombre;
        displayInput.classList.remove("border-gray-300");
        displayInput.classList.add("border-blue-500", "bg-blue-50");
      }
    }
    
    // Actualizar select original
    selectProducto.value = data.producto_id;
    
    cantidadInput.value = data.cantidad;
    precioInput.value = data.precio_compra;
    proveedorInput.value = data.proveedor;
    
    // Formatear fecha correctamente
    if (data.fecha) {
      try {
        const fechaObj = new Date(data.fecha);
        if (!isNaN(fechaObj.getTime())) {
          fechaInput.value = fechaObj.toISOString().split('T')[0];
        } else {
          fechaInput.value = data.fecha;
        }
      } catch (e) {
        fechaInput.value = data.fecha;
      }
    }

    // Cambiar título del formulario
    const tituloForm = document.querySelector("#formCompra h2");
    if (tituloForm) tituloForm.textContent = "✏️ Editando compra";
    
    // Cambiar texto del botón
    const boton = form.querySelector("button");
    boton.innerHTML = '<span>💾</span> Actualizar compra';
    boton.className = boton.className.replace("bg-green-600", "bg-blue-600 hover:bg-blue-700");

    // Hacer scroll suave
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    
    // Enfocar el campo cantidad
    cantidadInput.focus();
    
    mostrarNotificacion("✏️ Editando compra. Modifica los campos y guarda.", "info");

  } catch (error) {
    console.error("Error completo al editar compra:", error);
    mostrarNotificacion("❌ Error al cargar la compra: " + error.message, "error");
  }
};

// =====================
// Eliminar compra
// =====================
window.eliminarCompra = async (id) => {
  const compra = comprasCache.find(c => c.id === id);
  if (!compra) return;

  const productoNombre = compra.productos?.nombre || "Producto desconocido";
  const subtotal = compra.cantidad * compra.precio_compra;

  const confirmar = await mostrarConfirmacion(
    `¿Eliminar compra?`,
    `Compra ID: <strong>${compra.id}</strong><br>
     Producto: <strong>${productoNombre}</strong><br>
     Cantidad: <strong>${compra.cantidad} und</strong><br>
     Subtotal: <strong>$${subtotal.toFixed(2)}</strong>`,
    "warning"
  );

  if (!confirmar) return;

  try {
    const { error } = await supabase
      .from("compras")
      .delete()
      .eq("id", id);

    if (error) throw error;

    mostrarNotificacion("✅ Compra eliminada correctamente");
    await cargarCompras();
    
  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al eliminar la compra", "error");
  }
};

// =====================
// Limpiar formulario
// =====================
function limpiarFormulario() {
  compraIdInput.value = "";
  cantidadInput.value = "";
  precioInput.value = "";
  proveedorInput.value = "";
  
  // Establecer fecha actual por defecto
  fechaInput.valueAsDate = new Date();
  
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
  
  // Resetear select original
  selectProducto.value = "";
  
  // Restaurar título y botón
  const tituloForm = document.querySelector("#formCompra h2");
  if (tituloForm) tituloForm.textContent = "➕ Agregar / Editar compra";
  
  const boton = form.querySelector("button");
  boton.innerHTML = '<span>➕</span> Guardar compra';
  boton.className = boton.className.replace("bg-blue-600 hover:bg-blue-700", "bg-green-600 hover:bg-green-700");
  
  // Enfocar campo producto
  if (productosCache.length > 0 && displayInput) {
    displayInput.focus();
  }
}

// =====================
// Utilidades: Notificaciones
// =====================
function mostrarNotificacion(mensaje, tipo = "success") {
  // Código de notificaciones sin cambios...
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
  // Código de confirmación sin cambios...
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
// Inicialización
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
});