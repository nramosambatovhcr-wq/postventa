import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import {
  InventarioConsolidadoService,
  InventarioConsolidadoDto,
  TiempoEntregaItem,
  TiempoEntregaBatchRequest,
  CantidadMinimaItem,
  CantidadMinimaBatchRequest,
  TiempoEntregaResponse,
  CantidadMinimaResponse
} from 'src/app/services/inventario-consolidado.service';

@Component({
  selector: 'app-listaproducto',
  templateUrl: './listaproducto.component.html',
  styleUrls: ['./listaproducto.component.css']
})
export class ListaproductoComponent implements OnInit {
  @ViewChild('tabla', { static: false }) tabla!: ElementRef<HTMLTableElement>;

  inventario: InventarioConsolidadoDto[] = [];
  filtrado:   InventarioConsolidadoDto[] = [];
  currentIndex = -1;
  currentItem: InventarioConsolidadoDto | null = null;

  clasesIds: string[] = [];
  gruposIds: string[] = [];

  filtro = {
    codigo:      '',
    descripcion: '',
    claseId:     '',
    grupoId:     ''
  };

  usuario  = 'USUARIO_FRONT';
  cargando = true;

  // ── Valores masivos (solo afectan la vista, no guardan aún) ──
  bulkTiempo:   number | null = null;
  bulkCantidad: number | null = null;

  // ── Feedback visual para la barra masiva ──
  bulkMsg     = '';
  bulkMsgType = 'bulk-ok';
  private bulkMsgTimer: any;

  /* mapas para lookup rápido */
  private tiemposMap = new Map<string, number>();
  private minimosMap = new Map<string, number>();

  constructor(private svc: InventarioConsolidadoService) {}

  ngOnInit(): void {
    this.cargar();
  }

  // ── CARGA INICIAL ─────────────────────────────────────────────
  cargar(): void {
    this.cargando = true;
    this.svc.getCompleto(undefined, undefined, undefined, 1, -1)
      .subscribe(res => {
        this.inventario = res.data;
        this.clasesIds  = [...new Set(this.inventario.map(i => i.claseId))].sort();
        this.gruposIds  = [...new Set(this.inventario.map(i => i.grupoId))].sort();
        this.mergeTiemposYMinimos();
      });
  }

  // ── REFRESCAR ─────────────────────────────────────────────────
  refrescar(): void {
    this.svc.refrescarVista().subscribe(() => this.cargar());
  }

  // ── MERGE DATOS POSTGRES ──────────────────────────────────────
  private mergeTiemposYMinimos(): void {
    this.svc.getAllTiemposEntrega().subscribe(res => {
      this.tiemposMap.clear();
      res.data.forEach(t => this.tiemposMap.set(t.articulo, t.tiempoEntrega));
      this.applyMergedValues();
    });

    this.svc.getAllCantidadesMinimas().subscribe(res => {
      this.minimosMap.clear();
      res.data.forEach(m => this.minimosMap.set(m.articulo, m.cantidadMinima));
      this.applyMergedValues();
    });
  }

  private applyMergedValues(): void {
    this.inventario.forEach(item => {
      item.tiempoEntrega  = this.tiemposMap.get(item.codigoArticulo) ?? 180;
      item.cantidadMinima = this.minimosMap.get(item.codigoArticulo) ?? 0;
    });
    this.aplicarFiltros();
    this.cargando = false;
  }

  // ── FILTROS ───────────────────────────────────────────────────
  aplicarFiltros(): void {
    const f = this.filtro;
    this.filtrado = this.inventario.filter(item =>
      item.codigoArticulo.toLowerCase().includes(f.codigo.toLowerCase())      &&
      item.descripcion.toLowerCase().includes(f.descripcion.toLowerCase())    &&
      (f.claseId === '' || item.claseId === f.claseId)                        &&
      (f.grupoId === '' || item.grupoId === f.grupoId)
    );
    this.currentIndex = -1;
    this.currentItem  = null;
  }

  /** Devuelve true si hay algún filtro activo */
  hayFiltroActivo(): boolean {
    return !!(
      this.filtro.codigo      ||
      this.filtro.descripcion ||
      this.filtro.claseId     ||
      this.filtro.grupoId
    );
  }

  // ── APLICAR MASIVO EN PANTALLA (sin guardar) ──────────────────

