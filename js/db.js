export const db = new Dexie("KioscoDB");

db.version(1).stores({
  productos: "++id,nombre,precio_venta,precio_compra",
  compras: "++id,producto_id,cantidad,precio_compra,proveedor,fecha",
  ventas: "++id,producto_id,cantidad,precio_venta,fecha"
});
