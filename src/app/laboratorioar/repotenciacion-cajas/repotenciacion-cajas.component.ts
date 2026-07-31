import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  RepotenciacionCajaDto,
  EstadisticasRepotenciacion,
  RepotenciacionCajasService,
  RepotenciacionCajaRequest,
  ApiListResponse,
  MecanicoDto,
  RecepcionRequest,
  AsignarMecanicoResponse,
  SolicitudRepuestosDto,
  RepuestoDto,
  AprobarRepuestosRequest,
  DesarmeDto,
  ReparacionDto,
  EntregaDto,
} from 'src/app/services/repotenciacion-cajas.service';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

// ============================================================
// TIPOS
// ============================================================

type EstadoRepotenciacion =
  | 'PENDIENTE' | 'ASIGNADO' | 'EN_PROCESO' | 'DESARMANDO'
  | 'ESPERA_REPUESTOS' | 'REPARANDO' | 'COMPLETADO' | 'ENTREGADO' | 'DADA_BAJA';
type VistaActual = 'listado' | 'detalle';

interface FormularioRepotenciacion {
  agencia: string; modelo: string; serie: string; cliente: string;
  ordenTrabajo: string; guiaRemision: string;
  estado: EstadoRepotenciacion;
  fechaIngreso: string; fechaEntrega: string;
  observaciones: string; tutorialUrl: string;
  usuarioCrea: number;
}

interface FormularioRecepcion {
  repotenciacionId: number;
  fechaRecepcion:   string;
  recibidoPorId:    number;
  condicionFisica:  string;
  observaciones:    string;
  confirmado:       boolean;
}

/** Imagen normalizada para el visor lightbox */
interface VisorImagen {
  url: string;
  tag: string;          // Etapa: Placa, Registro, Recepción, Desarme, Reparación, Entrega
  descripcion?: string;
}

