import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { forkJoin, of, Subject }                      from 'rxjs';
import { catchError, takeUntil }                      from 'rxjs/operators';
import { Router }                                     from '@angular/router';
import * as XLSX from 'xlsx';
 
import { AuthService } from 'src/app/services/auth.service';
import { Usuario }     from 'src/app/models/usuario';
import {
  RepuestoDanado,
  ImagenRepuesto,
  RepuestosdanadosService
} from 'src/app/services/repuestosdanados.service';
 
// ─────────────────────────────────────────────────────────────────────────────
//  MAPA ROL → CLASES
//  Para agregar un nuevo rol o cambiar sus clases, solo modifica este objeto.
// ─────────────────────────────────────────────────────────────────────────────
const ROL_CLASES: Record<string, string[]> = {
  repuestos:    ['IR02SNCA'],
  repuestoslv:  ['IR07KYTN', 'IR03SNSV', 'IR04SNPK'],
  repuestoslk:  ['IR01LYNK'],
  repuestoslsc: ['IR05SNWD', 'IR06CASE'],
  laboratorio1: ['IR02SNCA'],
  laboratorio2: ['IR02SNCA'],
  admin:        ['IR02SNCA', 'IR07KYTN', 'IR03SNSV', 'IR04SNPK',
                 'IR01LYNK', 'IR05SNWD', 'IR06CASE'],
};
 
const ROL_ETIQUETA: Record<string, string> = {
  repuestos:    'Repuestos General',
  repuestoslv:  'Repuestos LV',
  repuestoslk:  'Repuestos LK',
  repuestoslsc: 'Repuestos LSC',
  laboratorio1: 'Laboratorio 1',
  laboratorio2: 'Laboratorio 2',
  admin:        'Administrador',
};
 
// ─────────────────────────────────────────────────────────────────────────────
//  Interfaces locales
// ─────────────────────────────────────────────────────────────────────────────
 
interface ItemConDescuento {
  registro:  RepuestoDanado;
  descuento: number;   // porcentaje 0–100
}
 
interface FiltroProveedor {
  codigoArticulo: string;
  agenciaId:      string;
  severidad:      string;
  estado:         string;
}
@Component({
  selector: 'app-repuestosdnadosclase',
  templateUrl: './repuestosdnadosclase.component.html',
  styleUrls: ['./repuestosdnadosclase.component.css']
})
export class RepuestosdnadosclaseComponent implements OnInit, OnDestroy {
 
  // ── Usuario / rol ─────────────────────────
  usuario:       Usuario | null = null;
  rolActivo      = '';
  clasesActivas: string[] = [];   // clases que le corresponden al rol
 
  // ── Data ──────────────────────────────────
  items:            ItemConDescuento[] = [];
  itemsFiltrados:   ItemConDescuento[] = [];
  imagenesRegistro: ImagenRepuesto[]   = [];
  registroActivo:   RepuestoDanado | null = null;
 
  // ── UI ────────────────────────────────────
  loading   = false;
  cargado   = false;
  sinAcceso = false;   // rol sin clases asignadas en el mapa
 
  // ── Modales ───────────────────────────────
  modalDetalleVisible  = false;
  modalImagenesVisible = false;

  // ── Lightbox ──────────────────────────────
  lightboxVisible  = false;
  lightboxImagenes: ImagenRepuesto[] = [];
  lightboxIndex    = 0;
 
  // ── Filtros locales ───────────────────────
  filtro: FiltroProveedor = {
    codigoArticulo: '', agenciaId: '', severidad: '', estado: ''
  };
 
  // ── Catálogos ─────────────────────────────
  readonly severidadOpciones = ['Leve', 'Moderado', 'Grave', 'Irreparable'] as const;
  readonly estadosOpciones   = [
    'Pendiente', 'En Revisión', 'En Garantía',
    'Desechado', 'Reparado', 'Devuelto'
  ] as const;
 
  // ── Descuento global ──────────────────────
  descuentoGlobal      = 0;
  guardandoDescuentos  = false;   // spinner del botón guardar
  descuentosGuardados  = false;   // feedback ✓ tras guardar exitoso
 
