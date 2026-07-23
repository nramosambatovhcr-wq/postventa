import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CotizacionService, DetalleCotizacion } from 'src/app/services/cotizacion.service';
import * as XLSX from 'xlsx';


// Items nuevos cargados desde la hoja "ItemsAdicionales" del Excel
export interface ItemAdicionalExcel {
  codigoProducto: string;
  descripcion: string;
  proveedor: string;
  cantidadRequerida: number;
  cantidadOfertada: number;
  precioUnitario: number;
  unidad?: string;
  observaciones?: string;
  cotigeneral?: string;
}

export interface ProductoConsolidado {
  codigo: string;
  nuevoCodigo: string;
  descripcion: string;
  cantidadTotal: number;
  chino?: string;
  unidad?: string;
  esNuevo?: boolean;        // true si fue cargado desde Excel y aún no está en BD
  esConsolidado?: boolean;  // true si se sumaron filas duplicadas en el Excel
  existeEnOracle?: boolean | null; // true=en catálogo | false=no existe | null=Oracle no disponible
  detallesAsociados: {
    detalleCotizacionId: number;
    cotizacionId: number;
    cantidadRequerida: number;
    proveedor: string;
    cantidadOfertada: number | null;
    precioUnitario: number | null;
    cantidadAsignada: number | null;
    observaciones?: string;
  }[];
}

export interface CotizacionConsolidada {
  cotigeneral: string;
  proveedorNombre: string;
  productos: ProductoConsolidado[];
}

/**
 * null       = sin decisión → se queda EN ESPERA, no se envía nada
 * 'asignar'  = se enviará con estado ASIGNADA
 * 'cancelar' = se enviará con estado RECHAZADA
 */
export type AccionProveedor = null | 'asignar' | 'cancelar';

@Component({
  selector: 'app-consolidar-cotizacion',
  templateUrl: './consolidar-cotizacion.component.html',
  styleUrls: ['./consolidar-cotizacion.component.css']
})
export class ConsolidarCotizacionComponent implements OnInit {

  cotigeneralId: string = '';
  dataConsolidada: CotizacionConsolidada | null = null;
  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  fileName: string = '';

  /** Items adicionales cargados desde la hoja "ItemsAdicionales" del Excel */
  itemsAdicionalesExcel: ItemAdicionalExcel[] = [];
  hayItemsNuevos = false;

  /** Mapa proveedor → acción elegida por el usuario */
  accionesPorProveedor: Map<string, AccionProveedor> = new Map();

  private proveedoresUnicos: string[] = [];

  // ─── Filtros ────────────────────────────────────────────────────────────────
  filtroTexto: string = '';
  filtroMinPrecio: number | null = null;
  filtroMaxPrecio: number | null = null;
  /** Conjunto de proveedores OCULTOS (columnas) — vacío = todos visibles */
  proveedoresOcultos: Set<string> = new Set();

  fileNameAsignaciones: string = '';
  fileNameAdicionales: string = '';

  // ─── Formulario manual de item adicional ─────────────────────────────────────
  mostrarFormManual: boolean = false;
  guardandoItemManual: boolean = false;
  formManual = {
    codigo: '',
    descripcion: '',
    cantidad: 0
  };

