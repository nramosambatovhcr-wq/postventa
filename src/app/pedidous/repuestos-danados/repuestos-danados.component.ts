import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';
import * as XLSX from 'xlsx';

import { OracleService, InventarioUnaAgenciaItem } from 'src/app/services/oracle.service';
import { RepuestoDanado, ImagenRepuesto, TipoDano, FiltrosRepuestos, EstadoRepuesto, RepuestosdanadosService } from 'src/app/services/repuestosdanados.service';

// ─────────────────────────────────────────────
//  Interfaces locales
// ─────────────────────────────────────────────

interface FormRegistro {
  id?:              number;
  agencia_id:       string;
  codigo_articulo:  string;
  nombre_articulo:  string;
  descripcion:      string;
  numero_serie:     string;
  unidad:           string;
  tipo_dano:        string;
  severidad:        string;
  descripcion_dano: string;
  ubicacion_dano:   string;
  ubicacion_fisica: string;
  orden_trabajo:    string;
  proveedor:        string;
  estado:           string;
  accion_tomada:    string;
  costo_promedio:   number | null;
  costo_reparacion: number | null;
  observaciones:    string;
}

interface ArchivoPreview {
  file:        File;
  preview:     string;
  descripcion: string;
}

interface FiltroState {
  busqueda:   string;
  estado:     string;
  severidad:  string;
  fechaDesde: string;
  fechaHasta: string;
}

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────

@Component({
  selector: 'app-repuestos-danados',
  templateUrl: './repuestos-danados.component.html',
  styleUrls: ['./repuestos-danados.component.css']
})
export class RepuestosDanadosComponent implements OnInit, OnDestroy {

  // ── Data ──────────────────────────────────
  registros:          RepuestoDanado[] = [];
  registrosFiltrados: RepuestoDanado[] = [];
  imagenesRegistro:   ImagenRepuesto[] = [];
  registroActivo:     RepuestoDanado | null = null;
  tiposDano:          TipoDano[] = [];

  // ── Estado UI ─────────────────────────────
  loading          = false;
  guardando        = false;
  subiendoImagenes = false;
  eliminando       = false;
  modoEdicion      = false;
  tabActiva: 'inventario' | 'registros' = 'inventario';

  // ── Modales ───────────────────────────────
  modalRegistroVisible = false;
  modalImagenesVisible = false;
  modalDetalleVisible  = false;

  // ── Dropdown estado ───────────────────────
  dropdownAbierto: number | 'detalle' | null = null;

  // ── Archivos subida ───────────────────────
  archivosParaSubir: ArchivoPreview[] = [];

  // ── Usuario / Agencia ─────────────────────
  usuario:   Usuario | null = null;
  agenciaId  = '1';

  // ── Catálogos ─────────────────────────────
  readonly severidadOpciones = ['Leve', 'Moderado', 'Grave', 'Irreparable'] as const;
  readonly estadosOpciones   = [
    'Pendiente', 'En Revisión', 'En Garantía',
    'Desechado', 'Reparado', 'Devuelto'
  ] as const;

  // ── Filtros tabla principal ────────────────
  filtro: FiltroState = {
    busqueda: '', estado: '', severidad: '', fechaDesde: '', fechaHasta: ''
  };

  // ── Formulario ────────────────────────────
  formRegistro: FormRegistro = this.formVacio();

  // ────────────────────────────────────────────────────────────────
  //  INVENTARIO ORACLE — CACHE POR AGENCIA
  // ────────────────────────────────────────────────────────────────

  /** Lista completa traída de Oracle (cacheada en sesión) */
  inventarioAgencia:    InventarioUnaAgenciaItem[] = [];
  /** Lista filtrada que se muestra en el panel */
  inventarioFiltrado:   InventarioUnaAgenciaItem[] = [];
  /** Artículo que el usuario seleccionó en el panel */
  articuloSeleccionado: InventarioUnaAgenciaItem | null = null;

  cargandoInventario   = false;
  errorInventario      = false;
  busquedaInventario   = '';

  /** Paginación local del panel de inventario */
  paginaInventario  = 1;
  readonly PAGE_INV = 20;

  /** CACHE: oficina para la cual ya cargamos inventario */
  private inventarioCacheOficina = '';

  private destroy$ = new Subject<void>();

  // ─────────────────────────────────────────
  constructor(
    private repuestosService: RepuestosdanadosService,
    private oracleService:    OracleService,
    private authService:      AuthService,
    private router:           Router
  ) {}

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (!usuario) { this.router.navigate(['/login']); return; }

