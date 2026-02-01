import { supabase } from "./supabase.js";

const form = document.getElementById("formProducto");
const tabla = document.getElementById("tablaProductos");
const listaMobile = document.getElementById("listaMobile");
const buscador = document.getElementById("buscadorProductos");

const productoIdInput = document.getElementById("productoId");
const nombreInput = document.getElementById("nombre");
const precioVentaInput = document.getElementById("precioVenta");
const precioCompraInput = document.getElementById("precioCompra");

let productosCache = [];
let estaEditando = false;

cargarProductos();

// =====================
// Guardar / editar producto
// =====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const producto = {
    nombre: nombreInput.value.trim(),
    precio_venta: Number(precioVentaInput.value),
    precio_compra: Number(precioCompraInput.value)
  };

  // Validación básica
  if (!producto.nombre || producto.precio_venta <= 0 || producto.precio_compra <= 0) {
    mostrarNotificacion("❌ Completa todos los campos con valores válidos", "error");
    return;
  }

  if (producto.precio_venta < producto.precio_compra) {
    const confirmar = confirm("⚠️ El precio de venta es menor que el de compra. ¿Continuar?");
    if (!confirmar) return;
  }

  const id = productoIdInput.value;
  const boton = form.querySelector("button");
  const textoOriginal = boton.textContent;

  try {
    // Mostrar estado de carga
    boton.disabled = true;
    boton.innerHTML = '<span class="animate-spin mr-2">⟳</span>Guardando...';

    if (id) {
      // Editar
      const { error } = await supabase
        .from("productos")
        .update(producto)
        .eq("id", id);

      if (error) throw error;
      mostrarNotificacion("✅ Producto actualizado correctamente");
    } else {
      // Crear
      const { error } = await supabase
        .from("productos")
        .insert([producto]);

      if (error) throw error;
      mostrarNotificacion("✅ Producto creado correctamente");
    }

    limpiarFormulario();
    await cargarProductos();
    
  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al guardar el producto", "error");
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
});

// =====================
// Cargar productos desde Supabase
// =====================
async function cargarProductos() {
  const contenedor = document.querySelector("#tablaProductos").parentElement;
  const estadoCarga = document.createElement("div");
  estadoCarga.className = "p-4 text-center text-gray-500";
  estadoCarga.innerHTML = '<span class="animate-spin mr-2">⟳</span>Cargando productos...';
  
  const tablaExistente = contenedor.querySelector(".tabla-contenedor");
  if (tablaExistente) tablaExistente.style.opacity = "0.5";
  else contenedor.appendChild(estadoCarga);

  try {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false });

    if (error) throw error;

    productosCache = data;
    renderizarProductos(productosCache);
    
    if (productosCache.length === 0) {
      mostrarNotificacion("📝 No hay productos. ¡Agrega el primero!", "info");
    }

  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al cargar productos", "error");
  } finally {
    if (tablaExistente) tablaExistente.style.opacity = "1";
    else estadoCarga.remove();
  }
}