  // ─── Eliminar items ───────────────────────────────────────────────────────────
  /** IDs de detallescotizacion seleccionados para eliminar en bulk */
  itemsSeleccionados: Set<number> = new Set();
  eliminando: boolean = false;
  /** true = modo selección múltiple activo (muestra checkboxes en filas) */
  modoSeleccion: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cotiGeneralService: CotizacionService
  ) {}

  ngOnInit(): void {
    this.cotigeneralId = this.route.snapshot.paramMap.get('cotigeneralId') || '';
    if (this.cotigeneralId) {
      this.loadConsolidatedData(this.cotigeneralId);
    } else {
      this.errorMessage = 'ID de Cotización General no proporcionado.';
    }
  }

  loadConsolidatedData(cotigeneralId: string): void {
    this.loading = true;
    this.errorMessage = null;

    this.cotiGeneralService.getDetallesByCotiGeneral(cotigeneralId).subscribe({
      next: (detalles: DetalleCotizacion[]) => {
        const productosMap = new Map<string, ProductoConsolidado>();
        const proveedoresSet = new Set<string>();

        // Excluir detalles que ya fueron aprobados/asignados — no deben
        // aparecer en la consolidación porque ya tienen orden de compra.
        const estadosExcluidos = ['asignada', 'aprobada'];
        const detallesPendientes = detalles.filter(d => {
          const estado = ((d as any).estado ?? '').toLowerCase();
          const cantAprobada = (d as any).cantidadAprobada ?? 0;
          return !estadosExcluidos.includes(estado) && cantAprobada === 0;
        });

        detallesPendientes.forEach(detalle => {
          const codigo = detalle.codigo || 'SIN-CODIGO';
          const proveedor = detalle.proveedor || 'Sin proveedor';
          proveedoresSet.add(proveedor);

          const detalleAsociado = {
            detalleCotizacionId: detalle.detalleCotizacionId!,
            cotizacionId: detalle.cotizacionId,
            cantidadRequerida: detalle.cantidad,
            proveedor,
            cantidadOfertada: detalle.cantidadProveedor ?? null,
            precioUnitario: detalle.precio ?? null,
            cantidadAsignada: null,
            observaciones: ''
          };

          if (productosMap.has(codigo)) {
            productosMap.get(codigo)!.detallesAsociados.push(detalleAsociado);
          } else {
            productosMap.set(codigo, {
              codigo,
              nuevoCodigo: (detalle as any).nuevoCodigo || (detalle as any).nuevocodigo || '',
              descripcion: detalle.descripcion || 'Sin descripción',
              cantidadTotal: detalle.cantidad,
              chino: detalle.chinese,
              unidad: detalle.unidad,
              esNuevo: false,
              esConsolidado:   (detalle as any).esConsolidado   ?? false,
              existeEnOracle:  (detalle as any).existeEnOracle  ?? null,
              detallesAsociados: [detalleAsociado]
            });
          }
        });

        this.proveedoresUnicos = Array.from(proveedoresSet).sort();
        // Todas las acciones empiezan como null (sin decisión = EN ESPERA)
        this.proveedoresUnicos.forEach(p => this.accionesPorProveedor.set(p, null));

        let productosConsolidados = Array.from(productosMap.values());
        productosConsolidados = this.ordenarProductosPorSubtotal(productosConsolidados);

        this.dataConsolidada = {
          cotigeneral: cotigeneralId,
          proveedorNombre: 'Consolidado',
          productos: productosConsolidados
        };

        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Error al cargar los datos de la cotización. Por favor, intente nuevamente.';
        this.loading = false;
      }
    });
  }

  // ─── Ordenamiento ───────────────────────────────────────────────────────────

  private ordenarProductosPorSubtotal(productos: ProductoConsolidado[]): ProductoConsolidado[] {
    return productos.sort((a, b) =>
      this.calcularSubtotalProducto(b) - this.calcularSubtotalProducto(a)
    );
  }

  calcularSubtotalProducto(producto: ProductoConsolidado): number {
    return producto.detallesAsociados.reduce((sum, d) =>
      sum + (d.cantidadOfertada || 0) * (d.precioUnitario || 0), 0
    );
  }

  // ─── Accesos básicos ────────────────────────────────────────────────────────

  obtenerProveedoresUnicos(): string[] {
    return this.proveedoresUnicos;
  }

  obtenerDetallePorProveedor(producto: ProductoConsolidado, proveedor: string): any {
    return producto.detallesAsociados.find(d => d.proveedor === proveedor);
  }

  obtenerAccion(proveedor: string): AccionProveedor {
    return this.accionesPorProveedor.get(proveedor) ?? null;
  }

  hayAlgunaDecision(): boolean {
    return this.proveedoresUnicos.some(p => this.obtenerAccion(p) !== null);
  }

  // ─── Marcar acción por proveedor ────────────────────────────────────────────

  /**
   * Marca el proveedor como ASIGNAR y rellena automáticamente
   * sus cantidades cotizadas en la tabla.
   */
  marcarAsignar(proveedor: string): void {
    if (!this.dataConsolidada) return;
    this.accionesPorProveedor.set(proveedor, 'asignar');

    // Mostrar en pantalla la cantidad que el proveedor cotizó
    this.dataConsolidada.productos.forEach(producto => {
      const detalle = producto.detallesAsociados.find(d => d.proveedor === proveedor);
      if (!detalle) return;
      // Respetar valor ya puesto por auto-asignar; solo rellenar si aún es null
      if (detalle.cantidadAsignada === null) {
        detalle.cantidadAsignada = detalle.cantidadOfertada ?? 0;
      }
      this.validarAsignacion(producto);
    });
  }

  /**
   * Marca el proveedor como CANCELAR (RECHAZADA).
   * Limpia sus cantidades asignadas.
   */
  marcarCancelar(proveedor: string): void {
    if (!this.dataConsolidada) return;
    this.accionesPorProveedor.set(proveedor, 'cancelar');

    // Limpiar cantidades de este proveedor
    this.dataConsolidada.productos.forEach(producto => {
      const detalle = producto.detallesAsociados.find(d => d.proveedor === proveedor);
      if (detalle) detalle.cantidadAsignada = null;
    });
  }

  /**
   * Revierte la decisión → null (sin decisión, queda EN ESPERA sin cambio)
   */
  revertirAccion(proveedor: string): void {
    if (!this.dataConsolidada) return;
    this.accionesPorProveedor.set(proveedor, null);
    this.dataConsolidada.productos.forEach(producto => {
      const detalle = producto.detallesAsociados.find(d => d.proveedor === proveedor);
      if (detalle) detalle.cantidadAsignada = null;
    });
  }

  // ─── CONFIRMAR Y ENVIAR ──────────────────────────────────────────────────────

  /**
   * Reglas:
   * - Proveedores marcados 'asignar'  → se envían con estado ASIGNADA
   * - Proveedores marcados 'cancelar' → se envían con estado RECHAZADA
   * - Proveedores sin marcar (null)   → NO se toca nada, quedan EN ESPERA
   */
  confirmarYEnviar(): void {
    if (!this.dataConsolidada) return;

    const proveedoresAsignar  = this.proveedoresUnicos.filter(p => this.obtenerAccion(p) === 'asignar');
    const proveedoresCancelar = this.proveedoresUnicos.filter(p => this.obtenerAccion(p) === 'cancelar');
    const proveedoresEnEspera = this.proveedoresUnicos.filter(p => this.obtenerAccion(p) === null);

    if (!proveedoresAsignar.length && !proveedoresCancelar.length) {
      this.errorMessage = 'No ha tomado ninguna decisión. Use los botones Asignar o Cancelar en cada proveedor.';
      return;
    }

    // Resumen de confirmación
    let resumen = '¿Confirma las siguientes acciones?\n\n';
    if (proveedoresAsignar.length)  resumen += `✅ ASIGNAR: ${proveedoresAsignar.join(', ')}\n`;
    if (proveedoresCancelar.length) resumen += `❌ RECHAZAR: ${proveedoresCancelar.join(', ')}\n`;
    if (proveedoresEnEspera.length) resumen += `⏳ EN ESPERA (sin cambio): ${proveedoresEnEspera.join(', ')}`;
    if (this.hayItemsNuevos)        resumen += `\n\n📋 Se guardarán ${this.itemsAdicionalesExcel.length} items nuevos en la base de datos.`;

    if (!confirm(resumen)) return;

    const asignaciones = this.dataConsolidada.productos
      .flatMap(p => p.detallesAsociados)
      .filter(d => this.obtenerAccion(d.proveedor) === 'asignar' && (d.cantidadOfertada || 0) > 0)
      .map(d => ({
        detalleCotizacionId: d.detalleCotizacionId,
        cotizacionId: d.cotizacionId,
        cantidadAsignada: d.cantidadOfertada!,
        precioUnitario: d.precioUnitario || 0,
        observaciones: d.observaciones
      }));

    const idsRechazar = this.obtenerCotizacionIdsDe(proveedoresCancelar);

    this.loading = true;
    this.errorMessage = null;

    // Paso 1: Guardar items nuevos del Excel en BD (si los hay)
    const guardarItemsNuevos = (onComplete: () => void) => {
      if (!this.hayItemsNuevos || !this.itemsAdicionalesExcel.length) {
        onComplete();
        return;
      }
      const payload = this.itemsAdicionalesExcel.map(i => ({ ...i, cotigeneral: this.cotigeneralId }));
      this.cotiGeneralService.guardarItemsAdicionales(payload).subscribe({
        next: () => onComplete(),
        error: err => {
          this.loading = false;
          this.errorMessage = err?.error || err?.message || 'Error al guardar los items adicionales.';
        }
      });
    };

    // Paso 3: Rechazos
    const ejecutarRechazos = () => {
      if (idsRechazar.length > 0) {
        this.cotiGeneralService.rechazarCotizacionesProveedor(idsRechazar).subscribe({
          next: () => {
            this.loading = false;
            this.mostrarResultadoFinal(proveedoresAsignar, proveedoresCancelar, proveedoresEnEspera);
          },
          error: err => {
            this.loading = false;
            this.errorMessage = err.error || 'Error al rechazar cotizaciones.';
          }
        });
      } else {
        this.loading = false;
        this.mostrarResultadoFinal(proveedoresAsignar, proveedoresCancelar, proveedoresEnEspera);
      }
    };

    // Paso 2: Asignaciones
    const ejecutarAsignaciones = () => {
      if (asignaciones.length > 0) {
        this.cotiGeneralService.asignarProveedores(this.cotigeneralId, asignaciones).subscribe({
          next: () => ejecutarRechazos(),
          error: err => {
            this.loading = false;
            this.errorMessage = err.error || 'Error al asignar cotizaciones.';
          }
        });
      } else {
        ejecutarRechazos();
      }
    };

    // Ejecutar en orden: items nuevos → asignaciones → rechazos
    guardarItemsNuevos(() => ejecutarAsignaciones());
  }

  private mostrarResultadoFinal(
    asignados: string[], rechazados: string[], enEspera: string[]
  ): void {
    let msg = '';
    if (asignados.length)    msg += `✅ Asignados correctamente: ${asignados.join(', ')}\n`;
    if (rechazados.length)   msg += `❌ Rechazados: ${rechazados.join(', ')}\n`;
    if (enEspera.length)     msg += `⏳ En Espera (sin cambio): ${enEspera.join(', ')}`;
    if (this.hayItemsNuevos) msg += `\n📋 ${this.itemsAdicionalesExcel.length} item(s) adicionales guardados en la base de datos.`;
    this.successMessage = msg.trim();
    this.hayItemsNuevos = false;
    this.itemsAdicionalesExcel = [];

    // Redirigir siempre tras guardar exitosamente, haya o no proveedores en espera
    setTimeout(() => this.router.navigate(['/asignadacot']), 1000);
  }

  private obtenerCotizacionIdsDe(proveedores: string[]): number[] {
    if (!this.dataConsolidada) return [];
    const ids = new Set<number>();
    proveedores.forEach(proveedor => {
      this.dataConsolidada!.productos.forEach(producto =>
        producto.detallesAsociados
          .filter(d => d.proveedor === proveedor)
          .forEach(d => ids.add(d.cotizacionId))
      );
    });
    return Array.from(ids);
  }

  // ─── Cálculos ───────────────────────────────────────────────────────────────

  calcularTotalPorProveedor(proveedor: string): number {
    if (!this.dataConsolidada) return 0;
    return this.dataConsolidada.productos.reduce((sum, producto) => {
      const d = this.obtenerDetallePorProveedor(producto, proveedor);
      return sum + (d ? (d.cantidadOfertada || 0) * (d.precioUnitario || 0) : 0);
    }, 0);
  }

  calcularTotalGeneral(): number {
    if (!this.dataConsolidada) return 0;
    return this.dataConsolidada.productos.reduce((sum, p) =>
      sum + this.calcularSubtotalProducto(p), 0);
  }

  obtenerCantidadAsignada(producto: ProductoConsolidado): number {
    return producto.detallesAsociados.reduce((sum, d) => sum + (d.cantidadAsignada || 0), 0);
  }

  obtenerCantidadRestante(producto: ProductoConsolidado): number {
    return producto.cantidadTotal - this.obtenerCantidadAsignada(producto);
  }

  validarAsignacion(producto: ProductoConsolidado): void {
    if (this.obtenerCantidadRestante(producto) < 0)
      console.warn(`Producto ${producto.codigo}: Asignación excedida`);
  }

  calcularTotalAsignadoPorProveedor(proveedor: string): number {
    if (!this.dataConsolidada) return 0;
    return this.dataConsolidada.productos.reduce((sum, producto) => {
      const d = this.obtenerDetallePorProveedor(producto, proveedor);
      return sum + (d?.cantidadAsignada || 0);
    }, 0);
  }

  calcularTotalGeneralAsignado(): number {
    if (!this.dataConsolidada) return 0;
    return this.dataConsolidada.productos.reduce((sum, producto) =>
      sum + producto.detallesAsociados.reduce((s, d) =>
        s + (d.cantidadAsignada || 0) * (d.precioUnitario || 0), 0
      ), 0
    );
  }

  calcularTotalUnidadesAsignadas(): number {
    if (!this.dataConsolidada) return 0;
    return this.dataConsolidada.productos.reduce((sum, p) =>
      sum + this.obtenerCantidadAsignada(p), 0);
  }

  calcularTotalUnidadesRequeridas(): number {
    if (!this.dataConsolidada) return 0;
    return this.dataConsolidada.productos.reduce((sum, p) => sum + p.cantidadTotal, 0);
  }

  obtenerProductosConAsignacionIncompleta(): ProductoConsolidado[] {
    if (!this.dataConsolidada) return [];
    return this.dataConsolidada.productos.filter(producto => {
      const tieneProveedorAsignar = producto.detallesAsociados
        .some(d => this.obtenerAccion(d.proveedor) === 'asignar');
      return tieneProveedorAsignar && this.obtenerCantidadRestante(producto) !== 0;
    });
  }

  // ─── Otras acciones ─────────────────────────────────────────────────────────

  asignarTodoAProveedor(proveedor: string): void {
    if (!this.dataConsolidada) return;
    this.dataConsolidada.productos.forEach(producto => {
      const detalle = producto.detallesAsociados.find(d => d.proveedor === proveedor);
      if (!detalle) return;
      detalle.cantidadAsignada = Math.min(detalle.cantidadOfertada || 0, producto.cantidadTotal);
      this.validarAsignacion(producto);
    });
  }

  autoAsignarCompleto(): void {
    if (!this.dataConsolidada) return;

    // Limpiar asignaciones previas
    this.dataConsolidada.productos.forEach(producto =>
      producto.detallesAsociados.forEach(d => d.cantidadAsignada = null)
    );

    this.dataConsolidada.productos.forEach(producto => {
      const cantidadRequerida = producto.cantidadTotal;

      // Solo los proveedores que tienen stock disponible (cantidadOfertada > 0)
      const detallesConStock = producto.detallesAsociados.filter(
        d => (d.cantidadOfertada ?? 0) > 0
      );

      if (!detallesConStock.length) return; // ningún proveedor tiene stock

      // Ordenar por el orden en proveedoresUnicos para que el "último" sea consistente
      const detallesOrdenados = [...detallesConStock].sort((a, b) =>
        this.proveedoresUnicos.indexOf(a.proveedor) - this.proveedoresUnicos.indexOf(b.proveedor)
      );

      let restante = cantidadRequerida;
      const asignaciones: { detalle: typeof detallesOrdenados[0]; cantidad: number }[] = [];

      // ── Ronda 1: reparto equitativo en enteros ───────────────────────────────
      // Iteramos hasta que no quede nada por repartir o todos los proveedores
      // estén al límite de su stock disponible.
      let proveedoresActivos = [...detallesOrdenados];

      while (restante > 0 && proveedoresActivos.length > 0) {
        const porProveedor = Math.floor(restante / proveedoresActivos.length);

        if (porProveedor === 0) {
          // Menos unidades que proveedores activos: asignar 1 a cada proveedor
          // hasta agotar el restante (de primero a último)
          for (let i = 0; i < restante; i++) {
            const det = proveedoresActivos[i];
            const yaAsignado = asignaciones.find(a => a.detalle === det);
            if (yaAsignado) {
              yaAsignado.cantidad += 1;
            } else {
              asignaciones.push({ detalle: det, cantidad: 1 });
            }
          }
          restante = 0;
          break;
        }

        // Asignar porProveedor a cada uno, respetando su stock
        const proveedoresSaturados: typeof detallesOrdenados = [];

        proveedoresActivos.forEach(det => {
          const stockDisponible = det.cantidadOfertada ?? 0;
          const yaAsignado = asignaciones.find(a => a.detalle === det)?.cantidad ?? 0;
          const puedeRecibir = stockDisponible - yaAsignado;

          if (puedeRecibir <= 0) {
            proveedoresSaturados.push(det);
            return;
          }

          const aAsignar = Math.min(porProveedor, puedeRecibir);
          const entrada = asignaciones.find(a => a.detalle === det);
          if (entrada) {
            entrada.cantidad += aAsignar;
          } else {
            asignaciones.push({ detalle: det, cantidad: aAsignar });
          }

          if (aAsignar < porProveedor) {
            // Se saturó con menos de lo que le tocaba
            proveedoresSaturados.push(det);
          }
        });

        // Recalcular restante
        const totalAsignado = asignaciones.reduce((s, a) => s + a.cantidad, 0);
        restante = cantidadRequerida - totalAsignado;

        // Quitar proveedores que ya llegaron a su tope
        proveedoresActivos = proveedoresActivos.filter(det => {
          const stockDisponible = det.cantidadOfertada ?? 0;
          const asignado = asignaciones.find(a => a.detalle === det)?.cantidad ?? 0;
          return asignado < stockDisponible;
        });
      }

      // ── Ronda 2: excedente → al último proveedor con stock disponible ────────
      if (restante > 0 && detallesOrdenados.length > 0) {
        // Buscar desde el último proveedor hacia atrás
        for (let i = detallesOrdenados.length - 1; i >= 0 && restante > 0; i--) {
          const det = detallesOrdenados[i];
          const stockDisponible = det.cantidadOfertada ?? 0;
          const entrada = asignaciones.find(a => a.detalle === det);
          const yaAsignado = entrada?.cantidad ?? 0;
          const puedeRecibir = stockDisponible - yaAsignado;

          if (puedeRecibir > 0) {
            const aAsignar = Math.min(restante, puedeRecibir);
            if (entrada) {
              entrada.cantidad += aAsignar;
            } else {
              asignaciones.push({ detalle: det, cantidad: aAsignar });
            }
            restante -= aAsignar;
          }
        }
      }

      // ── Aplicar resultados ───────────────────────────────────────────────────
      asignaciones.forEach(({ detalle, cantidad }) => {
        detalle.cantidadAsignada = cantidad > 0 ? cantidad : null;
      });

      this.validarAsignacion(producto);
    });
  }

  limpiarAsignaciones(): void {
    if (!this.dataConsolidada) return;
    if (!confirm('¿Está seguro de que desea limpiar todas las asignaciones y decisiones?')) return;
    this.dataConsolidada.productos.forEach(producto =>
      producto.detallesAsociados.forEach(d => d.cantidadAsignada = null)
    );
    this.proveedoresUnicos.forEach(p => this.accionesPorProveedor.set(p, null));
    // Eliminar productos nuevos del Excel y proveedores que solo venían de ellos
    this.limpiarItemsNuevos();
  }

  limpiarItemsNuevos(): void {
    if (!this.dataConsolidada) return;
    // Retirar productos marcados como nuevos
    this.dataConsolidada.productos = this.dataConsolidada.productos.filter(p => !p.esNuevo);
    // Retirar proveedores que sólo aparecían en items nuevos
    const proveedoresEnBD = new Set(
      this.dataConsolidada.productos.flatMap(p => p.detallesAsociados.map(d => d.proveedor))
    );
    this.proveedoresUnicos = this.proveedoresUnicos.filter(p => proveedoresEnBD.has(p));
    this.proveedoresUnicos.forEach(p => {
      if (!this.accionesPorProveedor.has(p)) this.accionesPorProveedor.set(p, null);
    });
    this.itemsAdicionalesExcel = [];
    this.hayItemsNuevos = false;
  }

  // ─── Excel ──────────────────────────────────────────────────────────────────

  descargarPlantillaExcel(): void {
    if (!this.dataConsolidada) return;

    // Hoja 1 — Asignaciones de items existentes
    const datosExistentes = this.dataConsolidada.productos.flatMap(producto =>
      producto.detallesAsociados.map(d => ({
        CodigoProducto: producto.codigo,
        Descripcion: producto.descripcion,
        Proveedor: d.proveedor,
        CantidadAsignada: 0,
        Observaciones: ''
      }))
    );

    // Hoja 2 — Plantilla para items adicionales nuevos
    const plantillaAdicionales = [{
      CodigoProducto: 'EJEMPLO-001',
      Descripcion: 'Descripción del nuevo producto',
      Proveedor: 'Nombre del Proveedor',
      CantidadRequerida: 10,
      CantidadOfertada: 10,
      PrecioUnitario: 25.50,
      Unidad: 'UND',
      Observaciones: ''
    }];

    // Hoja 3 — Instrucciones
    const instrucciones = [
      { Instruccion: 'Hoja "Asignaciones": complete CantidadAsignada para los items existentes.' },
      { Instruccion: 'Hoja "ItemsAdicionales": agregue filas con productos nuevos que no existen en la cotización.' },
      { Instruccion: 'Los items nuevos se mostrarán en la tabla y se guardarán en la BD al presionar Confirmar y Enviar.' },
      { Instruccion: 'No modifique los encabezados de columna.' }
    ];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(datosExistentes),    'Asignaciones');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(plantillaAdicionales), 'ItemsAdicionales');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instrucciones),       'Instrucciones');
    XLSX.writeFile(wb, `Plantilla_Asignacion_${this.cotigeneralId}.xlsx`);
  }

  procesarExcel(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.fileName = file.name;
    this.errorMessage = null;
    this.successMessage = null;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Hoja 1: items existentes
        const nombreHoja1 = workbook.SheetNames.find(n =>
          n.toLowerCase().includes('asignacion') || n === workbook.SheetNames[0]
        );
        const jsonAsignaciones: any[] = nombreHoja1
          ? XLSX.utils.sheet_to_json(workbook.Sheets[nombreHoja1]) : [];

        // Hoja 2: items adicionales
        const nombreHoja2 = workbook.SheetNames.find(n =>
          n.toLowerCase().includes('adicional') || n.toLowerCase().includes('nuevo')
        );
        const jsonAdicionales: any[] = nombreHoja2
          ? XLSX.utils.sheet_to_json(workbook.Sheets[nombreHoja2]) : [];

        if (!jsonAsignaciones.length && !jsonAdicionales.length) {
          this.errorMessage = 'Archivo vacío o formato incorrecto.';
          return;
        }

        if (jsonAsignaciones.length) this.cargarAsignacionesDesdeExcel(jsonAsignaciones);
        if (jsonAdicionales.length)  this.procesarItemsAdicionalesDesdeExcel(jsonAdicionales);

      } catch {
        this.errorMessage = 'Error al procesar el archivo Excel.';
      }
    };
    reader.readAsArrayBuffer(file);
    const fi = document.getElementById('excelFile') as HTMLInputElement;
    if (fi) fi.value = '';
  }

  private cargarAsignacionesDesdeExcel(datos: any[]): void {
    if (!this.dataConsolidada) return;
    let exitosas = 0;
    const errores: string[] = [];
    this.dataConsolidada.productos.forEach(p =>
      p.detallesAsociados.forEach(d => d.cantidadAsignada = null)
    );
    datos.forEach((fila, i) => {
      const codigo   = fila['CodigoProducto'] || fila['codigo'];
      const proveedor = fila['Proveedor'] || fila['proveedor'];
      const cantidad  = Number(fila['CantidadAsignada'] || 0);
      if (!codigo || !proveedor) return;
      const producto = this.dataConsolidada!.productos.find(p =>
        p.codigo.toLowerCase().trim() === String(codigo).toLowerCase().trim()
      );
      if (!producto) { errores.push(`Fila ${i + 2}: Producto ${codigo} no encontrado`); return; }
      const detalle = producto.detallesAsociados.find(d =>
        d.proveedor.toLowerCase().trim() === String(proveedor).toLowerCase().trim()
      );
      if (!detalle) { errores.push(`Fila ${i + 2}: Proveedor ${proveedor} no encontrado`); return; }
      if (cantidad > (detalle.cantidadOfertada || 0)) {
        errores.push(`Fila ${i + 2}: Cantidad excede lo ofertado`); return;
      }
      if (cantidad > 0) {
        detalle.cantidadAsignada = cantidad;
        if (fila['Observaciones']) detalle.observaciones = String(fila['Observaciones']);
        exitosas++;
      }
    });
    this.dataConsolidada.productos.forEach(p => this.validarAsignacion(p));
    if (exitosas)        this.successMessage = `✅ ${exitosas} asignaciones cargadas desde Excel.`;
    if (errores.length)  this.errorMessage   = `⚠️ ${errores.length} errores:\n${errores.slice(0, 5).join('\n')}`;
    const fi = document.getElementById('excelFile') as HTMLInputElement;
    if (fi) fi.value = '';
  }

  // ─── Filtros ────────────────────────────────────────────────────────────────

  // ─── Contadores para los badges de resumen ────────────────────────────────
  get consolidadosCount(): number {
    return this.dataConsolidada?.productos.filter(p => p.esConsolidado).length ?? 0;
  }

  get sinCatalogoCount(): number {
    return this.dataConsolidada?.productos.filter(p => p.existeEnOracle === false).length ?? 0;
  }

  get productosFiltrados(): ProductoConsolidado[] {
    if (!this.dataConsolidada) return [];
    const filtrados = this.dataConsolidada.productos.filter(p => {
      const txt = this.filtroTexto.trim().toLowerCase();
      if (txt && !p.codigo.toLowerCase().includes(txt) && !p.descripcion.toLowerCase().includes(txt)) return false;
      const subtotal = this.calcularSubtotalProducto(p);
      if (this.filtroMinPrecio !== null && subtotal < this.filtroMinPrecio) return false;
      if (this.filtroMaxPrecio !== null && subtotal > this.filtroMaxPrecio) return false;
      return true;
    });
    // Primero ordenar, luego agrupar relacionados para que queden consecutivos
    return this.agruparRelacionados(this.aplicarOrden(filtrados));
  }

  get proveedoresVisibles(): string[] {
    return this.proveedoresUnicos.filter(p => !this.proveedoresOcultos.has(p));
  }

  toggleProveedor(proveedor: string): void {
    if (this.proveedoresOcultos.has(proveedor)) this.proveedoresOcultos.delete(proveedor);
    else this.proveedoresOcultos.add(proveedor);
  }

  isProveedorVisible(proveedor: string): boolean {
    return !this.proveedoresOcultos.has(proveedor);
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroMinPrecio = null;
    this.filtroMaxPrecio = null;
    this.proveedoresOcultos.clear();
  }

  // ─── Ordenamiento ────────────────────────────────────────────────────────────
  sortColumna: string = 'subtotalProducto';
  sortDireccion: 'asc' | 'desc' = 'desc';

  sortBy(columna: string): void {
    if (this.sortColumna === columna) {
      this.sortDireccion = this.sortDireccion === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumna = columna;
      this.sortDireccion = 'asc';
    }
  }

  sortIcon(columna: string): string {
    if (this.sortColumna !== columna) return 'fa-sort';
    return this.sortDireccion === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  private aplicarOrden(lista: ProductoConsolidado[]): ProductoConsolidado[] {
    const dir = this.sortDireccion === 'asc' ? 1 : -1;
    return [...lista].sort((a, b) => {
      let va: any, vb: any;
      if (this.sortColumna === 'codigo') {
        va = a.codigo.toLowerCase(); vb = b.codigo.toLowerCase();
        return dir * va.localeCompare(vb);
      } else if (this.sortColumna === 'descripcion') {
        va = a.descripcion.toLowerCase(); vb = b.descripcion.toLowerCase();
        return dir * va.localeCompare(vb);
      } else if (this.sortColumna === 'cantidadTotal') {
        return dir * (a.cantidadTotal - b.cantidadTotal);
      } else if (this.sortColumna === 'subtotalProducto') {
        return dir * (this.calcularSubtotalProducto(a) - this.calcularSubtotalProducto(b));
      } else if (this.sortColumna.startsWith('cantDisp:')) {
        const prov = this.sortColumna.slice(9);
        const da = a.detallesAsociados.find(d => d.proveedor === prov);
        const db = b.detallesAsociados.find(d => d.proveedor === prov);
        return dir * ((da?.cantidadOfertada || 0) - (db?.cantidadOfertada || 0));
      } else if (this.sortColumna.startsWith('precio:')) {
        const prov = this.sortColumna.slice(7);
        const da = a.detallesAsociados.find(d => d.proveedor === prov);
        const db = b.detallesAsociados.find(d => d.proveedor === prov);
        return dir * ((da?.precioUnitario || 0) - (db?.precioUnitario || 0));
      } else if (this.sortColumna.startsWith('subtotal:')) {
        const prov = this.sortColumna.slice(9);
        const da = a.detallesAsociados.find(d => d.proveedor === prov);
        const db = b.detallesAsociados.find(d => d.proveedor === prov);
        const sa = (da?.cantidadOfertada || 0) * (da?.precioUnitario || 0);
        const sb = (db?.cantidadOfertada || 0) * (db?.precioUnitario || 0);
        return dir * (sa - sb);
      }
      return 0;
    });
  }

  hayFiltrosActivos(): boolean {
    return !!this.filtroTexto.trim() || this.filtroMinPrecio !== null ||
           this.filtroMaxPrecio !== null || this.proveedoresOcultos.size > 0;
  }

  // ─── Productos relacionados (codigo ↔ nuevoCodigo) ───────────────────────────

  /**
   * Construye un mapa codigo → groupId para productos relacionados.
   * Relación: el nuevoCodigo de un producto coincide con el codigo de otro.
   */
  private buildGruposRelacionados(): Map<string, string> {
    const mapa = new Map<string, string>();
    if (!this.dataConsolidada) return mapa;
    const productos = this.dataConsolidada.productos;

    // Índice: codigo → producto para búsqueda rápida
    const porCodigo = new Map<string, ProductoConsolidado>();
    productos.forEach(p => porCodigo.set(p.codigo.trim().toUpperCase(), p));

    productos.forEach(p => {
      if (!p.nuevoCodigo?.trim()) return;
      const nuevoUp = p.nuevoCodigo.trim().toUpperCase();
      const hermano = porCodigo.get(nuevoUp);
      if (hermano && hermano.codigo !== p.codigo) {
        const groupId = [p.codigo, hermano.codigo].sort().join('||');
        mapa.set(p.codigo, groupId);
        mapa.set(hermano.codigo, groupId);
      }
    });
    return mapa;
  }

  /** Devuelve el groupId si el producto tiene un hermano relacionado, o null */
  getGrupoRelacionado(producto: ProductoConsolidado): string | null {
    return this.buildGruposRelacionados().get(producto.codigo) ?? null;
  }

  /** true si el producto está relacionado con otro por codigo↔nuevoCodigo */
  esProductoRelacionado(producto: ProductoConsolidado): boolean {
    return this.buildGruposRelacionados().has(producto.codigo);
  }

  /** Devuelve el codigo del producto "hermano" relacionado */
  getCodigoHermano(producto: ProductoConsolidado): string | null {
    if (!this.dataConsolidada) return null;
    const productos = this.dataConsolidada.productos;
    // Caso 1: este tiene nuevoCodigo que es el codigo de otro
    if (producto.nuevoCodigo?.trim()) {
      const h = productos.find(p =>
        p.codigo.trim().toUpperCase() === producto.nuevoCodigo!.trim().toUpperCase()
        && p.codigo !== producto.codigo
      );
      if (h) return h.codigo;
    }
    // Caso 2: otro tiene nuevoCodigo igual al codigo de este
    const h2 = productos.find(p =>
      p.nuevoCodigo?.trim().toUpperCase() === producto.codigo.trim().toUpperCase()
      && p.codigo !== producto.codigo
    );
    return h2?.codigo ?? null;
  }

  /**
   * Reordena para que los pares relacionados queden juntos consecutivamente.
   * El producto con nuevoCodigo va primero, el hermano (el nuevoCodigo) va justo después.
   */
  private agruparRelacionados(lista: ProductoConsolidado[]): ProductoConsolidado[] {
    const grupos = this.buildGruposRelacionados();
    if (!grupos.size) return lista;

    const resultado: ProductoConsolidado[] = [];
    const yaAgregados = new Set<string>();

    lista.forEach(p => {
      if (yaAgregados.has(p.codigo)) return;
      resultado.push(p);
      yaAgregados.add(p.codigo);
      // Insertar hermano inmediatamente después
      const codigoHermano = this.getCodigoHermano(p);
      if (codigoHermano) {
        const hermano = lista.find(x => x.codigo === codigoHermano);
        if (hermano && !yaAgregados.has(codigoHermano)) {
          resultado.push(hermano);
          yaAgregados.add(codigoHermano);
        }
      }
    });

    return resultado;
  }

  // ─── Excel separado: solo Asignaciones ──────────────────────────────────────

  procesarExcelAsignaciones(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.fileNameAsignaciones = file.name;
    this.errorMessage = null; this.successMessage = null;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const hoja = wb.SheetNames.find(n => n.toLowerCase().includes('asignacion') || n === wb.SheetNames[0]);
        const json: any[] = hoja ? XLSX.utils.sheet_to_json(wb.Sheets[hoja]) : [];
        if (!json.length) { this.errorMessage = 'Archivo vacío o sin hoja de asignaciones.'; return; }
        this.cargarAsignacionesDesdeExcel(json);
      } catch { this.errorMessage = 'Error al procesar el archivo de asignaciones.'; }
    };
    reader.readAsArrayBuffer(file);
    const fi = document.getElementById('excelAsignaciones') as HTMLInputElement;
    if (fi) fi.value = '';
  }

  // ─── Excel separado: solo Items Adicionales ──────────────────────────────────
  // Usa las mismas 3 columnas que la plantilla: CodigoProducto, Descripcion, CantidadRequerida
  // Llama directamente al endpoint agregar-item-adicional (igual que el formulario manual)

  procesarExcelAdicionales(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.fileNameAdicionales = file.name;
    this.errorMessage = null; this.successMessage = null;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const hoja = wb.SheetNames.find(n =>
          n.toLowerCase().includes('adicional') || n.toLowerCase().includes('nuevo') || n === wb.SheetNames[0]
        );
        const json: any[] = hoja ? XLSX.utils.sheet_to_json(wb.Sheets[hoja]) : [];
        if (!json.length) { this.errorMessage = 'Archivo vacío o sin datos de items adicionales.'; return; }

        this.procesarExcelAdicionalesNuevo(json);

      } catch { this.errorMessage = 'Error al procesar el archivo de items adicionales.'; }
    };
    reader.readAsArrayBuffer(file);
    const fi = document.getElementById('excelAdicionales') as HTMLInputElement;
    if (fi) fi.value = '';
  }

  private procesarExcelAdicionalesNuevo(datos: any[]): void {
    if (!this.dataConsolidada) return;

    // Obtener cotizacionIds únicos de proveedores visibles (estado Solicitada)
    const cotizacionIds = Array.from(
      new Set(
        this.dataConsolidada.productos
          .flatMap(p => p.detallesAsociados)
          .map(d => d.cotizacionId)
          .filter(id => id > 0)
      )
    );

    if (!cotizacionIds.length) {
      this.errorMessage = '⚠️ No hay cotizaciones en estado Solicitada para agregar items.';
      return;
    }

    const errores: string[] = [];
    const itemsValidos: { codigo: string; descripcion: string; cantidad: number }[] = [];

    datos.forEach((fila, i) => {
      const codigo      = String(fila['CodigoProducto'] || fila['codigo'] || '').trim();
      const descripcion = String(fila['Descripcion']    || fila['descripcion'] || '').trim();
      const cantidad    = Number(fila['CantidadRequerida'] || fila['cantidad'] || 0);

      if (!codigo) {
        errores.push(`Fila ${i + 2}: CodigoProducto es obligatorio.`);
        return;
      }
      if (cantidad <= 0) {
        errores.push(`Fila ${i + 2}: CantidadRequerida debe ser mayor a 0.`);
        return;
      }

      itemsValidos.push({ codigo, descripcion, cantidad });
    });

    if (errores.length) {
      this.errorMessage = `⚠️ ${errores.length} error(es):\n${errores.slice(0, 5).join('\n')}`;
      return;
    }

    if (!itemsValidos.length) {
      this.errorMessage = '⚠️ No se encontraron items válidos en el archivo.';
      return;
    }

    // Construir payload: un registro por item × cotizacionId
    const payload = itemsValidos.flatMap(item =>
      cotizacionIds.map(cotId => ({
        cotizacionId:  cotId,
        codigo:        item.codigo,
        descripcion:   item.descripcion,
        cantidad:      item.cantidad,
        unidad:        '',
        precio:        0,
        observaciones: ''
      }))
    );

    this.guardandoItemManual = true;
    this.errorMessage = null;

    this.cotiGeneralService.agregarItemsADetalleCotizacion(payload).subscribe({
      next: (res: any) => {
        this.guardandoItemManual = false;
        this.successMessage = `✅ ${itemsValidos.length} item(s) agregados a ${cotizacionIds.length} cotización(es). Recargando...`;
        this.fileNameAdicionales = '';
        this.loadConsolidatedData(this.cotigeneralId);
      },
      error: err => {
        this.guardandoItemManual = false;
        this.errorMessage = err?.error?.message || err?.error || err?.message || 'Error al guardar los items.';
      }
    });
  }

  /**
   * Procesa la hoja "ItemsAdicionales" del Excel:
   * - Productos completamente nuevos → se agregan a la tabla con badge NUEVO
   * - Proveedor nuevo para un producto existente → se añade como detalle al producto
   * - Registra los items para guardarlos en BD al confirmar
   */
  procesarItemsAdicionalesDesdeExcel(datos: any[]): void {
    if (!this.dataConsolidada) return;

    const nuevos: ItemAdicionalExcel[] = [];
    const errores: string[] = [];
    let ignorados = 0;

    // Map temporal para productos nuevos ya agregados en este ciclo
    const productosNuevosMap = new Map<string, ProductoConsolidado>();

    datos.forEach((fila, i) => {
      const codigo           = String(fila['CodigoProducto'] || fila['codigo']           || '').trim();
      const descripcion      = String(fila['Descripcion']    || fila['descripcion']       || '').trim();
      const proveedor        = String(fila['Proveedor']      || fila['proveedor']         || '').trim();
      const cantidadReq      = Number(fila['CantidadRequerida']  || 0);
      const cantidadOfe      = Number(fila['CantidadOfertada']   || 0);
      const precioUnitario   = Number(fila['PrecioUnitario']     || 0);
      const unidad           = String(fila['Unidad']             || '').trim();
      const observaciones    = String(fila['Observaciones']      || '').trim();

      if (!codigo || !proveedor) {
        errores.push(`Fila ${i + 2}: CodigoProducto y Proveedor son obligatorios.`);
        return;
      }

      const detalleNuevo = {
        detalleCotizacionId: 0,
        cotizacionId: 0,
        cantidadRequerida: cantidadReq,
        proveedor,
        cantidadOfertada: cantidadOfe,
        precioUnitario,
        cantidadAsignada: null,
        observaciones
      };

      // ¿Ya existe el producto en la cotización actual?
      const prodExistente = this.dataConsolidada!.productos.find(
        p => p.codigo.toLowerCase() === codigo.toLowerCase()
      );

      if (prodExistente) {
        // ¿Ya cotizó ese proveedor para ese producto?
        const detExistente = prodExistente.detallesAsociados.find(
          d => d.proveedor.toLowerCase() === proveedor.toLowerCase()
        );
        if (detExistente) { ignorados++; return; }
        // Proveedor nuevo para producto existente → agregar detalle
        prodExistente.detallesAsociados.push(detalleNuevo);
      } else {
        // Producto completamente nuevo
        const clave = codigo.toLowerCase();
        if (!productosNuevosMap.has(clave)) {
          const prodNuevo: ProductoConsolidado = {
            codigo,
            nuevoCodigo: '',
            descripcion: descripcion || 'Sin descripción',
            cantidadTotal: cantidadReq,
            unidad,
            esNuevo: true,
            detallesAsociados: [detalleNuevo]
          };
          productosNuevosMap.set(clave, prodNuevo);
          this.dataConsolidada!.productos.push(prodNuevo);
        } else {
          // Mismo producto nuevo con otro proveedor en el Excel
          productosNuevosMap.get(clave)!.detallesAsociados.push(detalleNuevo);
        }
      }

      // Registrar proveedor nuevo en el mapa de decisiones
      if (!this.accionesPorProveedor.has(proveedor)) {
        this.proveedoresUnicos.push(proveedor);
        this.proveedoresUnicos.sort();
        this.accionesPorProveedor.set(proveedor, null);
      }

      nuevos.push({ codigoProducto: codigo, descripcion, proveedor,
                    cantidadRequerida: cantidadReq, cantidadOfertada: cantidadOfe,
                    precioUnitario, unidad, observaciones });
    });

    if (nuevos.length) {
      this.itemsAdicionalesExcel.push(...nuevos);
      this.hayItemsNuevos = true;
      const msg = `📋 ${nuevos.length} item(s) adicionales cargados — se guardarán en BD al confirmar.`
                + (ignorados ? ` (${ignorados} ignorados por ya existir).` : '');
      this.successMessage = (this.successMessage ? this.successMessage + '\n' : '') + msg;
    }
    if (errores.length) {
      this.errorMessage = `⚠️ ${errores.length} errores en items adicionales:\n${errores.slice(0, 5).join('\n')}`;
    }
  }

  // ─── Item adicional manual ────────────────────────────────────────────────────

  toggleFormManual(): void {
    this.mostrarFormManual = !this.mostrarFormManual;
    if (this.mostrarFormManual) this.resetFormManual();
  }

  resetFormManual(): void {
    this.formManual = { codigo: '', descripcion: '', cantidad: 0 };
  }

  /**
   * Guarda el item inmediatamente en BD en TODAS las cotizaciones de proveedores
   * que aún están en estado Solicitada (las que están visibles en la tabla).
   * Luego lo muestra en la tabla para que pueda ser asignado.
   */
  agregarItemManual(): void {
    if (!this.dataConsolidada) return;

    const codigo      = this.formManual.codigo.trim();
    const descripcion = this.formManual.descripcion.trim() || 'Sin descripción';
    const cantidad    = this.formManual.cantidad || 0;

    if (!codigo) {
      this.errorMessage = '⚠️ El Código es obligatorio.';
      return;
    }
    if (cantidad <= 0) {
      this.errorMessage = '⚠️ La Cantidad debe ser mayor a 0.';
      return;
    }

    // Obtener los cotizacionIds únicos de proveedores visibles (estado Solicitada)
    const cotizacionIds = Array.from(
      new Set(
        this.dataConsolidada.productos
          .flatMap(p => p.detallesAsociados)
          .map(d => d.cotizacionId)
          .filter(id => id > 0)
      )
    );

    if (!cotizacionIds.length) {
      this.errorMessage = '⚠️ No hay cotizaciones en estado Solicitada para agregar el item.';
      return;
    }

    // Construir payload: un registro por cada cotización (proveedor)
    const proveedoresPorCoti = new Map<number, string>();
    this.dataConsolidada.productos.forEach(p =>
      p.detallesAsociados.forEach(d => {
        if (d.cotizacionId > 0) proveedoresPorCoti.set(d.cotizacionId, d.proveedor);
      })
    );

    // Payload correcto para el endpoint agregar-item-adicional
    // que inserta directamente en detallescotizacion
    const payload = cotizacionIds.map(cotId => ({
      cotizacionId: cotId,
      codigo,
      descripcion,
      cantidad,
      unidad:       '',
      precio:       0,
      observaciones: ''
    }));

    this.guardandoItemManual = true;
    this.errorMessage = null;

    this.cotiGeneralService.agregarItemsADetalleCotizacion(payload).subscribe({
      next: (res: any) => {
        this.guardandoItemManual = false;
        this.successMessage = `✅ Item "${codigo}" agregado a ${cotizacionIds.length} cotización(es). Recargando tabla...`;
        this.resetFormManual();
        this.loadConsolidatedData(this.cotigeneralId);
      },
      error: err => {
        this.guardandoItemManual = false;
        this.errorMessage = err?.error?.message || err?.error || err?.message || 'Error al guardar el item.';
      }
    });
  }

  // ─── Eliminar items ───────────────────────────────────────────────────────────

  /**
   * Activa/desactiva el modo selección múltiple desde el ícono de la cabecera.
   * Al desactivar, limpia los checkboxes seleccionados.
   */
  toggleModoSeleccion(): void {
    this.modoSeleccion = !this.modoSeleccion;
    if (!this.modoSeleccion) this.itemsSeleccionados.clear();
  }

  /**
   * En modo selección múltiple, marca/desmarca TODOS los detalleCotizacionId
   * del producto (uno por cada cotización/proveedor en que aparece).
   */
  toggleSeleccionItem(producto: ProductoConsolidado): void {
    const ids = producto.detallesAsociados
      .map(d => d.detalleCotizacionId)
      .filter(id => id > 0);

    // Si todos ya están seleccionados → deseleccionar; si no → seleccionar todos
    const todosSeleccionados = ids.every(id => this.itemsSeleccionados.has(id));
    ids.forEach(id => {
      if (todosSeleccionados) this.itemsSeleccionados.delete(id);
      else this.itemsSeleccionados.add(id);
    });
  }

  isItemSeleccionado(producto: ProductoConsolidado): boolean {
    return producto.detallesAsociados
      .filter(d => d.detalleCotizacionId > 0)
      .every(d => this.itemsSeleccionados.has(d.detalleCotizacionId));
  }

  hayItemsSeleccionados(): boolean {
    return this.itemsSeleccionados.size > 0;
  }

  /**
   * Elimina UN solo detalle directamente desde el ícono de papelera de la fila.
   */
  /**
   * Elimina el producto de TODAS las cotizaciones en las que fue registrado.
   * Recolecta todos los detalleCotizacionId del producto y los manda en un
   * solo DELETE bulk, independientemente de cuántos proveedores haya.
   */
  eliminarItem(producto: ProductoConsolidado): void {
    if (producto.esNuevo) {
      this.errorMessage = '⚠️ Este item es nuevo y aún no está en la base de datos. Use "Quitar items nuevos".';
      return;
    }

    // Recolectar todos los IDs reales (> 0) del producto en todas las cotizaciones
    const ids = producto.detallesAsociados
      .map(d => d.detalleCotizacionId)
      .filter(id => id > 0);

    if (!ids.length) {
      this.errorMessage = '⚠️ No se encontraron detalles válidos para eliminar.';
      return;
    }

    const enCuantas = ids.length === 1
      ? '1 cotización'
      : `${ids.length} cotizaciones`;

    if (!confirm(`¿Eliminar "${producto.codigo}" de ${enCuantas}? Esta acción no se puede deshacer.`)) return;

    this.eliminando = true;
    this.errorMessage = null;

    // Si es solo uno usamos el endpoint individual, si son varios el bulk
    const operacion$ = ids.length === 1
      ? this.cotiGeneralService.eliminarDetalleCotizacion(ids[0])
      : this.cotiGeneralService.eliminarDetallesBulk(ids);

    operacion$.subscribe({
      next: () => {
        this.eliminando = false;
        this.successMessage = `✅ "${producto.codigo}" eliminado de ${enCuantas} correctamente.`;
        this.loadConsolidatedData(this.cotigeneralId);
      },
      error: err => {
        this.eliminando = false;
        this.errorMessage = err?.error?.message || err?.error || err?.message || 'Error al eliminar.';
      }
    });
  }

  /**
   * Elimina en bulk los detalles seleccionados. Se dispara desde el ícono
   * de confirmación que aparece en la cabecera cuando hay items seleccionados.
   */
  eliminarItemsSeleccionados(): void {
    if (!this.itemsSeleccionados.size) return;
    const ids = Array.from(this.itemsSeleccionados);
    if (!confirm(`¿Eliminar ${ids.length} detalle(s) seleccionado(s)? Esta acción no se puede deshacer.`)) return;

    this.eliminando = true;
    this.errorMessage = null;

    this.cotiGeneralService.eliminarDetallesBulk(ids).subscribe({
      next: () => {
        this.eliminando = false;
        this.successMessage = `✅ ${ids.length} detalle(s) eliminado(s) correctamente.`;
        this.itemsSeleccionados.clear();
        this.modoSeleccion = false;
        this.loadConsolidatedData(this.cotigeneralId);
      },
      error: err => {
        this.eliminando = false;
        this.errorMessage = err?.error?.message || err?.error || err?.message || 'Error al eliminar los detalles.';
      }
    });
  }

  /** Descargar plantilla simplificada (solo Código, Descripción, Cantidad) */
  descargarPlantillaAdicionales(): void {
    const plantilla = [
      { CodigoProducto: 'EJEMPLO-001', Descripcion: 'Descripción del producto', CantidadRequerida: 10 },
      { CodigoProducto: 'EJEMPLO-002', Descripcion: 'Otro producto',            CantidadRequerida: 5  },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(plantilla), 'ItemsAdicionales');
    const instrucciones = [
      { Instruccion: 'Columna CodigoProducto: código del producto (OBLIGATORIO).' },
      { Instruccion: 'Columna Descripcion: descripción en español del producto.' },
      { Instruccion: 'Columna CantidadRequerida: cantidad que se necesita (OBLIGATORIO, mayor a 0).' },
      { Instruccion: 'El item se agregará a TODAS las cotizaciones de proveedores en estado Solicitada.' },
      { Instruccion: 'NO modifique los encabezados de columna.' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instrucciones), 'Instrucciones');
    XLSX.writeFile(wb, `Plantilla_ItemsAdicionales_${this.cotigeneralId}.xlsx`);
  }
}