  /**
   * Escribe bulkTiempo en el campo tiempoEntrega de todos los ítems
   * del array `filtrado` (que ya respeta el filtro activo).
   * NO llama al backend — el usuario debe presionar "Guardar Tiempos (Lote)".
   */
  aplicarTiempoMasivo(): void {
    if (this.bulkTiempo === null || this.bulkTiempo < 0) {
      this.mostrarMsg('⚠ Ingresa un valor válido para el tiempo de entrega.', 'bulk-warn');
      return;
    }
    const valor = this.bulkTiempo;
    this.filtrado.forEach(item => { item.tiempoEntrega = valor; });
    this.mostrarMsg(
      `✔ Tiempo de entrega establecido en ${valor} día(s) para ${this.filtrado.length} artículo(s). Recuerda guardar.`,
      'bulk-ok'
    );
  }

  /**
   * Escribe bulkCantidad en el campo cantidadMinima de todos los ítems
   * del array `filtrado`.
   * NO llama al backend.
   */
  aplicarCantidadMasiva(): void {
    if (this.bulkCantidad === null || this.bulkCantidad < 0) {
      this.mostrarMsg('⚠ Ingresa un valor válido para la cantidad mínima.', 'bulk-warn');
      return;
    }
    const valor = this.bulkCantidad;
    this.filtrado.forEach(item => { item.cantidadMinima = valor; });
    this.mostrarMsg(
      `✔ Cantidad mínima establecida en ${valor} para ${this.filtrado.length} artículo(s). Recuerda guardar.`,
      'bulk-ok'
    );
  }

  /** Muestra un mensaje temporal en la barra masiva */
  private mostrarMsg(msg: string, tipo: 'bulk-ok' | 'bulk-warn'): void {
    this.bulkMsg     = msg;
    this.bulkMsgType = tipo;
    clearTimeout(this.bulkMsgTimer);
    this.bulkMsgTimer = setTimeout(() => { this.bulkMsg = ''; }, 4000);
  }

  // ── GUARDADOS INDIVIDUALES ────────────────────────────────────
  guardarTiempoIndividual(item: InventarioConsolidadoDto): void {
    this.svc.actualizarTiempoEntrega(item.codigoArticulo, {
      tiempoEntrega: item.tiempoEntrega ?? 180,
      usuario: this.usuario
    }).subscribe(() => alert(`Tiempo actualizado para ${item.codigoArticulo}`));
  }

  guardarCantidadMinimaIndividual(item: InventarioConsolidadoDto): void {
    this.svc.actualizarCantidadMinima(item.codigoArticulo, {
      cantidadMinima: item.cantidadMinima ?? 0,
      usuario: this.usuario
    }).subscribe(() => alert(`Cantidad mínima actualizada para ${item.codigoArticulo}`));
  }

  // ── GUARDADOS EN LOTE ─────────────────────────────────────────
  guardarTiemposLote(): void {
    const articulos: TiempoEntregaItem[] = this.filtrado
      .map(i => ({ codigoArticulo: i.codigoArticulo, tiempoEntrega: i.tiempoEntrega ?? 180 }));
    if (!articulos.length) return;
    const request: TiempoEntregaBatchRequest = { articulos, usuario: this.usuario };
    this.svc.actualizarTiemposEntregaLote(request).subscribe(res => alert(res.message));
  }

  guardarCantidadesMinimasLote(): void {
    const articulos: CantidadMinimaItem[] = this.filtrado
      .map(i => ({ codigoArticulo: i.codigoArticulo, cantidadMinima: i.cantidadMinima ?? 0 }));
    if (!articulos.length) return;
    const request: CantidadMinimaBatchRequest = { articulos, usuario: this.usuario };
    this.svc.actualizarCantidadesMinimasLote(request).subscribe(res => alert(res.message));
  }

  // ── SELECCIONAR FILA ──────────────────────────────────────────
  seleccionar(index: number): void {
    this.currentIndex = index;
    this.currentItem  = this.filtrado[index];
  }

  // ── EXCEL ─────────────────────────────────────────────────────
  descargarExcel(): void {
    const table    = this.tabla.nativeElement;
    const html     = table.outerHTML;
    const uri      = 'data:application/vnd.ms-excel;base64,';
    const template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/><title>Export</title></head><body>{table}</body></html>';
    const base64   = (s: string) => window.btoa(unescape(encodeURIComponent(s)));
    const format   = (s: string, c: any) => s.replace(/{(\w+)}/g, (_, k) => c[k]);
    const link     = document.createElement('a');
    link.href      = uri + base64(format(template, { table: html }));
    link.download  = 'inventario_consolidado.xls';
    link.click();
  }
}