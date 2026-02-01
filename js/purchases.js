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
    
    selectProducto.innerHTML = `
      <option value="" disabled selected>📦 Seleccionar producto...</option>
    `;
    
    productosCache.forEach(p => {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = `${p.nombre} (Compra: $${p.precio_compra})`;
      selectProducto.appendChild(option);
    });
    
    // Agregar placeholder dinámico
    if (productosCache.length > 0) {
      selectProducto.disabled = false;
    } else {
      selectProducto.innerHTML = '<option value="" disabled>⚠️ No hay productos. Agrega primero en la sección Productos.</option>';
      selectProducto.disabled = true;
    }
    
  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al cargar productos", "error");
  }
}

// =====================
// Guardar / editar compra
// =====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Validar que haya productos disponibles
  if (productosCache.length === 0) {
    mostrarNotificacion("⚠️ Primero debes agregar productos en la sección Productos", "error");
    return;
  }

  const compra = {
    producto_id: Number(selectProducto.value),
    cantidad: Number(cantidadInput.value),
    precio_compra: Number(precioInput.value),
    proveedor: proveedorInput.value.trim(),
    fecha: fechaInput.value
  };

  // Validaciones
  if (!compra.producto_id) {
    mostrarNotificacion("❌ Selecciona un producto", "error");
    selectProducto.focus();
    return;
  }

  if (compra.cantidad <= 0) {
    mostrarNotificacion("❌ La cantidad debe ser mayor a 0", "error");
    cantidadInput.focus();
    return;
  }

  if (compra.precio_compra <= 0) {
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
    console.error(error);
    mostrarNotificacion("❌ Error al guardar la compra", "error");
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
});

// =====================
// Cargar compras desde Supabase
// =====================
async function cargarCompras() {
  const contenedor = tabla.parentElement;
  const estadoCarga = document.createElement("div");
  estadoCarga.className = "p-8 text-center text-gray-500";
  estadoCarga.innerHTML = '<span class="animate-spin mr-2">⟳</span>Cargando compras...';
  
  const tablaExistente = contenedor.querySelector(".tabla-compras-contenedor");
  if (tablaExistente) tablaExistente.style.opacity = "0.5";
  else contenedor.appendChild(estadoCarga);

  try {
    const { data, error } = await supabase
      .from("compras")
      .select(`
        *,
        productos:producto_id (nombre)
      `)
      .order("fecha", { ascending: false })
      .order("id", { ascending: false });

    if (error) throw error;

    comprasCache = data || [];
    renderizarCompras(comprasCache);
    
    if (comprasCache.length === 0) {
      mostrarNotificacion("📝 No hay compras registradas. ¡Registra la primera!", "info");
    }

  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al cargar compras", "error");
  } finally {
    if (tablaExistente) tablaExistente.style.opacity = "1";
    else estadoCarga.remove();
  }
}

// =====================
// Renderizar compras
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
    const productoNombre = compra.productos?.nombre || "Producto eliminado";
    const subtotal = compra.cantidad * compra.precio_compra;
    totalInversion += subtotal;
    totalCantidad += compra.cantidad;
    
    // Formatear fecha
    const fechaObj = new Date(compra.fecha);
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    
    const esReciente = (new Date() - fechaObj) < (7 * 24 * 60 * 60 * 1000); // Últimos 7 días

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
// Editar compra
// =====================
window.editarCompra = async (id) => {
  try {
    const { data, error } = await supabase
      .from("compras")
      .select(`
        *,
        productos:producto_id (nombre)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    compraIdInput.value = data.id;
    selectProducto.value = data.producto_id;
    cantidadInput.value = data.cantidad;
    precioInput.value = data.precio_compra;
    proveedorInput.value = data.proveedor;
    fechaInput.value = data.fecha;

    // Cambiar título del formulario
    const tituloForm = form.querySelector("h2");
    if (tituloForm) tituloForm.textContent = "✏️ Editando compra";
    
    // Cambiar texto del botón
    const boton = form.querySelector("button");
    boton.innerHTML = '<span>💾</span> Actualizar compra';
    boton.className = boton.className.replace("bg-green-600", "bg-blue-600 hover:bg-blue-700");

    // Hacer scroll suave
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    
    // Enfocar el primer campo
    cantidadInput.focus();
    
    mostrarNotificacion("✏️ Editando compra. Modifica los campos y guarda.", "info");

  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al cargar la compra", "error");
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
  form.reset();
  compraIdInput.value = "";
  fechaInput.valueAsDate = new Date();
  
  // Restaurar título y botón
  const tituloForm = form.querySelector("h2");
  if (tituloForm) tituloForm.textContent = "➕ Agregar compra";
  
  const boton = form.querySelector("button");
  boton.innerHTML = '<span>➕</span> Guardar compra';
  boton.className = boton.className.replace("bg-blue-600 hover:bg-blue-700", "bg-green-600 hover:bg-green-700");
  
  // Enfocar campo producto
  if (productosCache.length > 0) {
    selectProducto.focus();
  }
}

// =====================
// Cuando cambia el producto, sugerir precio de compra
// =====================
selectProducto.addEventListener("change", () => {
  const productoId = Number(selectProducto.value);
  if (!productoId) return;
  
  const producto = productosCache.find(p => p.id === productoId);
  if (producto && producto.precio_compra && !precioInput.value) {
    precioInput.value = producto.precio_compra;
    mostrarNotificacion(`💰 Precio sugerido: $${producto.precio_compra}`, "info");
  }
});

// =====================
// Utilidades: Notificaciones (igual que en products.js)
// =====================
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
  // Mejorar estilos de los inputs
  const inputs = [selectProducto, cantidadInput, precioInput, proveedorInput, fechaInput];
  inputs.forEach(input => {
    input.className = "w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300";
  });
  
  // Agregar contador de productos
  const productoContainer = selectProducto.parentElement;
  const contadorProductos = document.createElement("div");
  contadorProductos.id = "contadorProductos";
  contadorProductos.className = "text-xs text-gray-500 mt-1";
  productoContainer.appendChild(contadorProductos);
  
  // Actualizar contador
  function actualizarContadorProductos() {
    contadorProductos.textContent = `${productosCache.length} producto${productosCache.length !== 1 ? 's' : ''} disponibles`;
  }
  
  // Actualizar cuando se carguen productos
  const originalCargarProductos = cargarProductos;
  cargarProductos = async function() {
    await originalCargarProductos();
    actualizarContadorProductos();
  };
  
  // Agregar estadísticas rápidas
  const header = document.querySelector("h1");
  if (header) {
    const statsContainer = document.createElement("div");
    statsContainer.className = "flex gap-4 mt-2 text-sm";
    header.parentNode.insertBefore(statsContainer, header.nextSibling);
    
    function actualizarEstadisticas() {
      const totalCompras = comprasCache.length;
      const totalInversion = comprasCache.reduce((sum, c) => 
        sum + (c.cantidad * c.precio_compra), 0);
      
      statsContainer.innerHTML = `
        <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
          🛒 ${totalCompras} compra${totalCompras !== 1 ? 's' : ''}
        </span>
        <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full">
          💰 $${totalInversion.toFixed(2)} invertido
        </span>
      `;
    }
    
    // Actualizar cuando se carguen compras
    const originalCargarCompras = cargarCompras;
    cargarCompras = async function() {
      await originalCargarCompras();
      actualizarEstadisticas();
    };
  }
});