  private destroy$         = new Subject<void>();
  private readonly apiBase = 'https://bodega.vehicentro.com:1830/api';
 
  constructor(
    private repuestosService: RepuestosdanadosService,
    private authService:      AuthService,
    private router:           Router
  ) {}
 
  // ─────────────────────────────────────────────────────────────────────────
  //  ngOnInit — detecta el rol del usuario y lanza la carga automáticamente
  // ─────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.authService.usuarioActual$
      .pipe(takeUntil(this.destroy$))
      .subscribe(usuario => {
        this.usuario = usuario;
        if (!usuario) { this.router.navigate(['/login']); return; }
 
        // Lee el campo de rol — ajusta el nombre del campo si difiere en tu modelo
        this.rolActivo = (
          (usuario as any).rol      ??
          (usuario as any).perfil   ??
          (usuario as any).role     ??
          ''
        ).toLowerCase();
 
        // Resuelve las clases que le corresponden según el mapa
        this.clasesActivas = ROL_CLASES[this.rolActivo] ?? [];
 
        if (this.clasesActivas.length === 0) {
          this.sinAcceso = true;
          return;
        }
 
        this.cargarDatos();
      });
  }
 
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
 
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    // El lightbox tiene prioridad máxima sobre cualquier modal
    if (this.lightboxVisible) {
      if (e.key === 'ArrowLeft')  { this.lightboxAnterior(); return; }
      if (e.key === 'ArrowRight') { this.lightboxSiguiente(); return; }
      if (e.key === 'Escape')     { this.cerrarLightbox();   return; }
      return;
    }
    if (e.key !== 'Escape') return;
    if (this.modalImagenesVisible) { this.modalImagenesVisible = false; return; }
    if (this.modalDetalleVisible)  { this.modalDetalleVisible  = false; }
  }
 
  // ─────────────────────────────────────────────────────────────────────────
  //  CARGA AUTOMÁTICA
  //  Se lanza una petición por cada clase en paralelo (forkJoin).
  //  Un 404 en una clase no cancela las demás (catchError → []).
  //  Al final se aplaná, deduplica por id y ordena por fecha desc.
  // ─────────────────────────────────────────────────────────────────────────
  cargarDatos(): void {
    this.loading = true;
    this.cargado = false;
    this.items   = [];
 
    const peticiones$ = this.clasesActivas.map(clase =>
      this.repuestosService.getRepuestosPorProveedor(clase).pipe(
        catchError(() => of([] as RepuestoDanado[]))
      )
    );
 
    forkJoin(peticiones$)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultados) => {
          // Aplanar resultados de todas las clases
          const todos = resultados.flat();
 
          // Deduplicar por id (por si dos clases devuelven el mismo registro)
          const vistos = new Set<number>();
          const unicos = todos.filter(r => {
            if (vistos.has(r.id)) return false;
            vistos.add(r.id);
            return true;
          });
 
          // Ordenar: más recientes primero
          unicos.sort((a, b) =>
            new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime()
          );
 
          this.items   = unicos.map(r => ({ registro: r, descuento: r.descuento ?? 0 }));
          this.loading = false;
          this.cargado = true;
          this.limpiarFiltros();
        },
        error: () => {
          this.loading = false;
          this.cargado = true;
        }
      });
  }
 
  // ──────────────────────────────────────────
  //  FILTROS LOCALES
  // ──────────────────────────────────────────
 
  aplicarFiltros(): void {
    const f = this.filtro;
    this.itemsFiltrados = this.items.filter(({ registro: r }) => {
      if (f.codigoArticulo &&
          !r.codigo_articulo.toLowerCase().includes(f.codigoArticulo.toLowerCase())) return false;
      if (f.agenciaId && String(r.agencia_id) !== f.agenciaId) return false;
      if (f.severidad  && r.severidad !== f.severidad) return false;
      if (f.estado     && r.estado    !== f.estado)    return false;
      return true;
    });
  }
 
  limpiarFiltros(): void {
    this.filtro         = { codigoArticulo: '', agenciaId: '', severidad: '', estado: '' };
    this.itemsFiltrados = [...this.items];
  }
 
  // ──────────────────────────────────────────
  //  DESCUENTOS
  // ──────────────────────────────────────────
 
  aplicarDescuentoGlobal(): void {
    const d = Math.min(100, Math.max(0, this.descuentoGlobal || 0));
    // Aplica a todos los items (filtrados y sin filtrar comparten referencia de objeto)
    this.items.forEach(item => item.descuento = d);
    this.descuentosGuardados = false;
  }

  limpiarDescuentos(): void {
    this.descuentoGlobal     = 0;
    this.descuentosGuardados = false;
    this.items.forEach(item => item.descuento = 0);
  }

  /** True cuando algún ítem tiene un descuento distinto al que tiene guardado en BD */
  get hayDescuentosPendientes(): boolean {
    return this.items.some(i => i.descuento !== (i.registro.descuento ?? 0));
  }

  /**
   * Envía todos los ítems al endpoint PATCH /descuentos/lote.
   * Incluye los que tienen descuento 0 para poder borrar descuentos previos.
   */
  guardarDescuentosLote(): void {
    if (this.guardandoDescuentos) return;
    this.guardandoDescuentos = false;
    this.descuentosGuardados = false;

    const payload = this.items.map(i => ({
      id:        i.registro.id,
      descuento: i.descuento
    }));

    this.guardandoDescuentos = true;

    this.repuestosService
      .guardarDescuentosLote(payload, this.usuario?.nombreUsuario)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Sincronizar el valor guardado en el registro para que
          // hayDescuentosPendientes vuelva a false
          this.items.forEach(i => {
            (i.registro as any).descuento = i.descuento;
          });
          this.guardandoDescuentos = false;
          this.descuentosGuardados = true;
          // Ocultar el ✓ tras 3 segundos
          setTimeout(() => { this.descuentosGuardados = false; }, 3000);
        },
        error: (err) => {
          this.guardandoDescuentos = false;
          alert(err.error?.mensaje ?? 'Error al guardar los descuentos.');
        }
      });
  }
 
  // ──────────────────────────────────────────
  //  CÁLCULOS
  // ──────────────────────────────────────────
 
  costoConDescuento(item: ItemConDescuento): number {
    const base = item.registro.costo_promedio ?? 0;
    return base - (base * ((item.descuento || 0) / 100));
  }
 
  get totalCostoBase(): number {
    return this.itemsFiltrados.reduce(
      (s, i) => s + (i.registro.costo_promedio ?? 0), 0
    );
  }
 
  get totalDescuento(): number {
    return this.itemsFiltrados.reduce((s, i) => {
      const b = i.registro.costo_promedio ?? 0;
      return s + (b * ((i.descuento || 0) / 100));
    }, 0);
  }
 
  get totalNeto(): number { return this.totalCostoBase - this.totalDescuento; }
 
  contarPorSeveridad(sev: string): number {
    return this.itemsFiltrados.filter(i => i.registro.severidad === sev).length;
  }
 
  get agenciasUnicas(): string[] {
    return [...new Set(this.items.map(i => String(i.registro.agencia_id)))].sort();
  }
 
  // Etiqueta legible del rol para el banner
  get etiquetaRol(): string {
    return ROL_ETIQUETA[this.rolActivo] ?? this.rolActivo;
  }
 
  // ──────────────────────────────────────────
  //  DETALLE (solo lectura)
  // ──────────────────────────────────────────
 
  verDetalle(reg: RepuestoDanado): void {
    this.repuestosService.getRepuestoCompleto(reg.id).subscribe({
      next:  (c) => { this.registroActivo = c;   this.modalDetalleVisible = true; },
      error: ()  => { this.registroActivo = reg; this.modalDetalleVisible = true; }
    });
  }
 
  // ──────────────────────────────────────────
  //  IMÁGENES (solo lectura)
  // ──────────────────────────────────────────
 
  abrirImagenes(reg: RepuestoDanado): void {
    this.registroActivo   = reg;
    this.imagenesRegistro = [];
    this.repuestosService.getImagenes(reg.id).subscribe({
      next: (imgs) => { this.imagenesRegistro = imgs; },
      error: ()    => {}
    });
    this.modalImagenesVisible = true;
  }
 
  getImagenUrl(img: ImagenRepuesto): string {
    if (!this.registroActivo) return '';
    const { severidad, id } = this.registroActivo;
    return `${this.apiBase}/api/repuestosdanadosvhcr/imagen/${severidad}/${id}/${img.ruta_archivo}`;
  }
 
  // ──────────────────────────────────────────
  //  LIGHTBOX — visor inline con navegación
  // ──────────────────────────────────────────

  /** Imagen actualmente visible en el lightbox */
  get lightboxImagenActual(): ImagenRepuesto | null {
    return this.lightboxImagenes[this.lightboxIndex] ?? null;
  }

  /** Abre el lightbox con el array de imágenes dado, posicionado en el índice */
  abrirLightbox(imagenes: ImagenRepuesto[], index: number): void {
    this.lightboxImagenes = imagenes;
    this.lightboxIndex    = Math.max(0, Math.min(index, imagenes.length - 1));
    this.lightboxVisible  = true;
  }

  cerrarLightbox(): void { this.lightboxVisible = false; }

  lightboxAnterior(): void {
    if (this.lightboxIndex > 0) this.lightboxIndex--;
  }

  lightboxSiguiente(): void {
    if (this.lightboxIndex < this.lightboxImagenes.length - 1) this.lightboxIndex++;
  }
 
  // ──────────────────────────────────────────
  //  EXPORTAR EXCEL
  // ──────────────────────────────────────────
 
  exportarExcel(): void {
    const datos = this.itemsFiltrados.map((item, i) => ({
      'Item':                 i + 1,
      'Agencia':              item.registro.agencia_id,
      'Código':               item.registro.codigo_articulo,
      'Artículo':             item.registro.nombre_articulo,
      'Tipo de Daño':         item.registro.tipo_dano,
      'Severidad':            item.registro.severidad,
      'Estado':               item.registro.estado,
      'Clase':                item.registro.proveedor ?? '',
      'Costo Promedio (USD)': item.registro.costo_promedio ?? 0,
      'Descuento (%)':        item.descuento,
      'Valor con Descuento':  +this.costoConDescuento(item).toFixed(2),
      'Fecha Registro':       new Date(item.registro.fecha_registro).toLocaleDateString('es-EC'),
      'Descripción Daño':     item.registro.descripcion_dano,
      'Observaciones':        item.registro.observaciones ?? ''
    }));
 
    // Fila de totales al final
    datos.push({
      'Item': '' as any, 'Agencia': '' as any, 'Código': '' as any,
      'Artículo': 'TOTALES' as any, 'Tipo de Daño': '' as any,
      'Severidad': '' as any, 'Estado': '' as any, 'Clase': '' as any,
      'Costo Promedio (USD)': +this.totalCostoBase.toFixed(2),
      'Descuento (%)': '' as any,
      'Valor con Descuento':  +this.totalNeto.toFixed(2),
      'Fecha Registro': '' as any, 'Descripción Daño': '' as any, 'Observaciones': '' as any
    });
 
    const ws  = XLSX.utils.json_to_sheet(datos);
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Repuestos');
    const buf  = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `repuestos-${this.rolActivo}-${new Date().toISOString().slice(0,10)}.xlsx`
    });
    a.click();
    URL.revokeObjectURL(url);
  }
 
  // ──────────────────────────────────────────
  //  HELPERS CSS
  // ──────────────────────────────────────────
 
  getSevClass = (s: string) =>
    ({ Leve:'sev-leve', Moderado:'sev-moderado', Grave:'sev-grave',
       Irreparable:'sev-irreparable' } as any)[s] ?? '';
 
  getEstadoClass = (e: string) =>
    ({ 'Pendiente':'est-pendiente','En Revisión':'est-revision','En Garantía':'est-garantia',
       Desechado:'est-desechado', Reparado:'est-reparado', Devuelto:'est-devuelto' } as any)[e] ?? '';
 
  getFilaClass = (s: string) =>
    ({ Leve:'fila-leve', Moderado:'fila-moderado', Grave:'fila-grave',
       Irreparable:'fila-irreparable' } as any)[s] ?? '';
}