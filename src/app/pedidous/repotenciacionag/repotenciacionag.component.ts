import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { ReloadService } from 'src/app/services/reload.service';
import {
  RepotenciacionCajaRequest,
  RepotenciacionCajaDto,
  RepotenciacionCajasService,
  EstadisticasRepotenciacion,
  ApiUsuarioListResponse,
  RepotenciacionFiltros,
} from 'src/app/services/repotenciacion-cajas.service';

type PasoProceso = 1 | 2 | 3;
// ── CAMBIO: se agrega 'detalle' como vista válida ──────────────────────────────
type VistaActual = 'listado' | 'formulario' | 'detalle';

interface FormularioInterno {
  agencia: string;
  modelo: string;
  serie: string;
  cliente: string;
  ordenTrabajo: string;
  guiaRemision: string;
  agenciaDif: string;
  modeloDif: string;
  serieDif: string;
  clienteDif: string;
  ordenTrabajoDif: string;
  guiaRemisionDif: string;
  estado: string;
  fechaIngreso: string;
  fechaEntrega: string;
  observaciones: string;
  tutorialUrl: string;
  usuarioCrea: number;
}

// ── NUEVO: obtiene la fecha/hora ACTUAL en la zona horaria de Ecuador ────────
// (America/Guayaquil, UTC-5 sin horario de verano), sin depender de la
// configuración regional del dispositivo del usuario. Formato compatible
// con <input type="datetime-local">: 'yyyy-MM-ddTHH:mm'.
const obtenerFechaHoraEcuador = (): string => {
  const ahora = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const partes = formatter.formatToParts(ahora);
  const obtener = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? '00';
  return `${obtener('year')}-${obtener('month')}-${obtener('day')}T${obtener('hour')}:${obtener('minute')}`;
};

const formularioVacio = (usuarioId: number, agencia: string): FormularioInterno => ({
  agencia,
  modelo: '',
  serie: '',
  cliente: '',
  ordenTrabajo: '',
  guiaRemision: '',
  agenciaDif: '',
  modeloDif: '',
  serieDif: '',
  clienteDif: '',
  ordenTrabajoDif: '',
  guiaRemisionDif: '',
  estado: 'PENDIENTE',
  // ── CAMBIO: fecha de ingreso bloqueada = fecha/hora actual de Ecuador ──────
  fechaIngreso: obtenerFechaHoraEcuador(),
  fechaEntrega: '',
  observaciones: '',
  tutorialUrl: '',
  // ── CAMBIO: siempre ligado al usuario autenticado ───────────────────────────
  usuarioCrea: usuarioId,
});