// =====================
// Render mobile + desktop
// =====================
function renderizarProductos(lista) {
  tabla.innerHTML = "";
  listaMobile.innerHTML = "";

  if (lista.length === 0) {
    tabla.innerHTML = `
      <tr>
        <td colspan="5" class="p-6 text-center text-gray-500">
          <div class="py-8">
            <span class="text-4xl block mb-2">📦</span>
            No hay productos registrados
            <p class="text-sm text-gray-400 mt-1">Comienza agregando tu primer producto</p>
          </div>
        </td>
      </tr>
    `;
    
    listaMobile.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <span class="text-4xl block mb-2">📦</span>
        No hay productos
        <p class="text-sm text-gray-400">Usa el formulario para agregar uno</p>
      </div>
    `;
    return;
  }

  lista.forEach((p, index) => {
    // Calculamos ganancia
    const ganancia = p.precio_venta - p.precio_compra;
    const porcentajeGanancia = p.precio_venta > 0 
      ? ((ganancia / p.precio_venta) * 100).toFixed(1)
      : "0";

    // Color para la ganancia
    let claseGanancia = "text-green-600 font-semibold";
    if (ganancia <= 0) claseGanancia = "text-red-600 font-semibold";
    else if ((ganancia / p.precio_venta) < 0.3) claseGanancia = "text-yellow-600 font-semibold";
    // Esto significa: si la ganancia es menos del 30% del precio de venta

    // Desktop
    const filaDesktop = document.createElement("tr");
    filaDesktop.className = `border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50' : ''}`;
    filaDesktop.innerHTML = `
      <td class="p-3">
        <div class="font-medium">${p.nombre}</div>
        <div class="text-xs text-gray-500">ID: ${p.id}</div>
      </td>
      <td class="p-3">
        <div class="text-lg font-bold text-green-700">$${p.precio_venta.toFixed(2)}</div>
      </td>
      <td class="p-3">
        <div class="text-gray-700">$${p.precio_compra.toFixed(2)}</div>
      </td>
      <td class="p-3">
        <div class="${claseGanancia}">
          $${ganancia.toFixed(2)} <span class="text-xs">(${porcentajeGanancia}%)</span>
        </div>
      </td>
      <td class="p-3">
        <div class="flex gap-2">
          <button onclick="editarProducto(${p.id})"
            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors">
            <span>✏️</span> Editar
          </button>
          <button onclick="eliminarProducto(${p.id})"
            class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors">
            <span>🗑️</span> Eliminar
          </button>
        </div>
      </td>
    `;
    tabla.appendChild(filaDesktop);

    // Mobile
    const cardMobile = document.createElement("div");
    cardMobile.className = "border rounded-xl p-4 shadow-sm hover:shadow transition-shadow bg-white";
    cardMobile.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <div>
          <div class="font-bold text-lg">${p.nombre}</div>
          <div class="text-xs text-gray-500">ID: ${p.id}</div>
        </div>
        <span class="text-2xl">📦</span>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="bg-green-50 p-2 rounded-lg">
          <div class="text-xs text-gray-600">Venta</div>
          <div class="font-bold text-green-700">$${p.precio_venta.toFixed(2)}</div>
        </div>
        <div class="bg-blue-50 p-2 rounded-lg">
          <div class="text-xs text-gray-600">Compra</div>
          <div class="font-bold text-blue-700">$${p.precio_compra.toFixed(2)}</div>
        </div>
      </div>
      
      <div class="mb-3">
        <div class="text-xs text-gray-600">Ganancia</div>
        <div class="${claseGanancia} text-lg">
          $${ganancia.toFixed(2)} <span class="text-sm">(${porcentajeGanancia}%)</span>
        </div>
      </div>
      
      <div class="flex gap-2">
        <button onclick="editarProducto(${p.id})"
          class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
          <span>✏️</span> Editar
        </button>
        <button onclick="eliminarProducto(${p.id})"
          class="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
          <span>🗑️</span> Eliminar
        </button>
      </div>
    `;
    listaMobile.appendChild(cardMobile);
  });
}

// =====================
// Buscador mejorado
// =====================
let timeoutBusqueda;
buscador.addEventListener("input", (e) => {
  clearTimeout(timeoutBusqueda);
  
  timeoutBusqueda = setTimeout(() => {
    const texto = e.target.value.toLowerCase().trim();
    
    if (texto === "") {
      renderizarProductos(productosCache);
      return;
    }

    const filtrados = productosCache.filter(p =>
      p.nombre.toLowerCase().includes(texto) ||
      p.id.toString().includes(texto) ||
      p.precio_venta.toString().includes(texto) ||
      p.precio_compra.toString().includes(texto)
    );
    
    renderizarProductos(filtrados);
    
    // Mostrar contador de resultados
    const contador = document.createElement("div");
    contador.className = "text-sm text-gray-600 mb-2";
    contador.id = "contadorBusqueda";
    contador.textContent = `Encontrados: ${filtrados.length} producto${filtrados.length !== 1 ? 's' : ''}`;
    
    const contadorExistente = document.getElementById("contadorBusqueda");
    if (contadorExistente) contadorExistente.remove();
    
    buscador.parentNode.appendChild(contador);
  }, 300);
});

// =====================
// Editar producto
// =====================
window.editarProducto = async (id) => {
  try {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    productoIdInput.value = data.id;
    nombreInput.value = data.nombre;
    precioVentaInput.value = data.precio_venta;
    precioCompraInput.value = data.precio_compra;

    // Cambiar título del formulario
    const tituloForm = form.querySelector("h2");
    if (tituloForm) tituloForm.textContent = "✏️ Editando producto";
    
    // Cambiar texto del botón
    const boton = form.querySelector("button");
    boton.innerHTML = '<span>💾</span> Actualizar producto';
    boton.className = boton.className.replace("bg-green-600", "bg-blue-600 hover:bg-blue-700");

    // Hacer scroll suave
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    
    // Enfocar el primer campo
    nombreInput.focus();
    
    mostrarNotificacion("✏️ Editando producto. Modifica los campos y guarda.", "info");

  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al cargar el producto", "error");
  }
};

// =====================
// Eliminar producto con confirmación mejorada
// =====================
window.eliminarProducto = async (id) => {
  const producto = productosCache.find(p => p.id === id);
  if (!producto) return;

  const confirmar = await mostrarConfirmacion(
    `¿Eliminar producto?`,
    `Se eliminará: <strong>${producto.nombre}</strong><br>Precio venta: $${producto.precio_venta}`,
    "warning"
  );

  if (!confirmar) return;

  try {
    const { error } = await supabase
      .from("productos")
      .delete()
      .eq("id", id);

    if (error) throw error;

    mostrarNotificacion("✅ Producto eliminado correctamente");
    await cargarProductos();
    
  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al eliminar el producto", "error");
  }
};

// =====================
// Limpiar formulario
// =====================
function limpiarFormulario() {
  form.reset();
  productoIdInput.value = "";
  
  // Restaurar título y botón
  const tituloForm = form.querySelector("h2");
  if (tituloForm) tituloForm.textContent = "➕ Agregar producto";
  
  const boton = form.querySelector("button");
  boton.innerHTML = '<span>➕</span> Guardar producto';
  boton.className = boton.className.replace("bg-blue-600 hover:bg-blue-700", "bg-green-600 hover:bg-green-700");
  
  // Enfocar campo nombre
  nombreInput.focus();
}

// =====================
// Utilidades: Notificaciones
// =====================
function mostrarNotificacion(mensaje, tipo = "success") {
  // Remover notificación anterior
  const notificacionAnterior = document.querySelector(".notificacion-flotante");
  if (notificacionAnterior) notificacionAnterior.remove();

  // Crear nueva notificación
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

  // Auto-eliminar después de 4 segundos
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

    // Forzar reflow para la animación
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

    // Cerrar al hacer clic fuera
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
  // Agregar clases de animación a la tabla
  const tablaContenedor = document.querySelector("#tablaProductos").parentElement;
  tablaContenedor.classList.add("tabla-contenedor");
  
  // Mejorar el buscador visualmente
  buscador.className = "w-full border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300";
  
  // Agregar placeholder dinámico
  const ejemplos = ["Manzanas", "Refresco", "Pan", "Leche"];
  let index = 0;
  
  setInterval(() => {
    buscador.placeholder = `🔍 Buscar... Ej: ${ejemplos[index]}`;
    index = (index + 1) % ejemplos.length;
  }, 3000);
});