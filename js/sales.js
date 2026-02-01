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
// Cargar productos para el select
// =====================
async function cargarProductos() {
  try {
    const { data, error } = await supabase
      .from("productos")
      .select("id, nombre, precio_venta, precio_compra")
      .order("nombre", { ascending: true });

    if (error) throw error;

    productosCache = data || [];
    
    selectProducto.innerHTML = `
      <option value="" disabled selected>📦 Seleccionar producto...</option>
    `;
    
    productosCache.forEach(p => {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = `${p.nombre} (Venta: $${p.precio_venta})`;
      option.dataset.precioVenta = p.precio_venta;
      option.dataset.precioCompra = p.precio_compra;
      selectProducto.appendChild(option);
    });
    
    if (productosCache.length === 0) {
      selectProducto.innerHTML = '<option value="" disabled>⚠️ No hay productos. Agrega primero en la sección Productos.</option>';
      selectProducto.disabled = true;
    }
    
  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al cargar productos", "error");
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
    selectProducto.focus();
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
    const margen = costo > 0 ? (ganancia / costo * 100) : 0;
    
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
    
    // Enfocar el primer campo
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
  
  // Restaurar título y botón
  const tituloForm = form.querySelector("h2");
  if (tituloForm) tituloForm.textContent = "➕ Agregar venta";
  
  const boton = form.querySelector("button");
  boton.innerHTML = '<span>➕</span> Guardar venta';
  boton.className = boton.className.replace("bg-blue-600 hover:bg-blue-700", "bg-green-600 hover:bg-green-700");
  
  // Enfocar campo producto
  if (productosCache.length > 0) {
    selectProducto.focus();
  }
}

// =====================
// Cuando cambia el producto, sugerir precio de venta
// =====================
selectProducto.addEventListener("change", () => {
  const productoId = Number(selectProducto.value);
  if (!productoId) return;
  
  const producto = productosCache.find(p => p.id === productoId);
  
  if (producto && producto.precio_venta && !precioInput.value) {
    precioInput.value = producto.precio_venta;
    mostrarNotificacion(`💰 Precio sugerido: $${producto.precio_venta}`, "info");
  }
});

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