@Component({
  selector: 'app-repotenciacionag',
  templateUrl: './repotenciacionag.component.html',
  styleUrls: ['./repotenciacionag.component.css'],
})
export class RepotenciacionagComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════
  // CONTROL DE VISTAS
  // ═══════════════════════════════════════════════════════════
  vistaActual: VistaActual = 'listado';

  // ═══════════════════════════════════════════════════════════
  // USUARIO (siempre del authService, nunca editable)
  // ═══════════════════════════════════════════════════════════
  usuario1: Usuario | null = null;
  /** ID del usuario logueado; se usa en todas las llamadas al API */
  id = 0;
  private subscription = new Subscription();
  errorMessage: any;

  // ═══════════════════════════════════════════════════════════
  // LISTADO
  // ═══════════════════════════════════════════════════════════
  repotenciaciones: RepotenciacionCajaDto[] = [];
  repotenciacionesFiltradas: RepotenciacionCajaDto[] = [];
  estadisticas: EstadisticasRepotenciacion | null = null;
  cargandoListado = false;
  filtroBusqueda = '';
  filtroEstado = '';                 // ── NUEVO: filtro por estado ──────────────

  // ── NUEVO: estados disponibles para el filtro ──────────────────────────────
  readonly estadosDisponibles = ['PENDIENTE', 'EN PROCESO', 'COMPLETADO', 'ENTREGADO'];

  // ═══════════════════════════════════════════════════════════
  // DETALLE  ── NUEVO ─────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════
  repotenciacionDetalle: RepotenciacionCajaDto | null = null;
  cargandoDetalle = false;

  // ── Modal de imagen ampliada ───────────────────────────────
  modalImagenUrl: string | null = null;
  modalImagenLabel  = '';
  modalImagenIndex  = -1;        // índice activo en el array combinado
  modalImagenes: { url: string; label: string }[] = [];  // todas las imgs para navegar

  // ═══════════════════════════════════════════════════════════
  // WIZARD / FORMULARIO
  // ═══════════════════════════════════════════════════════════
  pasoActual: PasoProceso = 1;
  // ── CAMBIO: ahora son dos interruptores independientes; al menos uno debe
  // estar activo. Antes la Caja de Cambio era siempre obligatoria. ──────────
  incluyeCaja = true;
  tieneDiferencial = false;
  formulario!: FormularioInterno;

  // Archivos de imagen
  archivoPlaca: File | null = null;
  archivosFotografias: File[] = [];
  previsualizacionPlaca: string | null = null;
  previsualizacionesFotos: string[] = [];

  // Estado de UI
  cargando = false;
  error = '';
  mensaje = '';
  exitoso = false;
  idCreado: number | null = null;

  constructor(
    private svc: RepotenciacionCajasService,
    private reloadService: ReloadService,
    private authService: AuthService
  ) {}

  // ═══════════════════════════════════════════════════════════
  // CICLO DE VIDA
  // ═══════════════════════════════════════════════════════════
  ngOnInit(): void {
    this.subscription.add(
      this.authService.usuarioActual$.subscribe(usuario => {
        this.usuario1 = usuario;
        if (this.usuario1?.id) {
          // ── CAMBIO: guardamos el ID y cargamos SOLO los datos del usuario ──
          this.id = this.usuario1.id;
          console.log(this.id);
          
          this.cargarListado();
        } else {
          console.warn('No se pudo obtener el ID del usuario.');
          this.errorMessage = 'No se pudo cargar los pedidos: Usuario no autenticado.';
        }
      })
    );

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        if (this.vistaActual === 'listado' && this.usuario1?.id) {
          this.cargarListado();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }

  // ═══════════════════════════════════════════════════════════
  // NAVEGACIÓN ENTRE VISTAS
  // ═══════════════════════════════════════════════════════════

  irANuevaSolicitud(): void {
    this.inicializarFormulario();
    this.vistaActual = 'formulario';
    this.pasoActual = 1;
    this.error = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  volverAlListado(): void {
    this.vistaActual = 'listado';
    this.repotenciacionDetalle = null;
    this.resetearFormulario();
    this.cargarListado();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── NUEVO: abre la vista detalle del registro seleccionado ─────────────────
  verDetalle(id: number): void {
    this.cargandoDetalle = true;
    this.error = '';
    this.vistaActual = 'detalle';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.svc.getById(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargandoDetalle = false)
      )
      .subscribe({
        next: (res) => {
          this.repotenciacionDetalle = res.data;
        },
        error: (err) => {
          this.error = `Error al cargar el detalle: ${err.error?.message ?? err.message}`;
          this.vistaActual = 'listado';
        }
      });
  }

  // ═══════════════════════════════════════════════════════════
  // CARGA DE DATOS (LISTADO)
  // ═══════════════════════════════════════════════════════════

  cargarListado(filtros?: Omit<RepotenciacionFiltros, 'usuarioCrea'>): void {
    if (!this.id) return;

    this.cargandoListado = true;
    this.error = '';

    // ── Usa el nuevo endpoint dedicado: GET /api/RepotenciacionCajas/usuario/{id} ──
    this.svc.getByUsuario(this.id, filtros)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargandoListado = false)
      )
      .subscribe({
        next: (res: ApiUsuarioListResponse<RepotenciacionCajaDto>) => {
          this.repotenciaciones = res.data || [];
          this.aplicarFiltros();
        },
        error: (err) => {
          this.error = `Error al cargar repotenciaciones: ${err.error?.message ?? err.message}`;
        }
      });

    // Estadísticas filtradas por usuario
    this.svc.getEstadisticasPorUsuario(this.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => { this.estadisticas = res; },
        error: ()   => { this.estadisticas = null; }
      });
  }

  // ── CAMBIO: un único método que aplica búsqueda + filtro de estado ─────────
  aplicarFiltros(): void {
    let resultado = [...this.repotenciaciones];

    const termino = this.filtroBusqueda.toLowerCase().trim();
    if (termino) {
      resultado = resultado.filter(rep =>
        rep.modelo.toLowerCase().includes(termino)        ||
        rep.serie.toLowerCase().includes(termino)         ||
        rep.cliente.toLowerCase().includes(termino)       ||
        rep.ordenTrabajo.toLowerCase().includes(termino)
      );
    }

    if (this.filtroEstado) {
      resultado = resultado.filter(rep =>
        rep.estado.toUpperCase() === this.filtroEstado.toUpperCase()
      );
    }

    this.repotenciacionesFiltradas = resultado;
  }

  // Mantiene compatibilidad con el (input) del HTML actual
  filtrarRepotenciaciones(): void {
    this.aplicarFiltros();
  }

  // ── Envía los filtros actuales directamente al nuevo endpoint del servidor ──
  buscarEnServidor(): void {
    this.cargarListado({
      busqueda: this.filtroBusqueda || undefined,
      estado:   this.filtroEstado   || undefined,
    });
  }

  // ── Limpia filtros locales Y recarga desde el servidor sin filtros ──────────
  limpiarFiltros(): void {
    this.filtroBusqueda = '';
    this.filtroEstado   = '';
    this.cargarListado();
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS DE VISTA
  // ═══════════════════════════════════════════════════════════

  getEstadoClase(estado: string): string {
    const map: { [key: string]: string } = {
      'PENDIENTE'  : 'pendiente',
      'EN PROCESO' : 'en-proceso',
      'COMPLETADO' : 'completado',
      'ENTREGADO'  : 'entregado',
    };
    return map[estado.toUpperCase()] || 'pendiente';
  }

  getEstadoIcono(estado: string): string {
    const map: { [key: string]: string } = {
      'PENDIENTE'  : 'fa-clock',
      'EN PROCESO' : 'fa-cog fa-spin',
      'COMPLETADO' : 'fa-check-circle',
      'ENTREGADO'  : 'fa-box-open',
    };
    return map[estado.toUpperCase()] || 'fa-question-circle';
  }

  // ── NUEVO: descripción amigable del estado ─────────────────────────────────
  getEstadoDescripcion(estado: string): string {
    const map: { [key: string]: string } = {
      'PENDIENTE'  : 'Tu solicitud fue recibida y está en espera de ser procesada.',
      'EN PROCESO' : 'El equipo de laboratorio está trabajando en tu componente.',
      'COMPLETADO' : 'El trabajo ha finalizado. Pronto te contactaremos para coordinar la entrega.',
      'ENTREGADO'  : 'El componente fue entregado satisfactoriamente.',
    };
    return map[estado.toUpperCase()] || 'Estado desconocido.';
  }

  // ── NUEVO: porcentaje de progreso del estado ───────────────────────────────
  getEstadoPorcentaje(estado: string): number {
    const map: { [key: string]: number } = {
      'PENDIENTE'  : 10,
      'EN PROCESO' : 50,
      'COMPLETADO' : 90,
      'ENTREGADO'  : 100,
    };
    return map[estado.toUpperCase()] ?? 0;
  }

  // ── CAMBIO: clase propia (paleta azul/gris) para la barra de progreso ─────
  getProgresoBsClase(estado: string): string {
    const map: { [key: string]: string } = {
      'PENDIENTE'  : 'progreso-pendiente',
      'EN PROCESO' : 'progreso-proceso',
      'COMPLETADO' : 'progreso-completado',
      'ENTREGADO'  : 'progreso-entregado',
    };
    return map[estado.toUpperCase()] || 'progreso-pendiente';
  }

  // ═══════════════════════════════════════════════════════════
  // WIZARD - FORMULARIO
  // ═══════════════════════════════════════════════════════════

  // ── NUEVO: se ejecuta al cambiar el interruptor de Caja de Cambio ─────────
  // Evita que ambos interruptores (Caja y Diferencial) queden desactivados.
  onCajaChange(valor: boolean): void {
    if (!valor && !this.tieneDiferencial) {
      this.incluyeCaja = true;
      this.error = 'Debe incluir al menos la Caja de Cambio o el Diferencial.';
      return;
    }
    if (!valor) {
      // Se desactivó la Caja de Cambio: limpiamos sus campos.
      this.formulario.agencia = this.usuario1?.agencia || '';
      this.formulario.modelo = '';
      this.formulario.serie = '';
      this.formulario.cliente = '';
      this.formulario.ordenTrabajo = '';
      this.formulario.guiaRemision = '';
    }
  }

  // ── NUEVO: se ejecuta al cambiar el interruptor de Diferencial ────────────
  onDiferencialChange(valor: boolean): void {
    if (!valor && !this.incluyeCaja) {
      this.tieneDiferencial = true;
      this.error = 'Debe incluir al menos la Caja de Cambio o el Diferencial.';
      return;
    }
    if (!valor) {
      // Se desactivó el Diferencial: limpiamos sus campos.
      this.formulario.agenciaDif = '';
      this.formulario.modeloDif = '';
      this.formulario.serieDif = '';
      this.formulario.clienteDif = '';
      this.formulario.ordenTrabajoDif = '';
      this.formulario.guiaRemisionDif = '';
    }
  }

  // ── NUEVO: etiqueta del tipo de solicitud según lo que esté incluido ──────
  get tituloTipoSolicitud(): string {
    if (this.incluyeCaja && this.tieneDiferencial) return 'CAJA DE CAMBIO + DIFERENCIAL';
    if (this.tieneDiferencial) return 'SOLO DIFERENCIAL';
    return 'SOLO CAJA DE CAMBIO';
  }

  // ── NUEVO: clase CSS del badge de tipo de solicitud (paleta azul/gris) ────
  get claseTipoSolicitud(): string {
    if (this.incluyeCaja && this.tieneDiferencial) return 'badge-tipo-mixta';
    if (this.tieneDiferencial) return 'badge-tipo-dif';
    return 'badge-tipo-caja';
  }

  // ── NUEVO: helpers para el badge de tipo en la vista DETALLE (registros ya
  // guardados), que ahora pueden ser solo caja, solo diferencial, o ambos ───
  private detalleTieneCaja(rep: RepotenciacionCajaDto): boolean {
    return !!(rep.modelo && rep.modelo.trim());
  }

  getTipoBadgeClase(rep: RepotenciacionCajaDto): string {
    const caja = this.detalleTieneCaja(rep);
    const dif = !!rep.modeloDif;
    if (caja && dif) return 'badge-tipo-mixta';
    if (dif) return 'badge-tipo-dif';
    return 'badge-tipo-caja';
  }

  getTipoBadgeTexto(rep: RepotenciacionCajaDto): string {
    const caja = this.detalleTieneCaja(rep);
    const dif = !!rep.modeloDif;
    if (caja && dif) return 'CAJA DE CAMBIO + DIFERENCIAL';
    if (dif) return 'SOLO DIFERENCIAL';
    return 'SOLO CAJA DE CAMBIO';
  }

  getTipoBadgeIcono(rep: RepotenciacionCajaDto): string {
    const dif = !!rep.modeloDif;
    const caja = this.detalleTieneCaja(rep);
    return (dif && !caja) ? 'fa-wrench' : 'fa-cog';
  }

  get tituloPaso(): string {
    if (this.pasoActual === 1) return 'Datos del Componente';
    if (this.pasoActual === 2) return 'Fotografías del Componente';
    return this.exitoso ? '¡Solicitud Enviada!' : 'Confirmar Solicitud';
  }

  irPaso(paso: PasoProceso): void {
    if (paso > this.pasoActual) {
      if (paso >= 2 && !this.validarPaso1()) return;
      if (paso >= 3 && !this.validarPaso2()) return;
    }
    this.pasoActual = paso;
    this.error = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  siguiente(): void {
    if (this.pasoActual === 1) {
      if (!this.validarPaso1()) return;
      this.pasoActual = 2;
    } else if (this.pasoActual === 2) {
      if (!this.validarPaso2()) return;
      this.pasoActual = 3;
    }
    this.error = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  anterior(): void {
    if (this.pasoActual > 1) {
      this.pasoActual = (this.pasoActual - 1) as PasoProceso;
      this.error = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // VALIDACIONES
  // ═══════════════════════════════════════════════════════════

  validarPaso1(): boolean {
    const f = this.formulario;

    // ── CAMBIO: debe incluirse al menos un bloque (Caja y/o Diferencial) ────
    if (!this.incluyeCaja && !this.tieneDiferencial) {
      this.error = 'Debe incluir al menos la Caja de Cambio o el Diferencial.';
      return false;
    }

    // ── CAMBIO: la Caja de Cambio solo se valida si está incluida ───────────
    if (this.incluyeCaja) {
      const camposCaja: [string, string][] = [
        [f.agencia,      'La agencia de la caja es obligatoria.'],
        [f.modelo,       'El modelo de la caja es obligatorio.'],
        [f.serie,        'La serie de la caja es obligatoria.'],
        [f.cliente,      'El cliente es obligatorio.'],
        [f.ordenTrabajo, 'La orden de trabajo es obligatoria.'],
        [f.guiaRemision, 'La guía de remisión es obligatoria.'],
      ];

      for (const [val, msg] of camposCaja) {
        if (!val.trim()) { this.error = msg; return false; }
      }
    }

    // La fecha de ingreso ya no se valida: queda bloqueada y se autocompleta
    // con la fecha/hora actual de Ecuador (ver obtenerFechaHoraEcuador()).

    // ── CAMBIO: el Diferencial solo se valida si está incluido ──────────────
    if (this.tieneDiferencial) {
      const camposDif: [string | undefined, string][] = [
        [f.agenciaDif,      'La agencia del diferencial es obligatoria.'],
        [f.modeloDif,       'El modelo del diferencial es obligatorio.'],
        [f.serieDif,        'La serie del diferencial es obligatoria.'],
        [f.clienteDif,      'El cliente del diferencial es obligatorio.'],
        [f.ordenTrabajoDif, 'La orden de trabajo del diferencial es obligatoria.'],
        [f.guiaRemisionDif, 'La guía de remisión del diferencial es obligatoria.'],
      ];

      for (const [val, msg] of camposDif) {
        if (!val?.trim()) { this.error = msg; return false; }
      }
    }

    this.error = '';
    return true;
  }

  validarPaso2(): boolean {
    if (!this.archivoPlaca) {
      this.error = 'Debe cargar la imagen de la placa del componente.';
      return false;
    }
    if (this.archivosFotografias.length !== 4) {
      this.error = `Debe tener exactamente 4 fotografías. Actualmente tiene ${this.archivosFotografias.length}.`;
      return false;
    }
    this.error = '';
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  // MANEJO DE IMÁGENES
  // ═══════════════════════════════════════════════════════════

  async onPlacaSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const err = this.svc.validarImagen(file);
    if (err) { this.error = err; input.value = ''; return; }

    this.archivoPlaca = file;
    this.previsualizacionPlaca = await this.svc.previsualizarImagen(file);
    this.error = '';
  }

  async onFotografiasSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (files.length !== 4) {
      this.error = `Debes seleccionar exactamente 4 fotos. Seleccionaste ${files.length}.`;
      input.value = '';
      return;
    }

    for (const f of files) {
      const err = this.svc.validarImagen(f);
      if (err) { this.error = err; input.value = ''; return; }
    }

    this.archivosFotografias = files;
    this.previsualizacionesFotos = await Promise.all(
      files.map(f => this.svc.previsualizarImagen(f))
    );
    this.error = '';
  }

  eliminarPlaca(): void {
    this.archivoPlaca = null;
    this.previsualizacionPlaca = null;
  }

  eliminarFoto(index: number): void {
    this.archivosFotografias     = this.archivosFotografias.filter((_, i) => i !== index);
    this.previsualizacionesFotos = this.previsualizacionesFotos.filter((_, i) => i !== index);
  }

  // ═══════════════════════════════════════════════════════════
  // ENVÍO DE SOLICITUD
  // ═══════════════════════════════════════════════════════════

  enviarSolicitud(): void {
    if (!this.validarPaso1() || !this.validarPaso2()) return;

    this.cargando = true;
    this.error = '';

    // ── CAMBIO: los campos de Caja solo se envían si el bloque está incluido.
    // NOTA: si el backend exige estas columnas como NOT NULL, deben permitir
    // valores vacíos/nulos para el caso "solo diferencial" — conviene
    // confirmar esto contra RepotenciacionCajaRequest / la tabla en BD.
    const request: RepotenciacionCajaRequest = {
      agencia:      this.incluyeCaja ? this.formulario.agencia      : '',
      modelo:       this.incluyeCaja ? this.formulario.modelo       : '',
      serie:        this.incluyeCaja ? this.formulario.serie        : '',
      cliente:      this.incluyeCaja ? this.formulario.cliente      : '',
      ordenTrabajo: this.incluyeCaja ? this.formulario.ordenTrabajo : '',
      guiaRemision: this.incluyeCaja ? this.formulario.guiaRemision : '',
      estado:       'PENDIENTE',
      // ── CAMBIO: siempre viene del usuario autenticado ─────────────────────
      usuarioCrea:  this.id,

      fechaIngreso:  this.formulario.fechaIngreso  || undefined,
      fechaEntrega:  this.formulario.fechaEntrega  || undefined,
      observaciones: this.formulario.observaciones || undefined,
      tutorialUrl:   this.formulario.tutorialUrl   || undefined,

      agenciaDif:      this.tieneDiferencial ? (this.formulario.agenciaDif      || undefined) : undefined,
      modeloDif:       this.tieneDiferencial ? (this.formulario.modeloDif       || undefined) : undefined,
      serieDif:        this.tieneDiferencial ? (this.formulario.serieDif        || undefined) : undefined,
      clienteDif:      this.tieneDiferencial ? (this.formulario.clienteDif      || undefined) : undefined,
      ordenTrabajoDif: this.tieneDiferencial ? (this.formulario.ordenTrabajoDif || undefined) : undefined,
      guiaRemisionDif: this.tieneDiferencial ? (this.formulario.guiaRemisionDif || undefined) : undefined,

      imagenPlaca: this.archivoPlaca,
      fotografias: this.archivosFotografias,
    };

    this.svc.create(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false),
      )
      .subscribe({
        next: res => {
          this.idCreado   = res.id ?? null;
          this.exitoso    = true;
          this.pasoActual = 3;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: err => {
          this.error = `Error al enviar la solicitud: ${err.error?.message ?? err.message}`;
        },
      });
  }

  // ═══════════════════════════════════════════════════════════
  // UTILIDADES PRIVADAS
  // ═══════════════════════════════════════════════════════════

  private inicializarFormulario(): void {
    this.formulario = formularioVacio(this.id, this.usuario1?.agencia || '');
  }

  private resetearFormulario(): void {
    this.pasoActual       = 1;
    this.exitoso          = false;
    this.idCreado         = null;
    this.incluyeCaja      = true;
    this.tieneDiferencial = false;
    this.archivoPlaca     = null;
    this.archivosFotografias     = [];
    this.previsualizacionPlaca   = null;
    this.previsualizacionesFotos = [];
    this.error   = '';
    this.mensaje = '';
  }

  nuevaSolicitud(): void {
    this.resetearFormulario();
    this.inicializarFormulario();
    this.pasoActual = 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    if (bytes >= k * k) return `${(bytes / (k * k)).toFixed(1)} MB`;
    return `${(bytes / k).toFixed(0)} KB`;
  }

  // ═══════════════════════════════════════════════════════════
  // MODAL DE IMAGEN AMPLIADA
  // ═══════════════════════════════════════════════════════════

  /** Abre el modal con la imagen clickeada y precarga todas las del detalle para navegar */
  abrirModalImagen(url: string, label: string, rep: RepotenciacionCajaDto): void {
    // Construir array de todas las imágenes en orden: placa primero, luego fotos
    this.modalImagenes = [];
    if (rep.imagenPlaca) {
      this.modalImagenes.push({ url: rep.imagenPlaca.url, label: 'Placa' });
    }
    rep.fotografias?.forEach((f, i) => {
      this.modalImagenes.push({ url: f.url, label: `Vista ${i + 1}` });
    });

    this.modalImagenIndex = this.modalImagenes.findIndex(m => m.url === url);
    if (this.modalImagenIndex === -1) this.modalImagenIndex = 0;

    this.modalImagenUrl   = this.modalImagenes[this.modalImagenIndex].url;
    this.modalImagenLabel = this.modalImagenes[this.modalImagenIndex].label;
    document.body.style.overflow = 'hidden'; // evita scroll de fondo
  }

  /** Cierra el modal */
  cerrarModalImagen(): void {
    this.modalImagenUrl  = null;
    this.modalImagenLabel = '';
    this.modalImagenIndex = -1;
    document.body.style.overflow = '';
  }

  /** Navega a la imagen anterior */
  modalAnterior(): void {
    if (this.modalImagenes.length < 2) return;
    this.modalImagenIndex = (this.modalImagenIndex - 1 + this.modalImagenes.length) % this.modalImagenes.length;
    this.modalImagenUrl   = this.modalImagenes[this.modalImagenIndex].url;
    this.modalImagenLabel = this.modalImagenes[this.modalImagenIndex].label;
  }

  /** Navega a la imagen siguiente */
  modalSiguiente(): void {
    if (this.modalImagenes.length < 2) return;
    this.modalImagenIndex = (this.modalImagenIndex + 1) % this.modalImagenes.length;
    this.modalImagenUrl   = this.modalImagenes[this.modalImagenIndex].url;
    this.modalImagenLabel = this.modalImagenes[this.modalImagenIndex].label;
  }
}