      const nuevaAgencia = (usuario as any).idAgencia ;
      const nuevaOficina = nuevaAgencia;
      this.inventarioCacheOficina = nuevaOficina;

    /*  // Solo recargar inventario si cambió la agencia o no tenemos nada en caché
      if (nuevaOficina !== this.inventarioCacheOficina || this.inventarioAgencia.length === 0) {
        this.agenciaId = nuevaAgencia;
        this.inventarioAgencia = [];           // limpiar caché vieja
        this.inventarioCacheOficina = nuevaOficina;
        
      } else {
        // Misma agencia, solo refrescar filtros locales
        this.agenciaId = nuevaAgencia;
        this.aplicarFiltroInventario();
      }*/
      this.cargarInventarioAgencia();
      this.cargarTiposDano();
      this.cargarRegistros();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dropdownAbierto = null;
    if (this.modalRegistroVisible) return;
    if (this.modalImagenesVisible) this.cerrarModal('imagenes');
    if (this.modalDetalleVisible)  this.cerrarModal('detalle');
  }

  @HostListener('document:click')
  onDocumentClick(): void { this.dropdownAbierto = null; }

  // ──────────────────────────────────────────
  //  INVENTARIO ORACLE — carga ÚNICA por sesión
  // ──────────────────────────────────────────

  /**
   * Carga el inventario UNA SOLA VEZ por agencia.
   * El servicio OracleService.getInventarioAgenciaCompleto ya maneja
   * la paginación interna (múltiples requests page=1,2,3...).
   * Nosotros solo llamamos este método una vez.
   */
  private cargarInventarioAgencia(): void {
    this.errorInventario = false;

    // Si ya hay datos en caché no mostramos spinner: el usuario ve datos
    // inmediatamente mientras el refresco automático trabaja en background.
    this.cargandoInventario = !this.oracleService.tieneInventarioCacheado(this.inventarioCacheOficina);

    this.oracleService
      .getInventarioStream(this.inventarioCacheOficina)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          // El stream filtra el null centinela internamente, así que aquí
          // siempre llega una respuesta real del servidor → ocultar spinner.
          this.cargandoInventario = false;
          this.inventarioAgencia  = items;
          this.aplicarFiltroInventario();
        },
        error: () => {
          this.cargandoInventario = false;
          this.errorInventario    = true;
        }
      });
  }

  /** Filtra la lista por código, nombre o grupo */
  aplicarFiltroInventario(): void {
    const q = this.busquedaInventario.trim().toLowerCase();
    this.inventarioFiltrado = q
      ? this.inventarioAgencia.filter(i =>
          i.articulo.toLowerCase().includes(q) ||
          i.nombre.toLowerCase().includes(q)   ||
          i.grupo.toLowerCase().includes(q))
      : [...this.inventarioAgencia];
    this.paginaInventario = 1;
  }

  /** Filas visibles según la página actual */
  get inventarioPagina(): InventarioUnaAgenciaItem[] {
    const ini = (this.paginaInventario - 1) * this.PAGE_INV;
    return this.inventarioFiltrado.slice(ini, ini + this.PAGE_INV);
  }

  get totalPaginasInventario(): number {
    return Math.ceil(this.inventarioFiltrado.length / this.PAGE_INV);
  }

  /**
   * NUEVO FLUJO: selecciona un artículo desde la pantalla principal
   * y abre directamente el modal de nuevo registro pre-llenado.
   */
  seleccionarArticuloDesdePrincipal(item: InventarioUnaAgenciaItem): void {
    this.seleccionarArticulo(item);        // rellena el formulario
    this.abrirModalNuevoPrellenado();      // abre modal en modo nuevo
  }

  /**
   * Rellena el formulario con los datos del artículo Oracle.
   * Solo sobreescribe campos vacíos (no pisa lo que el usuario ya haya escrito).
   */
  seleccionarArticulo(item: InventarioUnaAgenciaItem): void {
    this.articuloSeleccionado        = item;
    this.formRegistro.codigo_articulo = item.articulo;
    this.formRegistro.nombre_articulo = item.nombre;
    this.formRegistro.proveedor = item.claseId;

    if (!this.formRegistro.descripcion.trim())
      this.formRegistro.descripcion = item.lineaCompetencia
        ? `Línea: ${item.lineaCompetencia} | Grupo: ${item.grupo}`
        : `Grupo: ${item.grupo}`;

    if (this.formRegistro.costo_promedio === null && item.costoPromedio != null)
      this.formRegistro.costo_promedio = Number(item.costoPromedio);
  }

  /** Limpia la selección y borra los campos que se rellenaron automáticamente */
  deseleccionarArticulo(): void {
    this.articuloSeleccionado         = null;
    this.formRegistro.codigo_articulo = '';
    this.formRegistro.nombre_articulo = '';
    this.formRegistro.descripcion     = '';
    this.formRegistro.costo_promedio  = null;
    this.formRegistro.proveedor  = '';

  }

  reintentarCargaInventario(): void {
    // Limpia caché y polling del servicio, luego vuelve a suscribirse
    this.oracleService.limpiarCacheInventario(this.inventarioCacheOficina);
    this.inventarioAgencia = [];
    this.cargarInventarioAgencia();
  }

  // ──────────────────────────────────────────
  //  CARGA DE DATOS
  // ──────────────────────────────────────────

  cargarRegistros(): void {
    this.loading = true;
    const filtros: FiltrosRepuestos = { agencia_id:  this.inventarioCacheOficina };
    if (this.filtro.estado)          filtros.estado          = this.filtro.estado as EstadoRepuesto;
    if (this.filtro.severidad)       filtros.severidad       = this.filtro.severidad as any;
    if (this.filtro.busqueda.trim()) filtros.codigo_articulo = this.filtro.busqueda.trim();

    this.repuestosService.getRepuestosDanados(filtros).subscribe({
      next: (data) => { this.registros = data; this.aplicarFiltrosLocales(); this.loading = false; },
      error: (err)  => { console.error('Error:', err); this.loading = false; }
    });
  }

  cargarTiposDano(): void {
    this.repuestosService.getTiposDano().subscribe({
      next:  (tipos) => { this.tiposDano = tipos; },
      error: () => {
        this.tiposDano = [
          'Golpe / Impacto','Rotura','Corrosión / Oxidación','Desgaste por uso',
          'Defecto de fabricación','Daño por humedad','Quemadura / Calor',
          'Contaminación','Falla eléctrica','Otro'
        ].map((nombre, id) => ({ id, nombre, activo: true }));
      }
    });
  }

  cargarImagenes(registroId: number): void {
    this.repuestosService.getImagenes(registroId).subscribe({
      next:  (imgs) => { this.imagenesRegistro = imgs; },
      error: (err)  => console.error('Error cargando imágenes:', err)
    });
  }

  // ──────────────────────────────────────────
  //  FILTROS TABLA PRINCIPAL
  // ──────────────────────────────────────────

  aplicarFiltros(): void { this.cargarRegistros(); }

  private aplicarFiltrosLocales(): void {
    let res = [...this.registros];

    // ── Solo mostrar registros del usuario logueado ──
    const nombreUsuario = this.usuario?.idagencia ?? '';
    if (nombreUsuario) {
      res = res.filter(r => r.agencia_id === nombreUsuario);
    }

    if (this.filtro.fechaDesde) {
      const desde = new Date(this.filtro.fechaDesde);
      res = res.filter(r => new Date(r.fecha_registro) >= desde);
    }
    if (this.filtro.fechaHasta) {
      const hasta = new Date(this.filtro.fechaHasta);
      hasta.setHours(23, 59, 59);
      res = res.filter(r => new Date(r.fecha_registro) <= hasta);
    }
    this.registrosFiltrados = res;
  }

  limpiarFiltros(): void {
    this.filtro = { busqueda: '', estado: '', severidad: '', fechaDesde: '', fechaHasta: '' };
    this.cargarRegistros();
  }

  contarPorEstado(estado: string): number {
    const nombreUsuario = this.usuario?.nombreUsuario ?? '';
    return this.registros.filter(r =>
      r.estado === estado &&
      (!nombreUsuario || r.usuario_registro === nombreUsuario)
    ).length;
  }

  // ──────────────────────────────────────────
  //  MODALES
  // ──────────────────────────────────────────

  abrirModal(modal: 'registro' | 'imagenes' | 'detalle'): void {
    this.modalRegistroVisible = modal === 'registro';
    this.modalImagenesVisible = modal === 'imagenes';
    this.modalDetalleVisible  = modal === 'detalle';
    document.body.style.overflow = 'hidden';
  }

  cerrarModal(modal: 'registro' | 'imagenes' | 'detalle'): void {
    if (modal === 'registro') {
      this.modalRegistroVisible   = false;
      this.articuloSeleccionado   = null;
      this.busquedaInventario     = '';
    }
    if (modal === 'imagenes') this.modalImagenesVisible = false;
    if (modal === 'detalle')  this.modalDetalleVisible  = false;
    if (!this.modalRegistroVisible && !this.modalImagenesVisible && !this.modalDetalleVisible)
      document.body.style.overflow = '';
  }

  cerrarPorOverlay(modal: 'imagenes' | 'detalle', event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('overlay'))
      this.cerrarModal(modal);
  }

  // ──────────────────────────────────────────
  //  CRUD: CREAR / EDITAR — SIN llamadas a inventario
  // ──────────────────────────────────────────

  /** Abre modal vacío para registro manual (sin artículo pre-seleccionado) */
  abrirModalNuevoVacio(): void {
    this.modoEdicion            = false;
    this.formRegistro           = this.formVacio();
    this.articuloSeleccionado   = null;
    this.abrirModal('registro');
  }

  /** Abre modal nuevo con datos pre-llenados desde el inventario */
  private abrirModalNuevoPrellenado(): void {
    this.modoEdicion            = false;
    // formRegistro ya fue rellenado por seleccionarArticulo()
    this.abrirModal('registro');
  }

  editarRegistro(reg: RepuestoDanado): void {
    this.modoEdicion            = true;
    this.articuloSeleccionado   = null;
    this.formRegistro = {
      id:               reg.id,
      agencia_id:       reg.agencia_id,
      codigo_articulo:  reg.codigo_articulo,
      nombre_articulo:  reg.nombre_articulo,
      descripcion:      reg.descripcion      ?? '',
      numero_serie:     reg.numero_serie     ?? '',
      unidad:           reg.unidad           ?? 'UN',
      tipo_dano:        reg.tipo_dano,
      severidad:        reg.severidad,
      descripcion_dano: reg.descripcion_dano,
      ubicacion_dano:   reg.ubicacion_dano   ?? '',
      ubicacion_fisica: reg.ubicacion_fisica ?? '',
      orden_trabajo:    reg.orden_trabajo    ?? '',
      proveedor:        reg.proveedor        ?? '',
      estado:           reg.estado,
      accion_tomada:    reg.accion_tomada    ?? '',
      costo_promedio:   reg.costo_promedio   ?? null,
      costo_reparacion: reg.costo_reparacion ?? null,
      observaciones:    reg.observaciones    ?? ''
    };
    this.abrirModal('registro');
    // ❌ ELIMINADO: this.cargarInventarioAgencia() — ya no se llama desde aquí
  }

  guardarRegistro(): void {
    if (!this.validarFormulario()) return;
    this.guardando = true;

    const payload: Partial<RepuestoDanado> = {
      ...(this.formRegistro as unknown as Partial<RepuestoDanado>),
      agencia_id:        this.inventarioCacheOficina,
      usuario_registro: this.usuario?.nombreUsuario ?? 'Sistema'
    };

    const op$ = this.modoEdicion
      ? this.repuestosService.actualizarRepuesto(this.formRegistro.id!, payload)
      : this.repuestosService.crearRepuesto(payload);

    op$.subscribe({
      next: (res) => {
        this.guardando = false;
        if (res.success) {
          this.cerrarModal('registro');
          this.cargarRegistros();
          // Refresca el inventario en background para reflejar cambios de stock
          this.oracleService.refrescarInventarioAgencia(this.inventarioCacheOficina);
        } else alert(res.mensaje ?? 'Error al guardar.');
      },
      error: (err) => { this.guardando = false; alert(err.error?.mensaje ?? 'Error al guardar.'); }
    });
  }

  // ──────────────────────────────────────────
  //  CRUD: ELIMINAR
  // ──────────────────────────────────────────

  eliminarRegistro(reg: RepuestoDanado, event: Event): void {
    event.stopPropagation();
    if (!confirm(`¿Eliminar "${reg.nombre_articulo}"?\nSe borrarán también todas sus imágenes.`)) return;
    this.eliminando = true;
    this.repuestosService.eliminarRepuesto(reg.id).subscribe({
      next: (res) => {
        this.eliminando = false;
        if (res.success) {
          this.registros          = this.registros.filter(r => r.id !== reg.id);
          this.registrosFiltrados = this.registrosFiltrados.filter(r => r.id !== reg.id);
        } else alert(res.mensaje ?? 'No se pudo eliminar.');
      },
      error: (err) => { this.eliminando = false; alert(err.error?.mensaje ?? 'Error al eliminar.'); }
    });
  }

  // ──────────────────────────────────────────
  //  CAMBIAR ESTADO
  // ──────────────────────────────────────────

  toggleDropdown(id: number | 'detalle', event: Event): void {
    event.stopPropagation();
    this.dropdownAbierto = this.dropdownAbierto === id ? null : id;
  }

  cambiarEstado(reg: RepuestoDanado, nuevoEstado: EstadoRepuesto, event: Event): void {
    event.stopPropagation();
    this.dropdownAbierto = null;
    if (reg.estado === nuevoEstado) return;
    this.repuestosService.cambiarEstado(reg.id, nuevoEstado, this.usuario?.nombreUsuario).subscribe({
      next: (res) => {
        if (res.success) {
          reg.estado = nuevoEstado;
          if (this.registroActivo?.id === reg.id) this.registroActivo.estado = nuevoEstado;
        } else alert(res.mensaje ?? 'No se pudo cambiar el estado.');
      },
      error: (err) => alert(err.error?.mensaje ?? 'Error al cambiar estado.')
    });
  }

  // ──────────────────────────────────────────
  //  DETALLE
  // ──────────────────────────────────────────

  verDetalle(reg: RepuestoDanado): void {
    this.repuestosService.getRepuestoCompleto(reg.id).subscribe({
      next:  (c) => { this.registroActivo = c;   this.abrirModal('detalle'); },
      error: ()  => { this.registroActivo = reg; this.abrirModal('detalle'); }
    });
  }

  // ──────────────────────────────────────────
  //  IMÁGENES
  // ──────────────────────────────────────────

  abrirModalImagenes(reg: RepuestoDanado): void {
    this.registroActivo    = reg;
    this.archivosParaSubir = [];
    this.imagenesRegistro  = [];
    this.cargarImagenes(reg.id);
    this.abrirModal('imagenes');
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); e.stopPropagation(); }

  onDrop(e: DragEvent): void {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer?.files) this.procesarArchivos(Array.from(e.dataTransfer.files));
  }

  onArchivosSeleccionados(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) this.procesarArchivos(Array.from(input.files));
    input.value = '';
  }

  procesarArchivos(files: File[]): void {
    const ok = ['image/jpeg','image/png','image/webp','image/gif'];
    files.forEach(file => {
      if (!ok.includes(file.type)) return;
      const r = new FileReader();
      r.onload = (ev) => this.archivosParaSubir.push({ file, preview: ev.target?.result as string, descripcion: '' });
      r.readAsDataURL(file);
    });
  }

  quitarArchivoPreview(i: number): void { this.archivosParaSubir.splice(i, 1); }

  subirImagenesServidor(): void {
    if (!this.registroActivo || !this.archivosParaSubir.length) return;
    this.subiendoImagenes = true;
    const fd = new FormData();
    fd.append('repuestoDanadoId', String(this.registroActivo.id));
    fd.append('usuarioSubida',    this.usuario?.nombreUsuario ?? 'Sistema');
    this.archivosParaSubir.forEach((a, i) => {
      fd.append('imagenes',         a.file, a.file.name);
      fd.append(`descripcion_${i}`, a.descripcion);
    });

    this.repuestosService.subirImagenes(fd).subscribe({
      next: (res) => {
        this.subiendoImagenes  = false;
        this.archivosParaSubir = [];
        if (res.success) {
          this.cargarImagenes(this.registroActivo!.id);
          const reg = this.registros.find(r => r.id === this.registroActivo!.id);
          if (reg) reg.total_imagenes = (reg.total_imagenes ?? 0) + res.imagenes.length;
        } else alert(res.mensaje ?? 'Error al subir.');
      },
      error: (err) => { this.subiendoImagenes = false; alert(err.error?.mensaje ?? 'Error al subir.'); }
    });
  }

  eliminarImagen(img: ImagenRepuesto, i: number): void {
    if (!confirm(`¿Eliminar "${img.nombre_archivo}"?`)) return;
    this.repuestosService.eliminarImagen(img.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.imagenesRegistro.splice(i, 1);
          const reg = this.registros.find(r => r.id === this.registroActivo?.id);
          if (reg && reg.total_imagenes) reg.total_imagenes--;
        } else alert(res.mensaje ?? 'No se pudo eliminar.');
      },
      error: (err) => alert(err.error?.mensaje ?? 'No se pudo eliminar.')
    });
  }

  // ──────────────────────────────────────────
  //  URL IMÁGENES
  // ──────────────────────────────────────────
  private readonly apiBase = 'https://bodega.vehicentro.com:1830/api';

  getImagenUrl(img: ImagenRepuesto): string {
    if (!this.registroActivo) return '';
    const sev  = this.registroActivo.severidad;
    const id   = this.registroActivo.id;
    const arch = img.ruta_archivo;   // GUID guardado en BD
    return `${this.apiBase}/api/repuestosdanadosvhcr/imagen/${sev}/${id}/${arch}`;
  }

  verImagenAmpliada(img: ImagenRepuesto): void { window.open(this.getImagenUrl(img), '_blank'); }

  // ──────────────────────────────────────────
  //  EXCEL
  // ──────────────────────────────────────────

  exportarExcel(): void {
    const datos = this.registrosFiltrados.map((r, i) => ({
      'Item': i + 1, 'Código': r.codigo_articulo, 'Artículo': r.nombre_articulo,
      'Descripción': r.descripcion ?? '', 'N° Serie / ID': r.numero_serie ?? '',
      'Tipo de Daño': r.tipo_dano, 'Severidad': r.severidad,
      'Descripción Daño': r.descripcion_dano, 'Parte Afectada': r.ubicacion_dano ?? '',
      'Ubicación Física': r.ubicacion_fisica ?? '', 'OT': r.orden_trabajo ?? '',
      'Proveedor': r.proveedor ?? '', 'Estado': r.estado,
      'Acción Tomada': r.accion_tomada ?? '', 'Costo Prom': r.costo_promedio ?? '',
      'Costo Rep': r.costo_reparacion ?? '', 'Registrado por': r.usuario_registro,
      'Fecha': new Date(r.fecha_registro).toLocaleDateString('es-EC'),
      'Imágenes': r.total_imagenes ?? 0, 'Observaciones': r.observaciones ?? ''
    }));
    const ws  = XLSX.utils.json_to_sheet(datos);
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Repuestos Dañados');
    const buf  = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `repuestos-danados-${new Date().toISOString().slice(0, 10)}.xlsx`
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  // ──────────────────────────────────────────
  //  HELPERS CSS
  // ──────────────────────────────────────────

  getSevClass    = (s: string) => ({ Leve:'sev-leve', Moderado:'sev-moderado', Grave:'sev-grave', Irreparable:'sev-irreparable' } as any)[s] ?? '';
  getEstadoClass = (e: string) => ({ 'Pendiente':'est-pendiente','En Revisión':'est-revision','En Garantía':'est-garantia', Desechado:'est-desechado', Reparado:'est-reparado', Devuelto:'est-devuelto' } as any)[e] ?? '';
  getFilaClass   = (s: string) => ({ Leve:'fila-leve', Moderado:'fila-moderado', Grave:'fila-grave', Irreparable:'fila-irreparable' } as any)[s] ?? '';

  getStockClass(disp: number): string {
    if (disp <= 0) return 'stock-empty';
    if (disp <= 5) return 'stock-low';
    return 'stock-ok';
  }

  // ──────────────────────────────────────────
  //  VALIDACIÓN
  // ──────────────────────────────────────────

  validarFormulario(): boolean {
    const f = this.formRegistro;
    if (!f.codigo_articulo.trim())  { alert('Seleccione un artículo del inventario o ingrese el código.'); return false; }
    if (!f.nombre_articulo.trim())  { alert('Ingrese el nombre del artículo.'); return false; }
    if (!f.tipo_dano)               { alert('Seleccione el tipo de daño.'); return false; }
    if (!f.severidad)               { alert('Seleccione la severidad.'); return false; }
    if (!f.descripcion_dano.trim()) { alert('Ingrese la descripción del daño.'); return false; }
    if (!f.estado)                  { alert('Seleccione el estado.'); return false; }
    return true;
  }

  private formVacio(): FormRegistro {
    return {
      agencia_id: this.agenciaId, codigo_articulo: '', nombre_articulo: '',
      descripcion: '', numero_serie: '', unidad: 'UN', tipo_dano: '', severidad: '',
      descripcion_dano: '', ubicacion_dano: '', ubicacion_fisica: '', orden_trabajo: '',
      proveedor: '', estado: 'Pendiente', accion_tomada: '',
      costo_promedio: null, costo_reparacion: null, observaciones: ''
    };
  }
}