const FORMULARIO_VACIO: FormularioRepotenciacion = {
  agencia: '', modelo: '', serie: '', cliente: '',
  ordenTrabajo: '', guiaRemision: '',
  estado: 'PENDIENTE', fechaIngreso: '', fechaEntrega: '',
  observaciones: '', tutorialUrl: '', usuarioCrea: 1,
};

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-repotenciacion-cajas',
  templateUrl: './repotenciacion-cajas.component.html',
  styleUrls: ['./repotenciacion-cajas.component.css'],
})
export class RepotenciacionCajasComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── Vista ─────────────────────────────────────────────────
  vistaActual: VistaActual = 'listado';

  // ── Datos ─────────────────────────────────────────────────
  repotenciaciones: RepotenciacionCajaDto[] = [];
  repotenciacionesFiltradas: RepotenciacionCajaDto[] = [];
  repotenciacionSeleccionada: RepotenciacionCajaDto | null = null;

  estadisticas: EstadisticasRepotenciacion = {
    success: true, total: 0, cajasCambio: 0, diferenciales: 0,
    pendientes: 0, enProceso: 0, completados: 0, entregados: 0,
  };

  // ── Modales ───────────────────────────────────────────────
  mostrarModal          = false;
  mostrarModalImagenes  = false;
  mostrarModalEstado    = false;
  mostrarModalRecepcion = false;
  mostrarModalMecanico  = false;
  mostrarModalRepuestos = false;
  mostrarModalDescarga  = false;
  modoEdicion           = false;

  // ── Filtros ───────────────────────────────────────────────
  filtroEstado = ''; filtroTipo = ''; terminoBusqueda = '';
  fechaDesde = ''; fechaHasta = '';

  // ── Estado UI ─────────────────────────────────────────────
  cargando = false; cargandoDetalle = false;
  cargandoImgs = false; cargandoEstado = false;
  error = ''; mensaje = '';

  // ── Mecánicos ─────────────────────────────────────────────
  mecanicos: MecanicoDto[] = [];
  mecanicoSeleccionadoId: number | null = null;

  // ── Solicitudes de repuestos (aprobación admin) ────────────
  solicitudesRepuestos: SolicitudRepuestosDto[] = [];
  cargandoRepuestos = false;
  observacionAprobacion = '';

  // ── Seguimiento de taller (solo lectura en detalle) ────────
  desarme:    DesarmeDto    | null = null;
  reparacion: ReparacionDto | null = null;
  entrega:    EntregaDto    | null = null;
  cargandoSeguimiento = false;

  // ── Formulario crear/editar ────────────────────────────────
  formulario: FormularioRepotenciacion = { ...FORMULARIO_VACIO };

  // ② Cambio de estado
  nuevoEstado: EstadoRepotenciacion = 'PENDIENTE';
  observacionEstado = '';

  // ③ Recepción laboratorio
  recepcion: FormularioRecepcion = {
    repotenciacionId: 0, fechaRecepcion: new Date().toISOString().slice(0, 16),
    recibidoPorId: 0, condicionFisica: 'BUENA', observaciones: '', confirmado: false,
  };

  // ── Imágenes ──────────────────────────────────────────────
  archivoPlaca: File | null = null;
  archivosFotografias: File[] = [];
  previsualizacionPlaca: string | null = null;
  previsualizacionesFotos: string[] = [];

  // ── Visor lightbox ────────────────────────────────────────
  visorAbierto = false;
  visorIndice = 0;
  visorImagenes: VisorImagen[] = [];

  // Galerías precalculadas del detalle (se llenan al cargar)
  fotosRegistro:   VisorImagen[] = [];  // placa + fotografías generales
  fotosRecepcion:  VisorImagen[] = [];  // fotografías con tipo RECEPCION
  galeriaAdjuntas: VisorImagen[] = [];  // placa + todas las fotografías (tarjeta adjuntas)
  imgsDesarme:     VisorImagen[] = [];
  imgsReparacion:  VisorImagen[] = [];
  imgsEntrega:     VisorImagen[] = [];

  // ── Descarga de imágenes (selección / todas → ZIP) ────────
  imagenesSeleccionadas = new Set<string>();   // se guarda por URL
  descargandoZip = false;
  progresoDescarga = '';

  // ── Opciones ──────────────────────────────────────────────
  readonly estados = [
    { value: '',                 label: 'Todos los Estados' },
    { value: 'PENDIENTE',        label: 'Pendiente' },
    { value: 'ASIGNADO',         label: 'Asignado' },
    { value: 'EN_PROCESO',       label: 'En Proceso' },
    { value: 'DESARMANDO',       label: 'En Desarme' },
    { value: 'ESPERA_REPUESTOS', label: 'Espera Repuestos' },
    { value: 'REPARANDO',        label: 'En Reparación' },
    { value: 'COMPLETADO',       label: 'Completado' },
    { value: 'ENTREGADO',        label: 'Entregado' },
    { value: 'DADA_BAJA',        label: 'Dada de Baja' },
  ];

  readonly estadosCambio: { value: EstadoRepotenciacion; label: string; clase: string; icono: string }[] = [
    { value: 'PENDIENTE',        label: 'Pendiente',        clase: 'btn-warning', icono: 'fa-clock' },
    { value: 'ASIGNADO',         label: 'Asignado',         clase: 'btn-info',    icono: 'fa-user-check' },
    { value: 'EN_PROCESO',       label: 'En Proceso',       clase: 'btn-info',    icono: 'fa-cog fa-spin' },
    { value: 'DESARMANDO',       label: 'En Desarme',       clase: 'btn-info',    icono: 'fa-tools' },
    { value: 'ESPERA_REPUESTOS', label: 'Espera Repuestos', clase: 'btn-danger',  icono: 'fa-pause-circle' },
    { value: 'REPARANDO',        label: 'En Reparación',    clase: 'btn-info',    icono: 'fa-hammer' },
    { value: 'COMPLETADO',       label: 'Completado',       clase: 'btn-success', icono: 'fa-check-circle' },
    { value: 'ENTREGADO',        label: 'Entregado',        clase: 'btn-primary', icono: 'fa-box-open' },
    { value: 'DADA_BAJA',        label: 'Dar de Baja',      clase: 'btn-dark',    icono: 'fa-ban' },
  ];

  readonly tipos = [
    { value: '',            label: 'Todos los Tipos' },
    { value: 'CAJA',        label: 'Caja de Cambio' },
    { value: 'DIFERENCIAL', label: 'Diferencial / Transferencia' },
  ];

  readonly condicionesFisicas = [
    { value: 'BUENA',      label: 'Buena condición',    icono: 'fa-check-circle text-success' },
    { value: 'DAÑADA',     label: 'Con daños visibles', icono: 'fa-exclamation-triangle text-warning' },
    { value: 'INCOMPLETA', label: 'Incompleta',         icono: 'fa-times-circle text-danger' },
  ];

  constructor(private svc: RepotenciacionCajasService) {}

  ngOnInit(): void { this.cargarEstadisticas(); this.cargarRepotenciaciones(); this.cargarMecanicos(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ============================================================
  // CARGA DE DATOS
  // ============================================================

  cargarEstadisticas(): void {
    this.svc.getEstadisticas().pipe(takeUntil(this.destroy$))
      .subscribe({ next: est => this.estadisticas = est, error: err => console.error(err) });
  }

  cargarMecanicos(): void {
    this.svc.getMecanicos().pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => this.mecanicos = res.data,
        error: ()  => console.warn('No se pudieron cargar los mecánicos'),
      });
  }

  cargarRepotenciaciones(): void {
    this.cargando = true; this.error = '';
    this.svc.getAll({
      estado: this.filtroEstado || undefined, tipo: this.filtroTipo || undefined,
      busqueda: this.terminoBusqueda || undefined,
      fechaDesde: this.fechaDesde || undefined, fechaHasta: this.fechaHasta || undefined,
    })
      .pipe(takeUntil(this.destroy$), finalize(() => this.cargando = false))
      .subscribe({
        next: (res: ApiListResponse<RepotenciacionCajaDto>) => {
          this.repotenciaciones = res.data ?? [];
          this.repotenciacionesFiltradas = res.data ?? [];
          this.cargarEstadisticas();
        },
        error: err => { this.error = `Error al cargar: ${err.error?.message ?? err.message}`; },
      });
  }

  private refrescarSeleccionada(): void {
    if (!this.repotenciacionSeleccionada) return;
    this.svc.getById(this.repotenciacionSeleccionada.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(r => {
        this.repotenciacionSeleccionada = r.data;
        this.prepararGalerias();
        const idx = this.repotenciaciones.findIndex(x => x.id === r.data.id);
        if (idx >= 0) { this.repotenciaciones[idx] = r.data; this.aplicarFiltrosLocales(); }
      });
  }

  // ============================================================
  // FILTROS
  // ============================================================

  onFiltroChange(): void { this.aplicarFiltrosLocales(); }

  aplicarFiltrosLocales(): void {
    this.repotenciacionesFiltradas = this.repotenciaciones.filter(rep => {
      if (this.filtroEstado && rep.estado !== this.filtroEstado) return false;
      if (this.filtroTipo === 'CAJA' && rep.tipoComponente !== 'CAJA') return false;
      if (this.filtroTipo === 'DIFERENCIAL' && rep.tipoComponente !== 'DIFERENCIAL') return false;
      if (this.terminoBusqueda) {
        const t = this.terminoBusqueda.toLowerCase();
        if (!rep.agencia.toLowerCase().includes(t) && !rep.modelo.toLowerCase().includes(t) &&
            !rep.serie.toLowerCase().includes(t) && !rep.cliente.toLowerCase().includes(t) &&
            !rep.ordenTrabajo.toLowerCase().includes(t))
          return false;
      }
      if (this.fechaDesde && rep.fechaIngreso && new Date(rep.fechaIngreso) < new Date(this.fechaDesde)) return false;
      if (this.fechaHasta && rep.fechaIngreso && new Date(rep.fechaIngreso) > new Date(this.fechaHasta)) return false;
      return true;
    });
  }

  buscarEnServidor(): void { this.cargarRepotenciaciones(); }

  limpiarFiltros(): void {
    this.filtroEstado = ''; this.filtroTipo = '';
    this.terminoBusqueda = ''; this.fechaDesde = ''; this.fechaHasta = '';
    this.cargarRepotenciaciones();
  }

  // ============================================================
  // VISTA DETALLE
  // ============================================================

  verDetalle(rep: RepotenciacionCajaDto): void {
    this.cargandoDetalle = true; this.error = '';
    this.svc.getById(rep.id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.cargandoDetalle = false))
      .subscribe({
        next: r => {
          this.repotenciacionSeleccionada = r.data;
          this.vistaActual = 'detalle';
          this.prepararGalerias();
          this.cargarSeguimiento(r.data.id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: err => { this.error = `Error al cargar detalle: ${err.error?.message ?? err.message}`; },
      });
  }

  volverAlListado(): void {
    this.vistaActual = 'listado';
    this.repotenciacionSeleccionada = null;
    this.desarme = null; this.reparacion = null; this.entrega = null;
    this.imgsDesarme = []; this.imgsReparacion = []; this.imgsEntrega = [];
    this.fotosRegistro = []; this.fotosRecepcion = []; this.galeriaAdjuntas = [];
    this.solicitudesRepuestos = [];
    this.cerrarVisor();
    this.cargarRepotenciaciones();
  }

  // ============================================================
  // ② CAMBIO DE ESTADO
  // ============================================================

  abrirModalEstado(rep: RepotenciacionCajaDto): void {
    this.repotenciacionSeleccionada = rep;
    this.nuevoEstado       = rep.estado as EstadoRepotenciacion;
    this.observacionEstado = '';
    this.mostrarModalEstado = true;
    this.error = '';
  }

  cerrarModalEstado(): void { this.mostrarModalEstado = false; this.observacionEstado = ''; this.error = ''; }

  confirmarCambioEstado(): void {
    if (!this.repotenciacionSeleccionada) return;
    if (this.nuevoEstado === this.repotenciacionSeleccionada.estado) { this.cerrarModalEstado(); return; }

    // Al dar de baja se exige un motivo para dejar trazabilidad
    if (this.nuevoEstado === 'DADA_BAJA' && !this.observacionEstado.trim()) {
      this.error = 'Debe indicar el motivo para dar de baja el componente.';
      return;
    }

    this.cargandoEstado = true; this.error = '';
    const rep = this.repotenciacionSeleccionada;

    const request: RepotenciacionCajaRequest = {
      agencia: rep.agencia, modelo: rep.modelo, serie: rep.serie, cliente: rep.cliente,
      ordenTrabajo: rep.ordenTrabajo, guiaRemision: rep.guiaRemision,
      estado: this.nuevoEstado, usuarioCrea: rep.usuarioCrea,
      observaciones: this.observacionEstado
        ? `[${this.nuevoEstado} - ${this.formatearFechaHora(new Date())}] ${this.observacionEstado}`
        : (rep.observaciones || undefined),
    };

    this.svc.update(rep.id, request)
      .pipe(takeUntil(this.destroy$), finalize(() => this.cargandoEstado = false))
      .subscribe({
        next: () => {
          this.mostrarMensaje(`Estado actualizado a ${this.nuevoEstado}`);
          this.cerrarModalEstado();
          this.refrescarSeleccionada();
          this.cargarEstadisticas();
        },
        error: err => { this.error = `Error al cambiar estado: ${err.error?.message ?? err.message}`; },
      });
  }

  // ============================================================
  // ③ RECEPCIÓN EN LABORATORIO
  // ============================================================

  abrirModalRecepcion(rep: RepotenciacionCajaDto): void {
    this.repotenciacionSeleccionada = rep;
    this.recepcion = {
      repotenciacionId: rep.id,
      fechaRecepcion:   new Date().toISOString().slice(0, 16),
      recibidoPorId:    0,
      condicionFisica:  'BUENA',
      observaciones:    '',
      confirmado:       false,
    };
    this.mostrarModalRecepcion = true;
    this.error = '';
  }

  cerrarModalRecepcion(): void { this.mostrarModalRecepcion = false; this.error = ''; }

  confirmarRecepcion(): void {
    if (!this.recepcion.recibidoPorId) { this.error = 'Debe seleccionar quién recibe el componente.'; return; }
    if (!this.recepcion.confirmado) { this.error = 'Debe confirmar que verificó el componente físicamente.'; return; }

    this.cargandoEstado = true; this.error = '';

    const req: RecepcionRequest = {
      repotenciacionId: this.recepcion.repotenciacionId,
      fechaRecepcion:   this.recepcion.fechaRecepcion,
      recibidoPorId:    this.recepcion.recibidoPorId,
      condicionFisica:  this.recepcion.condicionFisica,
      observaciones:    this.recepcion.observaciones || undefined,
    };

    this.svc.registrarRecepcion(req)
      .pipe(takeUntil(this.destroy$), finalize(() => this.cargandoEstado = false))
      .subscribe({
        next: () => {
          this.mostrarMensaje('✅ Recepción registrada correctamente.');
          this.cerrarModalRecepcion();
          this.refrescarSeleccionada();
          this.cargarEstadisticas();
        },
        error: err => { this.error = `Error al registrar recepción: ${err.error?.message ?? err.message}`; },
      });
  }

  // ============================================================
  // ④ ASIGNAR MECÁNICO
  // ============================================================

  abrirModalMecanico(rep: RepotenciacionCajaDto): void {
    this.repotenciacionSeleccionada = rep;
    this.mecanicoSeleccionadoId = rep.mecanicoId ?? null;
    this.mostrarModalMecanico = true;
    this.error = '';
  }

  cerrarModalMecanico(): void { this.mostrarModalMecanico = false; this.mecanicoSeleccionadoId = null; this.error = ''; }

  confirmarAsignacionMecanico(): void {
    if (!this.mecanicoSeleccionadoId) { this.error = 'Seleccione un mecánico.'; return; }
    if (!this.repotenciacionSeleccionada) return;

    this.cargandoEstado = true; this.error = '';
    this.svc.asignarMecanico(this.repotenciacionSeleccionada.id, this.mecanicoSeleccionadoId)
      .pipe(takeUntil(this.destroy$), finalize(() => this.cargandoEstado = false))
      .subscribe({
        next: (res: AsignarMecanicoResponse) => {
          this.mostrarMensaje(res.message);
          this.cerrarModalMecanico();
          this.refrescarSeleccionada();
          this.cargarEstadisticas();
        },
        error: err => { this.error = `Error: ${err.error?.message ?? err.message}`; },
      });
  }

  // ============================================================
  // ⑤ APROBACIÓN DE REPUESTOS (admin)
  // ============================================================

  tieneRepuestosPendientes(rep: RepotenciacionCajaDto): boolean {
    return rep.estado === 'ESPERA_REPUESTOS';
  }

  abrirModalRepuestos(rep: RepotenciacionCajaDto): void {
    this.repotenciacionSeleccionada = rep;
    this.observacionAprobacion = '';
    this.mostrarModalRepuestos = true;
    this.error = '';
    this.cargarSolicitudesRepuestos(rep.id);
  }

  cerrarModalRepuestos(): void {
    this.mostrarModalRepuestos = false;
    this.error = '';
  }

  cargarSolicitudesRepuestos(id: number): void {
    this.cargandoRepuestos = true;
    this.svc.getSolicitudesRepuestos(id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.cargandoRepuestos = false))
      .subscribe({
        next: res => {
          // Pre-llena la cantidad a aprobar con la solicitada para agilizar al admin
          this.solicitudesRepuestos = (res.data ?? []).map(s => ({
            ...s,
            repuestos: (s.repuestos ?? []).map(r => ({
              ...r,
              cantidadAprobada: r.cantidadAprobada ?? r.cantidadSolicitada,
              estado: r.estado || 'PENDIENTE',
            })),
          }));
        },
        error: err => { this.error = `Error al cargar solicitudes: ${err.error?.message ?? err.message}`; },
      });
  }

  // Pendiente o parcial → todavía editable
  solicitudPendiente(sol: SolicitudRepuestosDto): boolean {
    return sol.estado === 'PENDIENTE' || sol.estado === 'PARCIAL';
  }

  setEstadoRepuesto(rep: RepuestoDto, estado: string): void {
    rep.estado = estado;
    if (estado === 'RECHAZADO') rep.cantidadAprobada = 0;
    else if (!rep.cantidadAprobada) rep.cantidadAprobada = rep.cantidadSolicitada;
  }

  confirmarAprobacionRepuestos(sol: SolicitudRepuestosDto): void {
    if (!this.repotenciacionSeleccionada) return;

    const payload: AprobarRepuestosRequest = {
      observaciones: this.observacionAprobacion || undefined,
      repuestos: sol.repuestos.map(r => ({
        repuestoId:       r.id,
        cantidadAprobada: r.estado === 'RECHAZADO' ? 0 : (r.cantidadAprobada ?? 0),
        estado:           r.estado || 'APROBADO',
        observaciones:    r.observaciones || undefined,
      })),
    };

    this.cargandoRepuestos = true; this.error = '';
    this.svc.aprobarRepuestos(this.repotenciacionSeleccionada.id, sol.id, payload)
      .pipe(takeUntil(this.destroy$), finalize(() => this.cargandoRepuestos = false))
      .subscribe({
        next: res => {
          this.mostrarMensaje(`Solicitud #${sol.id} actualizada — ${res.estadoSolicitud}.`);
          this.cargarSolicitudesRepuestos(this.repotenciacionSeleccionada!.id);
          this.refrescarSeleccionada();
          this.cargarEstadisticas();
        },
        error: err => { this.error = `Error al aprobar: ${err.error?.message ?? err.message}`; },
      });
  }

  claseEstadoSolicitud(estado: string): string {
    return ({
      PENDIENTE: 'bg-warning text-dark', APROBADO: 'bg-success',
      RECHAZADO: 'bg-danger', PARCIAL: 'bg-info',
    } as any)[estado] ?? 'bg-secondary';
  }

  // ============================================================
  // SEGUIMIENTO DE TALLER (solo lectura)
  // ============================================================

  cargarSeguimiento(id: number): void {
    this.desarme = null; this.reparacion = null; this.entrega = null;
    this.imgsDesarme = []; this.imgsReparacion = []; this.imgsEntrega = [];
    this.solicitudesRepuestos = [];
    this.cargandoSeguimiento = true;

    // Estos GET devuelven 404 cuando aún no existe el registro → se ignora el error.
    this.svc.getDesarme(id).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => { this.desarme = r.data; this.imgsDesarme = this.mapImgsMovil(r.data?.imagenes, 'Desarme'); },
        error: () => { this.desarme = null; this.imgsDesarme = []; },
      });

    this.svc.getReparacion(id).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => { this.reparacion = r.data; this.imgsReparacion = this.mapImgsMovil(r.data?.imagenes, 'Reparación'); },
        error: () => { this.reparacion = null; this.imgsReparacion = []; },
      });

    this.svc.getEntrega(id).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.entrega = r.data;
          this.imgsEntrega = this.mapImgsMovil(r.data?.fotoEntrega ? [r.data.fotoEntrega] : [], 'Entrega');
        },
        error: () => { this.entrega = null; this.imgsEntrega = []; },
      });

    this.svc.getSolicitudesRepuestos(id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.cargandoSeguimiento = false))
      .subscribe({
        next: r => this.solicitudesRepuestos = r.data ?? [],
        error: () => this.solicitudesRepuestos = [],
      });
  }

  // ============================================================
  // MODAL CREAR / EDITAR
  // ============================================================

  abrirModalNuevo(): void { this.modoEdicion = false; this.formulario = { ...FORMULARIO_VACIO }; this.mostrarModal = true; this.error = ''; }

  abrirModalEditar(rep: RepotenciacionCajaDto): void {
    this.modoEdicion = true; this.repotenciacionSeleccionada = rep;
    this.formulario = {
      agencia: rep.agencia, modelo: rep.modelo, serie: rep.serie, cliente: rep.cliente,
      ordenTrabajo: rep.ordenTrabajo, guiaRemision: rep.guiaRemision,
      estado: rep.estado as EstadoRepotenciacion,
      fechaIngreso: rep.fechaIngreso ? new Date(rep.fechaIngreso).toISOString().slice(0, 16) : '',
      fechaEntrega: rep.fechaEntrega ? new Date(rep.fechaEntrega).toISOString().slice(0, 16) : '',
      observaciones: rep.observaciones ?? '', tutorialUrl: rep.tutorialUrl ?? '',
      usuarioCrea: rep.usuarioCrea,
    };
    this.mostrarModal = true; this.error = '';
  }

  cerrarModal(): void { this.mostrarModal = false; this.error = ''; }

  guardarRepotenciacion(): void {
    if (!this.validarFormulario()) return;
    this.cargando = true; this.error = '';

    const request: RepotenciacionCajaRequest = {
      ...this.formulario,
      fechaIngreso: this.formulario.fechaIngreso || undefined, fechaEntrega: this.formulario.fechaEntrega || undefined,
      observaciones: this.formulario.observaciones || undefined, tutorialUrl: this.formulario.tutorialUrl || undefined,
    };

    const op$ = this.modoEdicion ? this.svc.update(this.repotenciacionSeleccionada!.id, request) : this.svc.create(request);
    op$.pipe(takeUntil(this.destroy$), finalize(() => this.cargando = false))
      .subscribe({
        next: res => { this.mostrarMensaje(res.message); this.cerrarModal(); this.cargarRepotenciaciones(); },
        error: err => { this.error = `Error: ${err.error?.message ?? err.message}`; },
      });
  }

  eliminarRepotenciacion(rep: RepotenciacionCajaDto): void {
    if (!confirm(`¿Eliminar la repotenciación Nº ${rep.ordenTrabajo}?`)) return;
    this.cargando = true;
    this.svc.delete(rep.id).pipe(takeUntil(this.destroy$), finalize(() => this.cargando = false))
      .subscribe({
        next: res => { this.mostrarMensaje(res.message); this.cargarRepotenciaciones(); },
        error: err => { this.error = `Error al eliminar: ${err.error?.message ?? err.message}`; },
      });
  }

  // ============================================================
  // MODAL IMÁGENES
  // ============================================================

  abrirModalImagenes(rep: RepotenciacionCajaDto): void { this.repotenciacionSeleccionada = rep; this.resetImagenState(); this.mostrarModalImagenes = true; }
  cerrarModalImagenes(): void { this.mostrarModalImagenes = false; this.resetImagenState(); }

  private resetImagenState(): void {
    this.archivoPlaca = null; this.archivosFotografias = [];
    this.previsualizacionPlaca = null; this.previsualizacionesFotos = []; this.error = '';
  }

  async onPlacaSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const err = this.svc.validarImagen(file);
    if (err) { this.error = err; input.value = ''; return; }
    this.archivoPlaca = file;
    this.previsualizacionPlaca = await this.svc.previsualizarImagen(file);
  }

  async onFotografiasSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length !== 4) { this.error = 'Debe seleccionar exactamente 4 fotografías.'; input.value = ''; return; }
    for (const f of files) { const err = this.svc.validarImagen(f); if (err) { this.error = err; input.value = ''; return; } }
    this.archivosFotografias = files;
    this.previsualizacionesFotos = await Promise.all(files.map(f => this.svc.previsualizarImagen(f)));
    this.error = '';
  }

  subirImagenes(): void {
    if (!this.repotenciacionSeleccionada) return;
    if (!this.archivoPlaca && this.archivosFotografias.length === 0) { this.error = 'Seleccione al menos una imagen.'; return; }
    if (this.archivosFotografias.length > 0 && this.archivosFotografias.length !== 4) { this.error = 'Debe seleccionar exactamente 4 fotografías.'; return; }
    this.cargandoImgs = true; this.error = '';
    this.svc.subirImagenes(this.repotenciacionSeleccionada.id, this.archivoPlaca, this.archivosFotografias.length ? this.archivosFotografias : undefined)
      .pipe(takeUntil(this.destroy$), finalize(() => this.cargandoImgs = false))
      .subscribe({
        next: res => { this.mostrarMensaje(res.message); this.cerrarModalImagenes(); this.refrescarSeleccionada(); },
        error: err => { this.error = `Error al subir: ${err.error?.message ?? err.message}`; },
      });
  }

  eliminarImagenIndividual(imagenId: number): void {
    if (!confirm('¿Eliminar esta imagen?')) return;
    this.svc.deleteImagen(imagenId).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => { this.mostrarMensaje(res.message); this.refrescarSeleccionada(); },
        error: err => { this.error = `Error: ${err.error?.message ?? err.message}`; },
      });
  }

  // ============================================================
  // VISOR DE IMÁGENES (LIGHTBOX) Y GALERÍAS
  // ============================================================

  get visorImagenActual(): VisorImagen | null {
    return this.visorImagenes[this.visorIndice] ?? null;
  }

  abrirVisorLista(imagenes: VisorImagen[], indice = 0): void {
    if (!imagenes.length) return;
    this.visorImagenes = imagenes;
    this.visorIndice = Math.min(Math.max(indice, 0), imagenes.length - 1);
    this.visorAbierto = true;
    this.precargarAdyacentes();
  }

  cerrarVisor(): void {
    this.visorAbierto = false;
    this.visorImagenes = [];
    this.visorIndice = 0;
  }

  visorAnterior(): void {
    const total = this.visorImagenes.length;
    if (!total) return;
    this.visorIndice = (this.visorIndice - 1 + total) % total;
    this.precargarAdyacentes();
  }

  visorSiguiente(): void {
    const total = this.visorImagenes.length;
    if (!total) return;
    this.visorIndice = (this.visorIndice + 1) % total;
    this.precargarAdyacentes();
  }

  irAImagen(indice: number): void {
    this.visorIndice = indice;
    this.precargarAdyacentes();
  }

  /** Cache simple para no recrear objetos Image() ya precargados */
  private imagenesPrecargadas = new Set<string>();

  /**
   * Precarga en segundo plano la imagen anterior y siguiente a la actual,
   * así al pulsar ← → la imagen ya está en la caché del navegador y el
   * cambio se ve instantáneo en vez de esperar la descarga.
   */
  private precargarAdyacentes(): void {
    const total = this.visorImagenes.length;
    if (total < 2) return;
    const siguiente = (this.visorIndice + 1) % total;
    const anterior = (this.visorIndice - 1 + total) % total;
    [siguiente, anterior].forEach(i => {
      const url = this.visorImagenes[i]?.url;
      if (!url || this.imagenesPrecargadas.has(url)) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      this.imagenesPrecargadas.add(url);
    });
  }

  /** Navegación con teclado: ← → para moverse, Esc para cerrar */
  @HostListener('document:keydown', ['$event'])
  manejarTecladoVisor(ev: KeyboardEvent): void {
    if (!this.visorAbierto) return;
    if (ev.key === 'ArrowLeft')       { ev.preventDefault(); this.visorAnterior(); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); this.visorSiguiente(); }
    else if (ev.key === 'Escape')     { ev.preventDefault(); this.cerrarVisor(); }
  }

  /**
   * Precalcula las galerías del detalle a partir de la repotenciación
   * seleccionada. Las fotografías pueden traer un `tipo` (RECEPCION, etc.);
   * se lee de forma defensiva porque no todas las versiones del DTO lo exponen.
   */
  private prepararGalerias(): void {
    const rep = this.repotenciacionSeleccionada;
    this.fotosRegistro = []; this.fotosRecepcion = []; this.galeriaAdjuntas = [];
    if (!rep) return;

    if (rep.imagenPlaca) {
      const placa: VisorImagen = { url: rep.imagenPlaca.url, tag: 'Placa', descripcion: (rep.imagenPlaca as any).descripcion };
      this.fotosRegistro.push(placa);
      this.galeriaAdjuntas.push(placa);
    }

    (rep.fotografias ?? []).forEach((foto: any, i: number) => {
      const tipo = (foto.tipo ?? '').toString().toUpperCase();
      const img: VisorImagen = {
        url: foto.url,
        tag: tipo === 'RECEPCION' ? 'Recepción' : 'Registro',
        descripcion: foto.descripcion || `Vista ${i + 1}`,
      };
      this.galeriaAdjuntas.push(img);
      if (tipo === 'RECEPCION') this.fotosRecepcion.push(img);
      else this.fotosRegistro.push(img);
    });

    (rep.recepcion?.imagenes ?? []).forEach((foto: any, i: number) => {
      const tipo = (foto.tipo ?? '').toString().toUpperCase();
      const img: VisorImagen = {
        url: foto.url,
        tag: tipo === 'RECEPCION' ? 'Recepción' : 'Registro',
        descripcion: foto.descripcion || `Vista ${i + 1}`,
      };
      this.galeriaAdjuntas.push(img);
      if (tipo === 'RECEPCION') this.fotosRecepcion.push(img);
      else this.fotosRegistro.push(img);
    });
  }

  /** Normaliza imágenes del flujo móvil (desarme/reparación/entrega) para el visor */
  private mapImgsMovil(imgs: any[] | undefined | null, tag: string): VisorImagen[] {
    return (imgs ?? []).map((i: any) => ({ url: i.url, tag, descripcion: i.descripcion }));
  }

  // ============================================================
  // VALIDACIÓN / UTILIDADES
  // ============================================================

  validarFormulario(): boolean {
    const f = this.formulario;
    for (const [val, msg] of [
      [f.agencia, 'La agencia es obligatoria'], [f.modelo, 'El modelo es obligatorio'],
      [f.serie, 'La serie es obligatoria'], [f.cliente, 'El cliente es obligatorio'],
      [f.ordenTrabajo, 'La orden de trabajo es obligatoria'], [f.guiaRemision, 'La guía de remisión es obligatoria'],
    ] as [string, string][]) {
      if (!val.trim()) { this.error = msg; return false; }
    }
    return true;
  }

  esDiferencial(rep: RepotenciacionCajaDto): boolean { return rep.tipoComponente === 'DIFERENCIAL'; }

  // Verdadero si ya existe un registro de recepción en BD (no solo por estado)
  yaFueRecepcionado(rep: RepotenciacionCajaDto): boolean { return !!rep.recepcion; }

  formatearFecha(fecha: any): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatearFechaHora(fecha: any): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  claseEstado(estado: string): string {
    return ({
      PENDIENTE: 'badge-warning', ASIGNADO: 'badge-info', EN_PROCESO: 'badge-info',
      DESARMANDO: 'badge-info', ESPERA_REPUESTOS: 'badge-danger', REPARANDO: 'badge-info',
      COMPLETADO: 'badge-success', ENTREGADO: 'badge-primary', DADA_BAJA: 'badge-dark',
    } as any)[estado] ?? 'badge-secondary';
  }

  iconoEstado(estado: string): string {
    return ({
      PENDIENTE: 'fa-clock', ASIGNADO: 'fa-user-check', EN_PROCESO: 'fa-cog fa-spin',
      DESARMANDO: 'fa-tools', ESPERA_REPUESTOS: 'fa-pause-circle', REPARANDO: 'fa-hammer',
      COMPLETADO: 'fa-check-circle', ENTREGADO: 'fa-box-open', DADA_BAJA: 'fa-ban',
    } as any)[estado] ?? 'fa-question';
  }

  porcentajeEstado(estado: string): number {
    return ({
      PENDIENTE: 10, ASIGNADO: 25, EN_PROCESO: 35, DESARMANDO: 50,
      ESPERA_REPUESTOS: 60, REPARANDO: 75, COMPLETADO: 90, ENTREGADO: 100,
      DADA_BAJA: 100,
    } as any)[estado] ?? 0;
  }

  claseBsEstado(estado: string): string {
    return ({
      PENDIENTE: 'bg-warning', ASIGNADO: 'bg-info', EN_PROCESO: 'bg-info',
      DESARMANDO: 'bg-info', ESPERA_REPUESTOS: 'bg-danger', REPARANDO: 'bg-info',
      COMPLETADO: 'bg-success', ENTREGADO: 'bg-primary', DADA_BAJA: 'bg-dark',
    } as any)[estado] ?? 'bg-secondary';
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024; const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  exportarExcel(): void {
    try {
      const rows = this.repotenciacionesFiltradas.map(rep => ({
        'Tipo': this.esDiferencial(rep) ? 'DIFERENCIAL' : 'CAJA DE CAMBIO',
        'Agencia': rep.agencia, 'Modelo': rep.modelo, 'Serie': rep.serie, 'Cliente': rep.cliente,
        'Orden Trabajo': rep.ordenTrabajo, 'Guía Remisión': rep.guiaRemision,
        'Estado': rep.estado,
        'Fecha Registro': this.formatearFecha(rep.fechaCreacion),
        'Fecha Envío': this.formatearFecha(rep.fechaIngreso),
        'Fecha Recepción Lab.': rep.recepcion ? this.formatearFecha(rep.recepcion.fechaRecepcion) : '—',
        'Recibido Por': rep.recepcion?.recibidoPorNombre ?? '—',
        'Fecha Entrega': this.formatearFecha(rep.fechaEntrega),
        'Usuario': rep.usuariocreaNombre ?? '—', 'Observaciones': rep.observaciones ?? '—',
        'Tiene Placa': rep.imagenPlaca ? 'Sí' : 'No', 'Fotos': rep.fotografias.length,
      }));
      const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Repotenciaciones');
      XLSX.writeFile(wb, `Repotenciaciones_VHCR_${new Date().toISOString().split('T')[0]}.xlsx`);
      this.mostrarMensaje('Excel exportado exitosamente');
    } catch { this.error = 'Error al exportar Excel'; }
  }

  exportarCSV(): void {
    try {
      const rows = this.repotenciacionesFiltradas.map(rep => ({
        'Tipo': this.esDiferencial(rep) ? 'DIFERENCIAL' : 'CAJA DE CAMBIO',
        'Agencia': rep.agencia, 'Modelo': rep.modelo, 'Estado': rep.estado,
        'Fecha Registro': this.formatearFecha(rep.fechaCreacion),
        'Fecha Envío': this.formatearFecha(rep.fechaIngreso),
        'Fecha Recepción Lab.': rep.recepcion ? this.formatearFecha(rep.recepcion.fechaRecepcion) : '—',
        'Usuario': rep.usuariocreaNombre ?? '—',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8;' }));
      a.download = `Repotenciaciones_VHCR_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      this.mostrarMensaje('CSV exportado exitosamente');
    } catch { this.error = 'Error al exportar CSV'; }
  }

  // ============================================================
  // DESCARGA DE IMÁGENES (selección o todas → ZIP)
  // ============================================================

  /**
   * Lista consolidada y sin duplicados de todas las imágenes del detalle,
   * abarcando todas las etapas (adjuntas, desarme, reparación y entrega).
   * `galeriaAdjuntas` ya incluye placa + fotografías + imágenes de recepción.
   */
  get imagenesDescargables(): VisorImagen[] {
    const vistos = new Set<string>();
    const out: VisorImagen[] = [];
    for (const img of [
      ...this.galeriaAdjuntas,
      ...this.imgsDesarme,
      ...this.imgsReparacion,
      ...this.imgsEntrega,
    ]) {
      if (!img?.url || vistos.has(img.url)) continue;
      vistos.add(img.url);
      out.push(img);
    }
    return out;
  }

  abrirModalDescarga(): void {
    if (!this.imagenesDescargables.length) {
      this.error = 'No hay imágenes adjuntas para descargar.';
      return;
    }
    this.imagenesSeleccionadas.clear();
    this.progresoDescarga = '';
    this.mostrarModalDescarga = true;
    this.error = '';
  }

  cerrarModalDescarga(): void {
    if (this.descargandoZip) return;   // no cerrar a mitad de una descarga
    this.mostrarModalDescarga = false;
    this.imagenesSeleccionadas.clear();
  }

  toggleSeleccionImagen(url: string): void {
    if (this.imagenesSeleccionadas.has(url)) this.imagenesSeleccionadas.delete(url);
    else this.imagenesSeleccionadas.add(url);
  }

  estaSeleccionada(url: string): boolean { return this.imagenesSeleccionadas.has(url); }

  seleccionarTodasImagenes(): void {
    this.imagenesDescargables.forEach(i => this.imagenesSeleccionadas.add(i.url));
  }

  limpiarSeleccionImagenes(): void { this.imagenesSeleccionadas.clear(); }

  get totalSeleccionadas(): number { return this.imagenesSeleccionadas.size; }

  descargarSeleccionadas(): void {
    const sel = this.imagenesDescargables.filter(i => this.imagenesSeleccionadas.has(i.url));
    if (!sel.length) { this.error = 'Seleccione al menos una imagen.'; return; }
    this.descargarComoZip(sel, 'Imagenes_seleccion');
  }

  descargarTodasImagenes(): void {
    this.descargarComoZip(this.imagenesDescargables, 'Imagenes_completas');
  }

  /** Descarga la imagen que se está viendo en el visor (lightbox). */
  async descargarImagenActual(): Promise<void> {
    const img = this.visorImagenActual;
    if (!img) return;
    try {
      const blob = await this.fetchImagenBlob(img.url);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = this.nombreArchivoImagen(img, this.visorIndice);
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // Si falla la descarga directa (p. ej. CORS sin proxy) se abre en otra pestaña
      window.open(img.url, '_blank');
    }
  }

  /**
   * Obtiene el blob de una imagen con tolerancia a entornos:
   *  1º intenta la URL tal cual (funciona en producción same-origin o si el
   *     backend envía cabeceras CORS);
   *  2º si falla, reintenta con la ruta relativa al origen actual, lo que en
   *     desarrollo permite pasar por el proxy de Angular y evitar el CORS.
   *
   *  Se envía la cabecera `ngrok-skip-browser-warning` para que, cuando el
   *  servidor se expone vía ngrok, no se intercepte la petición con la página
   *  de advertencia (que rompe el fetch al no traer cabeceras CORS).
   *
   *  Se usa `cache: 'reload'` para evitar reutilizar la copia "opaca" que el
   *  navegador ya guardó al mostrar la imagen en un <img> (esa copia no tiene
   *  cabeceras CORS y bloquearía el fetch); así se pide una copia fresca con CORS.
   */
  private async fetchImagenBlob(url: string): Promise<Blob> {
    const opts: RequestInit = {
      mode: 'cors',
      cache: 'reload',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    };

    try {
      const r = await fetch(url, opts);
      if (r.ok) return await r.blob();
    } catch { /* se intenta el fallback relativo */ }

    try {
      const u = new URL(url, window.location.origin);
      const r = await fetch(u.pathname + u.search, opts);
      if (r.ok) return await r.blob();
    } catch { /* sin más opciones */ }

    throw new Error('No se pudo obtener la imagen');
  }

  /** Descarga un conjunto de imágenes empaquetadas en un único archivo ZIP. */
  private async descargarComoZip(imgs: VisorImagen[], nombreBase: string): Promise<void> {
    if (!imgs.length) { this.error = 'No hay imágenes para descargar.'; return; }

    this.descargandoZip = true; this.error = '';
    const zip = new JSZip();
    const usados = new Set<string>();
    let ok = 0, fallidas = 0;

    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      this.progresoDescarga = `Descargando ${i + 1} / ${imgs.length}...`;
      try {
        const blob = await this.fetchImagenBlob(img.url);

        // Nombre único dentro del ZIP
        let nombre = this.nombreArchivoImagen(img, i);
        while (usados.has(nombre)) {
          const punto = nombre.lastIndexOf('.');
          nombre = punto > 0 ? `${nombre.slice(0, punto)}_${i}${nombre.slice(punto)}` : `${nombre}_${i}`;
        }
        usados.add(nombre);
        zip.file(nombre, blob);
        ok++;
      } catch {
        fallidas++;
      }
    }

    if (ok === 0) {
      this.descargandoZip = false; this.progresoDescarga = '';
      this.error = 'No se pudo descargar ninguna imagen. Verifique la conexión o los permisos (CORS) del servidor de imágenes.';
      return;
    }

    this.progresoDescarga = 'Generando archivo ZIP...';
    const contenido = await zip.generateAsync({ type: 'blob' });
    const ot = (this.repotenciacionSeleccionada?.ordenTrabajo ?? 'orden').toString().replace(/[^a-zA-Z0-9]+/g, '-');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(contenido);
    a.download = `${nombreBase}_OT-${ot}_${new Date().toISOString().split('T')[0]}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);

    this.descargandoZip = false; this.progresoDescarga = '';
    this.mostrarMensaje(fallidas
      ? `ZIP generado: ${ok} imágenes (${fallidas} no se pudieron descargar).`
      : `ZIP generado con ${ok} imágenes.`);
  }

  /** Deriva la extensión de archivo desde la URL (por defecto .jpg). */
  private extensionImagen(url: string): string {
    const limpio = (url || '').split('?')[0].split('#')[0];
    const m = limpio.match(/\.(jpe?g|png|webp|gif|bmp)$/i);
    return m ? m[0].toLowerCase() : '.jpg';
  }

  /** Genera un nombre de archivo legible: <Etapa>_<NN>.<ext> */
  private nombreArchivoImagen(img: VisorImagen, i: number): string {
    const tag = (img.tag || 'imagen')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // quita acentos
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'imagen';
    const num = String(i + 1).padStart(2, '0');
    return `${tag}_${num}${this.extensionImagen(img.url)}`;
  }

  private mostrarMensaje(msg: string): void { this.mensaje = msg; setTimeout(() => this.mensaje = '', 5000); }
}