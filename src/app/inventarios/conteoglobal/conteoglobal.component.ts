import { Component, Input, OnInit, OnDestroy, NgZone } from '@angular/core';
import { RepuestoInventario, InventarioService } from 'src/app/services/inventario.service';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ConteoUnificadoDto } from 'src/app/services/inventario.service';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';
import { ActivatedRoute, Router } from '@angular/router';
import { SseConteosService } from 'src/app/services/sse-conteos.service';


/** ✅ NUEVO: Detalle individual de cada conteo realizado (por ubicación) */
interface ConteoDetalleUbicacion {
  ubicacion: string;
  cantidad: number | null;
  usuario: string;
  fecha: string;
  estadoProducto?: string;
  observaciones?: string;
  origen: 'backend' | 'sesion';
  textoOriginal?: string;

  // ✅ NUEVO: edición de un conteo propio desde el modal de detalle
  conteoId?: number | null;       // id del registro en el backend (necesario para actualizar)
  usuarioContadorId?: string | null; // id numérico del usuario_contador (validación de propiedad exacta)
  editando?: boolean;             // la fila del modal está en modo edición
  edit_cantidad?: number | null;  // valores temporales mientras se edita
  edit_ubicacion?: string;
  edit_estado?: string;
  edit_observaciones?: string;
  edit_guardando?: boolean;       // spinner al guardar la edición

  // ✅ NUEVO: marca temporal para resaltar una fila recién llegada por polling en tiempo real
  esNuevo?: boolean;

  // ✅ NUEVO (anti pérdida): idempotencia + estado de sincronización
  clientOpId?: string;   // id de operación idempotente (uuid) generado por el cliente
  pendiente?: boolean;   // true = aún NO confirmado por el backend (muestra badge)
}


interface RepuestoConteo extends RepuestoInventario {
  conteo_fisico?: number;
  diferencia?: number;
  observaciones?: string;
  estado_conteo?: 'pendiente' | 'contado' | 'diferencia';
  guardado_backend?: boolean;

  // ✅ NUEVO: campos tipados para el seguimiento multi-conteo
  numero_conteos?: number;
  conteos_detalle?: ConteoDetalleUbicacion[];
  imagenes_conteo?: string[];          // URLs de imágenes ya guardadas en backend
  imagenes_locales?: ImagenConteoLocal[]; // Imágenes cargadas en esta sesión
  estado_producto?: string;
  contado_por?: string;
  ubicacion_conteo?: string;
  ubicacion_conteo_detalle?: string;
  primera_fecha_conteo?: string | null;
  ultima_fecha_conteo?: string | null;
  requiere_reconteo?: boolean;
  motivo_reconteo?: string;

  // ✅ NUEVO: marca los artículos que NO están en el inventario del sistema
  // (contados con el flujo "Artículo Nuevo" o conteos huérfanos traídos del backend).
  es_articulo_nuevo?: boolean;

  // ✅ NUEVO: campos de EDICIÓN INLINE (conteo directo sobre la fila, sin modal)
  inline_cantidad?: number | null;      // cantidad de ESTE conteo (se suma al acumulado)
  inline_ubicacion?: string;            // ubicación física donde se contó
  inline_estado?: string;               // estado del producto en este conteo
  inline_observaciones?: string;        // observación de este conteo
  inline_imagenes?: ImagenConteoLocal[];// fotos tomadas para este conteo (antes de guardar)
  inline_guardando?: boolean;           // spinner del botón guardar de la fila
  inline_procesandoFoto?: boolean;      // ✅ NUEVO: spinner mientras se comprime la foto recién tomada

  // ✅ NUEVO (anti pérdida): nº de conteos de esta fila aún sin sincronizar con el backend
  conteos_pendientes?: number;
}


interface ImagenConteoLocal {
  archivo: File;
  preview: string;
  descripcion: string;
  esPrincipal: boolean;
}


/** ✅ NUEVO (anti pérdida): item de la cola de guardados que no se pudieron
 *  confirmar y se reintentan en segundo plano con idempotencia (clientOpId). */
interface ConteoPendiente {
  clientOpId: string;
  formData: FormData;
  rep: RepuestoConteo;
  detalle: ConteoDetalleUbicacion | null;  // fila del detalle a marcar como sincronizada
  intentos: number;
  ultimoError?: string;
}



/** Mapa: ID numérico de agencia → código de bodega y nombre */
const BODEGAS_MAP: Record<number, { codigo: string; nombre: string }> = {
   1: { codigo: 'B001', nombre: 'MATRIZ' },
   2: { codigo: 'B002', nombre: 'FICOA' },
   3: { codigo: 'B005', nombre: 'RIOBAMBA' },
   4: { codigo: 'B007', nombre: 'QUITO NORTE' },
   5: { codigo: 'B008', nombre: 'GUAYAQUIL SAMBORONDON' },
   6: { codigo: 'B009', nombre: 'MACHALA' },
   7: { codigo: 'B010', nombre: 'CUENCA' },
   8: { codigo: 'B011', nombre: 'QUITO SUR' },
   9: { codigo: 'B012', nombre: 'GUAYAQUIL SUR' },
  10: { codigo: 'B013', nombre: 'MANTA' },
  11: { codigo: 'B014', nombre: 'QUITO PIFO' },
  12: { codigo: 'B015', nombre: 'QUITO COLIBRI' },
  13: { codigo: 'B017', nombre: 'IBARRA' },
  14: { codigo: 'B018', nombre: 'CUENCA HUAYNA CAPAC' },
  15: { codigo: 'B019', nombre: 'QUITO GRANADOS' },
  16: { codigo: 'B021', nombre: 'CUENCA TALLERES' },
  17: { codigo: 'B022', nombre: 'GUAYAQUIL JUAN TANCA' },
  18: { codigo: 'B023', nombre: 'YANTZAZA' },
  19: { codigo: 'B024', nombre: 'QUITO NACIONES UNIDAS' },
  20: { codigo: 'B025', nombre: 'FICOA LYNC & CO' },
};

@Component({
  selector: 'app-conteoglobal',
  templateUrl: './conteoglobal.component.html',
  styleUrls: ['./conteoglobal.component.css']
})
export class ConteoglobalComponent implements OnInit, OnDestroy {

    @Input() agenciaId: number = 0;
  repuestos: RepuestoConteo[] = [];
  repuestosFiltrados: RepuestoConteo[] = [];

  // Filtros
  bodegaSeleccionada: string = '';
  bodegaSeleccionadaid: string = '';
  agenciaNombre: string = '';
  busquedaTexto: string = '';
  // ✅ El filtro de texto no se aplica en cada tecla: se espera 300ms sin cambios.
  private busquedaTexto$ = new Subject<string>();
  filtroEstado: string = 'todos';
  ordenCosto: string = 'ninguno';

  // ✅ Filtro por clase_id
  filtroClaseId: string = 'todas';
  clasesDisponibles: string[] = [];

  // ✅ NUEVO: Filtro por grupo_id
  filtroGrupoId: string = 'todos';
  gruposDisponibles: string[] = [];

  // ✅ Ordenamiento por cabeceras de tabla
  columnaOrden: string = '';
  direccionOrden: 'asc' | 'desc' = 'asc';

  // ✅ Modal para artículo nuevo (no en inventario)
  esArticuloNuevo: boolean = false;
  nuevoArticuloCodigo: string = '';
  nuevoArticuloNombre: string = '';

  // Estadísticas
  totalRepuestos: number = 0;
  contados: number = 0;
  pendientes: number = 0;
  conDiferencias: number = 0;
  // ✅ NUEVO: avance de revisión real (artículos con al menos un conteo)
  revisados: number = 0;
  porcentajeContadosOk: number = 0;
  porcentajeConDiferencias: number = 0;
  // ✅ RENDIMIENTO: porcentaje precalculado (antes se recalculaba en cada ciclo de Angular)
  private porcentajeProgresoCache: number = 0;

  // Estado de carga
  cargando: boolean = false;
  errorMensaje: string = '';

  // ✅ NUEVO: acordeón de filtros (colapsado por defecto en móvil, abierto en escritorio)
  filtrosAbiertos: boolean = true;
  filtrosActivosCount: number = 0;

  // ✅ NUEVO: acordeón de estadísticas (tarjetas + avance). En móvil arranca cerrado
  // para que la tabla quede a la vista cuanto antes; en escritorio arranca abierto.
  estadisticasAbiertas: boolean = true;

  // Paginación
  // ✅ RENDIMIENTO: antes se renderizaban hasta 2000 filas a la vez (miles de nodos DOM
  // con inputs, botones, spinners e imágenes cada una). Eso era LO que hacía lenta la
  // pantalla, sobre todo en celular: cada tecla o tick del polling obligaba a Angular a
  // re-verificar TODAS esas filas. Ahora la página muestra 100 por defecto y el usuario
  // puede subirlo si lo necesita (el filtro/búsqueda sigue operando sobre TODO el inventario).
  paginaActual: number = 1;
  itemsPorPagina: number = 100;
  totalPaginas: number = 0;
  readonly opcionesItemsPorPagina: number[] = [50, 100, 200, 500, 1000, 2000];
  // ✅ RENDIMIENTO: la página visible ahora es un ARRAY PRECALCULADO, no un getter.
  // El getter anterior ejecutaba .slice() + console.log en CADA ciclo de detección de
  // cambios de Angular (cada tecla, cada evento, cada tick de polling).
  repuestosPaginados: RepuestoConteo[] = [];
  private paginasArrayCache: number[] = [];

  // Modal de Observaciones
  modalObservacionesAbierto: boolean = false;
  repuestoSeleccionado: RepuestoConteo | null = null;
  observacionesTemporal: string = '';

  // ✅ NUEVO: Modal de detalle de conteos por ubicación
  modalConteosAbierto: boolean = false;
  repuestoConteosDetalle: RepuestoConteo | null = null;

  // ✅ Auto-refresco (polling) del detalle de conteos mientras el modal está abierto.
  private readonly INTERVALO_POLLING_CONTEOS_MS = 6000;
  private pollingConteosHandle: any = null;
  sincronizandoConteos: boolean = false;
  ultimaSincronizacionConteos: Date | null = null;
  private idsConteoVistos: Set<number> = new Set<number>();
  // ✅ FIX anti-bloqueo: marca de tiempo de la petición en curso. Si una petición
  // queda colgada (red móvil, app en segundo plano), pasados 60s se permite una nueva
  // en vez de saltarse todos los ticks para siempre.
  private sincronizandoConteosDesde: number = 0;

  // ✅ Auto-refresco GLOBAL: tarjetas de arriba + toda la tabla.
  // Con SSE activo, el poll global pasa a ser RED DE SEGURIDAD (por si el aviso
  // SSE se pierde o la conexión está caída). Por eso se espacia de 15s a 60s.
  private readonly INTERVALO_POLLING_GLOBAL_MS = 60000;
  private pollingGlobalHandle: any = null;
  sincronizandoGlobal: boolean = false;
  ultimaSincronizacionGlobal: Date | null = null;
  private sincronizandoGlobalDesde: number = 0;
  private readonly TIMEOUT_SINCRONIZACION_MS = 60000;

  // ✅ SSE: si llega un aviso mientras YA hay un refresco global en curso, en vez de
  //    descartarlo (antes se perdía y había que esperar al siguiente aviso o al poll),
  //    marcamos que quedó un refresco pendiente. Al terminar el refresco actual, si
  //    esta marca está activa, se dispara UNO más. Así ningún aviso se pierde y varios
  //    avisos en ráfaga se colapsan en un solo refresco extra al final.
  private refrescoGlobalPendiente: boolean = false;

  // ✅ NUEVO (anti pérdida): COLA DE GUARDADOS PENDIENTES.
  // Si un guardado agota los reintentos del service, NO se finge éxito: el conteo
  // queda encolado aquí y se reintenta en segundo plano mientras la app esté abierta.
  private colaPendientes: ConteoPendiente[] = [];
  private pollingPendientesHandle: any = null;
  private readonly INTERVALO_POLLING_PENDIENTES_MS = 10000;
  procesandoPendientes: boolean = false;
  get totalPendientes(): number { return this.colaPendientes.length; }

  // ✅ SSE TIEMPO REAL: suscripción a los avisos "refresca" del backend.
  //    Se desarma en ngOnDestroy. El EventSource lo maneja SseConteosService.
  private sseSub?: Subscription;

  // ✅ FIX CRÍTICO del polling: antes, el listener de visibilitychange era agregado por
  // iniciarPolling...() y REMOVIDO por detenerPolling...(). Al ocultarse la pantalla
  // (bloquear el celular, cambiar de pestaña) el handler llamaba a detener..., que
  // eliminaba el propio listener → al volver a la pantalla ya nadie reanudaba el
  // polling y quedaba muerto hasta recargar. Ahora hay UN solo listener que se
  // registra en ngOnInit y solo se quita en ngOnDestroy; ocultar/mostrar la pantalla
  // únicamente PAUSA/REANUDA los intervalos, y al volver se refresca de inmediato
  // (sin esperar el próximo tick).
  private onCambioVisibilidadDocumento = () => {
    if (document.hidden) {
      this.pausarPollingGlobal();
      this.pausarPollingConteos();
    } else {
      if (this.repuestos.length > 0) {
        this.iniciarPollingGlobal();
        this.sincronizarConteosGlobal();      // refresco inmediato al volver
      }
      if (this.modalConteosAbierto) {
        this.iniciarPollingConteos();
        this.refrescarConteosDetalleActivo(); // refresco inmediato del modal al volver
      }
      // ✅ NUEVO: al volver a la pantalla, reintentar de inmediato lo pendiente
      if (this.colaPendientes.length > 0) {
        this.iniciarPollingPendientes();
        this.procesarColaPendientes();
      }
    }
  };

  // ✅ NUEVO: Modal de galería de imágenes
  modalImagenesAbierto: boolean = false;
  repuestoImagenes: RepuestoConteo | null = null;
  imagenAmpliada: string | null = null;

  // ✅ NUEVO: Indica que el conteo que se está registrando es adicional (ya existe conteo previo)
  esConteoAdicional: boolean = false;

  // Para usar Math en el template
  Math = Math;

    id: number = 0;
    usuario: Usuario | null = null;
    agen: string = '';
    rol: any;

  constructor(
    private inventarioService: InventarioService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone ,  // ✅ RENDIMIENTO: para sacar los intervalos del polling de la zona de Angular
     private sseConteos: SseConteosService  
  ) {}

  ngOnInit(): void {
    if (!this.agenciaId) {
      const paramId = this.route.snapshot.paramMap.get('id');
      this.agenciaId = paramId ? Number(paramId) : 0;
    }

    this.setBodegaPorAgenciaId();

    // ✅ Acordeón de filtros: en pantallas angostas (móvil) arranca cerrado para
    // que la tabla quede a la vista; en escritorio arranca abierto.
    this.filtrosAbiertos = window.innerWidth > 768;

    // ✅ Acordeón de estadísticas: mismo criterio (cerrado en móvil, abierto en escritorio).
    this.estadisticasAbiertas = window.innerWidth > 768;

    // ✅ FIX polling: listener ÚNICO de visibilidad, vive durante todo el componente
    // (solo se elimina en ngOnDestroy). Pausa el polling al ocultar la pantalla y lo
    // reanuda con refresco inmediato al volver.
    document.addEventListener('visibilitychange', this.onCambioVisibilidadDocumento);

    // ✅ Aplicar el filtro de texto solo cuando la persona deja de escribir (300ms sin cambios)
    this.busquedaTexto$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => this.aplicarFiltros());

    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        this.id   = this.usuario.id;
        this.agen = this.usuario.agencia;
        this.rol  = this.usuario.rol;
        if (this.id) {
          // ✅ RENDIMIENTO: evitar recargar todo el inventario si el observable de auth
          // vuelve a emitir el mismo usuario (antes disparaba cargas duplicadas).
          if (this.repuestos.length === 0 && !this.cargando) {
            this.cargarInventario();
          }
        } else {
          this.router.navigate(['/login']);
        }
      }
    });

    // ✅ SSE TIEMPO REAL: el backend avisa cuando entra un conteo de esta
    //    agencia+campaña. Al recibir el aviso, refrescamos de inmediato (una sola
    //    vez), reutilizando la MISMA lógica del polling. El poll global (ahora 60s)
    //    queda como red de seguridad por si el aviso se pierde o el SSE está caído.
    const campanaIdSse = 3;
    if (this.agenciaId) {
      this.sseConteos.conectar(this.agenciaId, campanaIdSse);

      this.sseSub = this.sseConteos.avisos$.subscribe(() => {
        // El aviso llega fuera de la zona de Angular; re-entramos para refrescar.
        this.ngZone.run(() => {
          // Si la pestaña está oculta, no refrescamos: al volver, el
          // visibilitychange ya dispara un refresco inmediato.
          if (document.hidden) return;
          this.sincronizarConteosGlobal();
          if (this.modalConteosAbierto) {
            this.refrescarConteosDetalleActivo();
          }
        });
      });
    }

  }

  /** ✅ trackBy de la tabla principal — evita que Angular destruya y vuelva a crear
   *  todas las filas del DOM cada vez que se filtra/reordena (pesado en celulares de gama media). */
  trackByArticulo(index: number, repuesto: RepuestoConteo): string {
    return repuesto.articulo || String(index);
  }

  /** ✅ trackBy de la tabla de detalle de conteos por ubicación */
  trackByConteoDetalle(index: number, det: ConteoDetalleUbicacion): string {
    return det.conteoId !== null && det.conteoId !== undefined ? String(det.conteoId) : `local-${index}`;
  }

  modalDetalleAbierto: boolean = false;

  /** ✅ Se llama en cada tecla desde el input de búsqueda, pero el filtro real
   *  se aplica recién 300ms después de que la persona deja de escribir (ver ngOnInit). */
  onBusquedaTextoChange(valor: string): void {
    this.busquedaTexto$.next(valor);
  }

  /** ✅ NUEVO: cambio del tamaño de página desde el selector (mantiene los filtros). */
  onCambioItemsPorPagina(valor: number | string): void {
    const n = Number(valor);
    if (!n || n <= 0) return;
    this.itemsPorPagina = n;
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  private setBodegaPorAgenciaId(): void {
    const bodega = BODEGAS_MAP[this.agenciaId];
    if (bodega) {
      this.bodegaSeleccionada  = bodega.codigo;
      this.bodegaSeleccionadaid = bodega.codigo.replace('B', '');
      this.agenciaNombre       = bodega.nombre;
    } else {
      console.warn(`No se encontró bodega para agenciaId=${this.agenciaId}. Revisa BODEGAS_MAP.`);
    }
  }

  repuestoDetalle: RepuestoConteo | null = null;

  detalleConteoFisico: number = 0;
  detalleUbicacionFisica: string = '';
  detalleObservaciones: string = '';
  detalleEstadoProducto: string = 'bueno';
  detalleRequiereReconteo: boolean = false;
  detalleMotivoReconteo: string = '';
  imagenesLocales: ImagenConteoLocal[] = [];
  procesandoFotoModal: boolean = false; // spinner mientras se comprime la foto del modal principal
  guardandoDetalle: boolean = false;

  readonly estadosProducto = [
    { valor: 'bueno', label: 'Buen Estado', icono: 'bi-check-circle', color: 'success' },
    { valor: 'dañado', label: 'Dañado', icono: 'bi-x-circle', color: 'danger' },
    { valor: 'obsoleto', label: 'Obsoleto', icono: 'bi-archive', color: 'secondary' },
    { valor: 'revisar', label: 'Requiere Revisión', icono: 'bi-exclamation-circle', color: 'warning' },
  ];

  /** ✅ Nombre del usuario logueado para registrar como responsable */
  private getNombreUsuario(): string {
    const u: any = this.usuario;
    return u?.nombre || u?.usuario || u?.username || (this.id ? `Usuario ${this.id}` : 'userinv');
  }

  /** ✅ Detecta si el valor de "usuario" es en realidad un ID o un placeholder
   *  del tipo "Usuario 75" (se guarda así cuando la cuenta no tiene nombre real),
   *  y NO un nombre de persona. */
  private esUsuarioPlaceholder(valor: string | null | undefined): boolean {
    const v = (valor || '').trim();
    if (!v || v === '-') return true;
    if (/^\d+$/.test(v)) return true;            // "75"
    if (/^usuario\s*\d+$/i.test(v)) return true; // "Usuario 75"
    return false;
  }

  /** ✅ Extrae los nombres reales de cada conteo desde el string consolidado
   *  `ubicaciones_detalle` (la MISMA fuente que ya alimenta el tooltip de la tabla).
   *  Devuelve la lista EN ORDEN y un mapa por clave ubicacion/fecha para resolver
   *  el nombre aunque el orden no coincida exactamente. */
  private extraerNombresDesdeDetalle(c: any): { enOrden: string[]; porClave: Map<string, string> } {
    const enOrden: string[] = [];
    const porClave = new Map<string, string>();
    const texto: string = c?.ubicaciones_detalle || '';
    if (!texto.trim()) return { enOrden, porClave };

    texto.split(/\s*[|;\n]\s*/).filter(t => t && t.trim() !== '').forEach(t => {
      const usuarioMatch = t.match(/usuario:\s*([^,)]+)/i);
      const fechaMatch   = t.match(/fecha:\s*([^)]+)/i);
      const ubic         = (t.split(/[(:]/)[0] || '').trim().toUpperCase();
      const nombre       = usuarioMatch ? usuarioMatch[1].trim() : '';
      enOrden.push(nombre);
      if (nombre) {
        const fecha = fechaMatch ? fechaMatch[1].trim().toUpperCase() : '';
        if (ubic && fecha) porClave.set(`${ubic}||${fecha}`, nombre);
        if (fecha)         porClave.set(`FECHA||${fecha}`, nombre);
        if (ubic)          porClave.set(`UBIC||${ubic}`, nombre);
      }
    });

    return { enOrden, porClave };
  }

  /** ✅ Parsea el detalle de conteos que envía el backend.
   *  1) Si el endpoint unificado envía un array estructurado (conteos_detalle / detalles / conteos), lo usa directo.
   *  2) Si solo envía el string consolidado `ubicaciones_detalle`, lo separa por | ; o salto de línea
   *     e intenta extraer cantidad / usuario / fecha; si no puede, muestra el texto original. */
  private parsearDetalleBackend(c: any): ConteoDetalleUbicacion[] {
    if (!c) return [];

    const arr = c.conteos_detalle || c.detalles || c.conteos;
    // ✅ FIX: usar el array solo si sus elementos traen datos reales.
    // Si el backend serializa mal (objetos vacíos {}), caer al parseo del string.
    const arrValido = Array.isArray(arr) && arr.length > 0 &&
      arr.some((d: any) => d && (
        d.ubicacion !== undefined || d.cantidad !== undefined ||
        d.cantidad_contada !== undefined || d.usuario !== undefined
      ));
    if (arrValido) {
      // ✅ NUEVO: nombres reales tomados del string consolidado (misma fuente que el tooltip).
      const { enOrden, porClave } = this.extraerNombresDesdeDetalle(c);
      const nombresLista: string[] = (c.usuarios_nombres || c.usuarios || '')
        .split(/\s*[,;|]\s*/).map((s: string) => s.trim()).filter((s: string) => s && s !== '-');
      const coincideConteo = enOrden.length === arr.length;

      return arr.map((d: any, idx: number) => {
        const ubic  = d.ubicacion || d.ubicacion_fisica || d.ubicacionFisica || '-';
        const fecha = d.fecha || d.fecha_conteo || d.fechaConteo || '';

        // 1) Nombre explícito que pudiera venir en el array
        let usuario = (d.usuario_nombre || d.usuarioNombre || d.nombre_usuario
                    || d.nombreUsuario || d.nombre || '').toString().trim();

        // 2) d.usuario, solo si NO es un id / placeholder "Usuario 75"
        if (!usuario && !this.esUsuarioPlaceholder(d.usuario)) usuario = String(d.usuario).trim();

        // 3) Resolver desde el string consolidado (por índice, o por ubicacion/fecha)
        if (!usuario || this.esUsuarioPlaceholder(usuario)) {
          const porIndice = coincideConteo ? (enOrden[idx] || '') : '';
          const resuelto =
            (porIndice && !this.esUsuarioPlaceholder(porIndice) ? porIndice : '') ||
            porClave.get(`${ubic.toUpperCase()}||${(fecha || '').toUpperCase()}`) ||
            porClave.get(`FECHA||${(fecha || '').toUpperCase()}`) ||
            porClave.get(`UBIC||${ubic.toUpperCase()}`) || '';
          if (resuelto && !this.esUsuarioPlaceholder(resuelto)) usuario = resuelto;
        }

        // 4) Último recurso: si este artículo tiene un solo contador, es ese
        if ((!usuario || this.esUsuarioPlaceholder(usuario)) && nombresLista.length === 1) {
          usuario = nombresLista[0];
        }

        // 5) Nada dio un nombre real → conservar lo mejor disponible (id/placeholder)
        if (!usuario) {
          usuario = (d.usuario || d.usuario_contador || d.usuarioContador || '-').toString().trim();
        }

        return {
          // ✅ capturar el id del conteo y el id del usuario para poder editarlo
          conteoId: d.id ?? d.conteo_id ?? d.conteoId ?? d.id_conteo ?? null,
          usuarioContadorId: (d.usuario_contador ?? d.usuarioContador ?? null) !== null
            ? String(d.usuario_contador ?? d.usuarioContador).trim()
            : null,
          ubicacion: ubic,
          cantidad: d.cantidad ?? d.cantidad_contada ?? d.cantidadContada ?? null,
          usuario,
          fecha,
          estadoProducto: d.estado_producto || d.estadoProducto || '',
          observaciones: d.observaciones || '',
          origen: 'backend' as const
        };
      });
    }

    const texto: string = c.ubicaciones_detalle || '';
    if (!texto || !texto.trim()) return [];

    return texto
      .split(/\s*[|;\n]\s*/)
      .filter(t => t && t.trim() !== '')
      .map(t => {
        // ✅ FIX: la cantidad se busca SOLO en la parte ANTES del paréntesis,
        // para no capturar el número de "(Usuario: 74, ...)" como cantidad.
        const antesParentesis = t.split('(')[0];
        const cantidadMatch = antesParentesis.match(/[:=]\s*(\d+)\s*(?:uds?|unidades)?/i)
                           || antesParentesis.match(/(\d+)\s*uds?/i);
        const usuarioMatch  = t.match(/usuario:\s*([^,)]+)/i);
        const fechaMatch    = t.match(/fecha:\s*([^)]+)/i);
        const ubicacion     = t.split(/[(:]/)[0].trim();
        return {
          ubicacion: ubicacion || '-',
          cantidad: cantidadMatch ? Number(cantidadMatch[1]) : null,
          usuario: usuarioMatch ? usuarioMatch[1].trim() : (c.usuarios_nombres || c.usuarios || '-'),
          fecha: fechaMatch ? fechaMatch[1].trim() : '',
          origen: 'backend' as const,
          textoOriginal: t.trim()
        };
      });
  }

  /** ✅ Base para las URLs de imágenes del backend. */
  private readonly API_BASE_IMAGENES = '';

  /** ✅ Endpoint que sirve la imagen por su ID (GetImagenConteo del backend). */
  private readonly URL_IMAGEN_CONTEO = 'https://bodega.vehicentro.com:1830/api/api/Inventario/imagenconteo';

  /** ✅ Extrae URLs de imágenes guardadas en backend. */
  private extraerImagenesBackend(c: any): string[] {
    if (!c) return [];
    const fuente = c.imagenes_urls || c.imagenesUrls || c.imagenes || c.imagenes_conteo || [];
    if (!Array.isArray(fuente)) {
      return typeof fuente === 'string' && fuente.trim() !== ''
        ? fuente.split(/\s*[,;|]\s*/).filter((s: string) => s)
        : [];
    }
    return fuente
      .map((img: any) => {
        // ✅ Prioridad 1: URL por ID vía endpoint imagenconteo/{id}
        if (img && typeof img === 'object' && img.id !== undefined && img.id !== null) {
          return `${this.URL_IMAGEN_CONTEO}/${img.id}`;
        }

        // Prioridad 2: campos de ruta/URL
        let ruta: string = typeof img === 'string'
          ? img
          : (img?.url_imagen || img?.url || img?.ruta_archivo || img?.ruta || img?.path || img?.rutaArchivo || '');
        if (!ruta || !ruta.trim()) return '';

        ruta = ruta.replace(/\\/g, '/');

        // Si contiene la ruta física del servidor, quedarse solo con lo posterior al ÚLTIMO wwwroot
        const idxWwwroot = ruta.toLowerCase().lastIndexOf('/wwwroot/');
        if (idxWwwroot >= 0) {
          ruta = ruta.substring(idxWwwroot + '/wwwroot'.length); // → /uploads/11293/foto.jfif
        }

        // URL absoluta: usar tal cual (codificando espacios)
        if (/^https?:\/\//i.test(ruta)) return encodeURI(ruta);

        if (!ruta.startsWith('/')) ruta = '/' + ruta;
        return encodeURI(this.API_BASE_IMAGENES + ruta);
      })
      .filter((u: string) => u && u.trim() !== '');
  }

  cargarInventario(): void {
    if (!this.bodegaSeleccionada || this.bodegaSeleccionada.trim() === '') {
      this.errorMensaje = 'Por favor ingrese una bodega';
      return;
    }

    this.cargando = true;
    this.errorMensaje = '';
    this.repuestos = [];
    this.repuestosFiltrados = [];
    this.repuestosPaginados = [];

    const agenciaId = this.agenciaId;
    const campanaId = 3;

    forkJoin({
      inventario: this.inventarioService.getRepuestosByBodega(this.bodegaSeleccionada),
      conteos: this.inventarioService.getsUnificadosPorAgenciaAll(Number(this.bodegaSeleccionadaid), campanaId)
    }).subscribe({
      next: ({ inventario, conteos }) => {
        const conteosMap = new Map<string, any>();
        (conteos.datos || []).forEach((c: any) => {
          if (c.codigo_interno_agencia) {
            conteosMap.set(c.codigo_interno_agencia.trim().toUpperCase(), c);
          }
        });

        this.repuestos = inventario.repuestos
          .filter(rep => (rep.stock_disponible || 0) > 0)
          .map(rep => {
            const claveArticulo = (rep.articulo || '').trim().toUpperCase();
            const c = conteosMap.get(claveArticulo);
            const cantidadContada: number = c?.cantidad_contada ?? c?.cantidad_total ?? 0;
            const fueContado: boolean = c?.fue_contado === true || cantidadContada > 0;

            if (c && fueContado) {
              const diferencia = cantidadContada - (rep.stock_disponible || 0);
              const ubicacionesDetalle: string = c?.ubicaciones_detalle || '';
              const usuariosMostrar: string = c?.usuarios_nombres || c?.usuarios || '';

              return {
                ...rep,
                conteo_fisico: cantidadContada,
                diferencia: diferencia,
                observaciones: c?.observaciones_consolidadas || c?.observaciones || '',
                estado_conteo: (diferencia === 0 ? 'contado' : 'diferencia') as 'contado' | 'diferencia',
                guardado_backend: true,
                contado_por: usuariosMostrar,
                ubicacion_conteo: c?.ubicaciones || '',
                ubicacion_conteo_detalle: ubicacionesDetalle,
                numero_conteos: c?.numero_conteos ?? 1,
                primera_fecha_conteo: c?.primera_fecha_conteo || null,
                ultima_fecha_conteo: c?.ultima_fecha_conteo || null,
                conteos_detalle: this.parsearDetalleBackend(c),
                imagenes_conteo: this.extraerImagenesBackend(c),
                estado_producto: c?.estado_producto || c?.estados_producto || '',
                inline_cantidad: null,
                inline_ubicacion: '',
                inline_estado: 'bueno',
                inline_observaciones: '',
                inline_imagenes: [],
                inline_guardando: false,
              };
            }

            return {
              ...rep,
              conteo_fisico: undefined,
              diferencia: undefined,
              observaciones: '',
              estado_conteo: 'pendiente' as const,
              guardado_backend: false,
              numero_conteos: 0,
              conteos_detalle: [],
              imagenes_conteo: [],
              inline_cantidad: null,
              inline_ubicacion: '',
              inline_estado: 'bueno',
              inline_observaciones: '',
              inline_imagenes: [],
              inline_guardando: false,
            };
          });

        // ✅ NUEVO: conservar los artículos que se contaron pero NO están en el
        // inventario del sistema (flujo "Artículo Nuevo"). Antes se perdían al recargar,
        // porque la tabla se reconstruía solo desde el inventario del sistema. Ahora se
        // agregan al final, marcados con es_articulo_nuevo para poder identificarlos.
        const clavesInventario = new Set(
          this.repuestos.map(r => (r.articulo || '').trim().toUpperCase())
        );

        (conteos.datos || []).forEach((c: any) => {
          const clave = (c?.codigo_interno_agencia || '').trim().toUpperCase();
          if (!clave || clavesInventario.has(clave)) return;

          const cantidadContada: number = c?.cantidad_contada ?? c?.cantidad_total ?? 0;
          const fueContado: boolean = c?.fue_contado === true || cantidadContada > 0;
          if (!fueContado) return;

          const nombreArt: string =
            c?.nombre || c?.descripcion || c?.nombre_articulo || c?.nombre_repuesto
            || '(Artículo fuera de inventario)';

          const nuevoRep = {
            articulo: clave,
            nombre: nombreArt,
            stock: 0,
            stock_disponible: 0,
            stock_reservado: 0,
            costo_uni: c?.precio_unitario ?? c?.costo_uni ?? 0,
            conteo_fisico: cantidadContada,
            diferencia: cantidadContada, // stock del sistema = 0 → toda la cantidad es diferencia
            observaciones: c?.observaciones_consolidadas || c?.observaciones || '',
            estado_conteo: (cantidadContada === 0 ? 'contado' : 'diferencia') as 'contado' | 'diferencia',
            guardado_backend: true,
            es_articulo_nuevo: true,
            contado_por: c?.usuarios_nombres || c?.usuarios || '',
            ubicacion_conteo: c?.ubicaciones || '',
            ubicacion_conteo_detalle: c?.ubicaciones_detalle || '',
            numero_conteos: c?.numero_conteos ?? 1,
            primera_fecha_conteo: c?.primera_fecha_conteo || null,
            ultima_fecha_conteo: c?.ultima_fecha_conteo || null,
            conteos_detalle: this.parsearDetalleBackend(c),
            imagenes_conteo: this.extraerImagenesBackend(c),
            estado_producto: c?.estado_producto || c?.estados_producto || '',
            inline_cantidad: null,
            inline_ubicacion: '',
            inline_estado: 'bueno',
            inline_observaciones: '',
            inline_imagenes: [],
            inline_guardando: false,
          } as unknown as RepuestoConteo;

          this.repuestos.push(nuevoRep);
          clavesInventario.add(clave);
        });

        // Extraer clases únicas
        const clasesSet = new Set<string>();
        this.repuestos.forEach(r => {
          if (r.clase_id) clasesSet.add(String(r.clase_id).trim());
        });
        this.clasesDisponibles = Array.from(clasesSet).sort((a, b) => a.localeCompare(b));

        // ✅ Extraer grupos únicos
        const gruposSet = new Set<string>();
        this.repuestos.forEach(r => {
          if (r.grupo_id) gruposSet.add(String(r.grupo_id).trim());
        });
        this.gruposDisponibles = Array.from(gruposSet).sort((a, b) => a.localeCompare(b));

        this.totalRepuestos = this.repuestos.length;
        this.aplicarFiltros();
        this.actualizarEstadisticas();
        this.cargando = false;
        this.iniciarPollingGlobal();
      },
      error: (error) => {
        this.errorMensaje = 'Error al cargar: ' + (error.message || 'Error desconocido');
        this.cargando = false;
      }
    });
  }

  /** ✅ Refresca los conteos consolidados desde el backend. */
  refrescarConteos(): void {
    this.cargarInventario();
  }

  registrarConteo(repuesto: RepuestoConteo, cantidad: number): void {
    repuesto.conteo_fisico = cantidad;
    const stockSistema = repuesto.stock_disponible || 0;
    repuesto.diferencia = cantidad - stockSistema;

    if (repuesto.diferencia === 0) {
      repuesto.estado_conteo = 'contado';
    } else {
      repuesto.estado_conteo = 'diferencia';
    }

    this.actualizarEstadisticas();
  }

  incrementarConteo(repuesto: RepuestoConteo): void {
    const conteoActual = repuesto.conteo_fisico || 0;
    this.registrarConteo(repuesto, conteoActual + 1);
  }

  decrementarConteo(repuesto: RepuestoConteo): void {
    const conteoActual = repuesto.conteo_fisico || 0;
    if (conteoActual > 0) {
      this.registrarConteo(repuesto, conteoActual - 1);
    }
  }

  resetearConteo(repuesto: RepuestoConteo): void {
    repuesto.conteo_fisico = undefined;
    repuesto.diferencia = undefined;
    repuesto.observaciones = '';
    repuesto.estado_conteo = 'pendiente';
    this.actualizarEstadisticas();
  }

  igualarStockSistema(): void {
    const confirmacion = confirm('¿Está seguro de igualar el conteo físico con el stock del sistema para todos los repuestos?');

    if (confirmacion) {
      this.repuestos.forEach(repuesto => {
        const stockSistema = repuesto.stock_disponible || 0;
        this.registrarConteo(repuesto, stockSistema);
      });
      this.aplicarFiltros();
      alert('Conteo igualado exitosamente');
    }
  }

  contarTodos(valor: number): void {
    const confirmacion = confirm(`¿Está seguro de marcar todos los repuestos con conteo físico en ${valor}?`);

    if (confirmacion) {
      this.repuestos.forEach(repuesto => {
        this.registrarConteo(repuesto, valor);
      });
      this.aplicarFiltros();
      alert(`Todos los repuestos marcados en ${valor}`);
    }
  }

  guardarConteo(): void {
    if (this.contados === 0 && this.conDiferencias === 0) {
      alert('No hay repuestos contados para guardar');
      return;
    }

    const confirmacion = confirm(`¿Desea guardar el conteo?\n\nContados: ${this.contados}\nCon diferencias: ${this.conDiferencias}\n\nEsta acción no se puede deshacer.`);

    if (!confirmacion) return;

    this.cargando = true;

    const datosConteo = this.repuestos
      .filter(rep => rep.conteo_fisico !== undefined)
      .map(rep => ({
        articulo: rep.articulo,
        bodega: this.bodegaSeleccionada,
        stock_sistema: rep.stock_disponible || 0,
        conteo_fisico: rep.conteo_fisico || 0,
        diferencia: rep.diferencia || 0,
        observaciones: rep.observaciones || '',
        estado: rep.estado_conteo
      }));

    this.inventarioService.guardarConteoGlobal(datosConteo).subscribe({
      next: (response) => {
        alert('Conteo guardado exitosamente');
        this.cargando = false;
      },
      error: (error) => {
        this.errorMensaje = 'Error al guardar el conteo: ' + error.message;
        this.cargando = false;
        alert('Error al guardar el conteo. Por favor intente nuevamente.');
      }
    });
  }

  abrirModalObservaciones(repuesto: RepuestoConteo): void {
    this.repuestoSeleccionado = repuesto;
    this.observacionesTemporal = repuesto.observaciones || '';
    this.modalObservacionesAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarModalObservaciones(): void {
    this.modalObservacionesAbierto = false;
    this.repuestoSeleccionado = null;
    this.observacionesTemporal = '';
    document.body.style.overflow = 'auto';
  }

  guardarObservaciones(): void {
    if (this.repuestoSeleccionado) {
      if (this.observacionesTemporal.length > 500) {
        alert('Las observaciones no pueden exceder 500 caracteres');
        return;
      }

      this.repuestoSeleccionado.observaciones = this.observacionesTemporal;
      alert('Observaciones guardadas correctamente');
      this.cerrarModalObservaciones();
    }
  }

  // ══════════════════════════════════════════════════════════════
  // ✅ MODAL DETALLE DE CONTEOS POR UBICACIÓN
  // ══════════════════════════════════════════════════════════════

  abrirModalConteos(repuesto: RepuestoConteo): void {
    this.repuestoConteosDetalle = repuesto;
    this.modalConteosAbierto = true;
    document.body.style.overflow = 'hidden';

    // ✅ Registrar los conteos ya visibles para no marcarlos como "nuevos" al abrir
    this.idsConteoVistos = new Set(
      (repuesto.conteos_detalle || [])
        .map(d => d.conteoId)
        .filter((id): id is number => id !== null && id !== undefined)
    );
    this.ultimaSincronizacionConteos = new Date();
    this.iniciarPollingConteos();
  }

  cerrarModalConteos(): void {
    // ✅ Cerrar cualquier edición abierta al cerrar el modal
    (this.repuestoConteosDetalle?.conteos_detalle || []).forEach(d => {
      d.editando = false;
      d.edit_guardando = false;
    });
    this.detenerPollingConteos();
    this.modalConteosAbierto = false;
    this.repuestoConteosDetalle = null;
    document.body.style.overflow = 'auto';
  }

  /** Total sumado de los conteos con cantidad conocida (para el pie del modal de detalle) */
  getTotalConteosDetalle(): number {
    const detalles = this.repuestoConteosDetalle?.conteos_detalle || [];
    return detalles.reduce((acc, d) => acc + (d.cantidad ?? 0), 0);
  }

  // ══════════════════════════════════════════════════════════════
  // ✅ TIEMPO REAL (polling) del modal de detalle de conteos
  // ══════════════════════════════════════════════════════════════
  // ✅ RENDIMIENTO: los setInterval ahora corren FUERA de la zona de Angular
  // (runOutsideAngular). Antes, cada tick (aunque no hubiera nada nuevo) forzaba a
  // Angular a re-verificar TODA la pantalla. Ahora Angular solo se entera cuando el
  // backend realmente devuelve cambios (ngZone.run al aplicar los datos), así que el
  // polling sigue funcionando igual (mismos intervalos), pero ya no ralentiza el uso.

  private iniciarPollingConteos(): void {
    this.pausarPollingConteos(); // por seguridad, nunca dos intervalos activos
    this.ngZone.runOutsideAngular(() => {
      this.pollingConteosHandle = setInterval(() => {
        this.refrescarConteosDetalleActivo();
      }, this.INTERVALO_POLLING_CONTEOS_MS);
    });
  }

  /** Pausa el intervalo del modal (se reanuda al volver la visibilidad o reabrir el modal) */
  private pausarPollingConteos(): void {
    if (this.pollingConteosHandle) {
      clearInterval(this.pollingConteosHandle);
      this.pollingConteosHandle = null;
    }
  }

  private detenerPollingConteos(): void {
    this.pausarPollingConteos();
    this.sincronizandoConteos = false;
    this.sincronizandoConteosDesde = 0;
  }

  // ══════════════════════════════════════════════════════════════
  // ✅ TIEMPO REAL (polling) GLOBAL — toda la tabla + tarjetas
  // ══════════════════════════════════════════════════════════════

  private iniciarPollingGlobal(): void {
    this.pausarPollingGlobal(); // nunca dos intervalos activos
    this.ngZone.runOutsideAngular(() => {
      this.pollingGlobalHandle = setInterval(() => {
        this.sincronizarConteosGlobal();
      }, this.INTERVALO_POLLING_GLOBAL_MS);
    });
  }

  /** Pausa el intervalo global (se reanuda al volver la visibilidad) */
  private pausarPollingGlobal(): void {
    if (this.pollingGlobalHandle) {
      clearInterval(this.pollingGlobalHandle);
      this.pollingGlobalHandle = null;
    }
  }

  private detenerPollingGlobal(): void {
    this.pausarPollingGlobal();
    this.sincronizandoGlobal = false;
    this.sincronizandoGlobalDesde = 0;
  }

  /** ✅ Trae los conteos consolidados de TODOS los artículos y actualiza in-place
   *  (mismos objetos) SOLO lo que realmente cambió, sin pisar ediciones inline no
   *  guardadas ni el detalle del artículo abierto en el modal.
   *  ✅ RENDIMIENTO: si el backend devuelve exactamente lo mismo que ya se muestra
   *  (el caso más común), NO se toca nada y Angular ni se entera → cero re-render. */
  private sincronizarConteosGlobal(): void {
    if (!this.bodegaSeleccionadaid || this.repuestos.length === 0) return;

    // ✅ FIX anti-bloqueo: si hay una sincronización "en curso" desde hace más de 60s
    // es que la petición quedó colgada (red móvil / app en segundo plano); se libera
    // el candado y se permite intentar de nuevo. Antes esto dejaba el polling muerto.
    if (this.sincronizandoGlobal) {
      // ✅ SSE: no descartamos el aviso. Si la petición en curso aún NO se colgó,
      //    dejamos marca de "refresco pendiente" para relanzar al terminar. Así el
      //    dato del aviso que llegó durante una petición no se pierde nunca.
      if (Date.now() - this.sincronizandoGlobalDesde < this.TIMEOUT_SINCRONIZACION_MS) {
        this.refrescoGlobalPendiente = true;
        return;
      }
      this.sincronizandoGlobal = false;
    }

    this.sincronizandoGlobal = true;
    this.sincronizandoGlobalDesde = Date.now();
    // ✅ SSE: este refresco ya va a traer el estado más reciente, así que consumimos
    //    la marca pendiente. Si llega OTRO aviso mientras esta petición corre, el
    //    candado de arriba volverá a marcarla y se relanzará al terminar.
    this.refrescoGlobalPendiente = false;
    const campanaId = 3;

    this.inventarioService.getsUnificadosPorAgenciaAll(Number(this.bodegaSeleccionadaid), campanaId).subscribe({
      next: (conteos) => {
        this.sincronizandoGlobal = false;
        this.ultimaSincronizacionGlobal = new Date();

        // ✅ SSE: si mientras esta petición corría llegó otro aviso, relanzamos UN
        //    refresco para traer lo más nuevo. setTimeout(0) evita anidar la llamada
        //    en el mismo tick (sin recursión profunda). Se hace fuera de la zona de
        //    Angular; sincronizarConteosGlobal ya re-entra a la zona solo si hay cambios.
        if (this.refrescoGlobalPendiente) {
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => this.sincronizarConteosGlobal(), 0);
          });
        }

        const conteosMap = new Map<string, any>();
        (conteos.datos || []).forEach((c: any) => {
          if (c.codigo_interno_agencia) {
            conteosMap.set(c.codigo_interno_agencia.trim().toUpperCase(), c);
          }
        });

        // ── PASO 1 (fuera de la zona de Angular): detectar qué cambió realmente ──
        const cambios: Array<{ rep: RepuestoConteo; c: any; cantidadContada: number }> = [];

        this.repuestos.forEach(rep => {
          const clave = (rep.articulo || '').trim().toUpperCase();
          const c = conteosMap.get(clave);
          if (!c) return;

          const cantidadContada: number = c?.cantidad_contada ?? c?.cantidad_total ?? 0;
          const fueContado: boolean = c?.fue_contado === true || cantidadContada > 0;
          if (!fueContado) return;

          // ¿Hay diferencia real contra lo que ya se muestra?
          const numeroConteosBackend = c?.numero_conteos ?? rep.numero_conteos ?? 0;
          const sinCambios =
            rep.guardado_backend === true &&
            (rep.conteo_fisico || 0) === cantidadContada &&
            (rep.numero_conteos || 0) === numeroConteosBackend &&
            (rep.ultima_fecha_conteo || '') === (c?.ultima_fecha_conteo || rep.ultima_fecha_conteo || '');

          if (!sinCambios) {
            cambios.push({ rep, c, cantidadContada });
          }
        });

        // Nada nuevo → no despertar a Angular, no re-renderizar nada.
        if (cambios.length === 0) return;

        // ── PASO 2 (dentro de la zona): aplicar SOLO los artículos que cambiaron ──
        this.ngZone.run(() => {
          cambios.forEach(({ rep, c, cantidadContada }) => {
            const diferencia = cantidadContada - (rep.stock_disponible || 0);
            rep.conteo_fisico = cantidadContada;
            rep.diferencia = diferencia;
            rep.observaciones = c?.observaciones_consolidadas || c?.observaciones || rep.observaciones;
            rep.estado_conteo = diferencia === 0 ? 'contado' : 'diferencia';
            rep.guardado_backend = true;
            rep.contado_por = c?.usuarios_nombres || c?.usuarios || rep.contado_por;
            rep.ubicacion_conteo = c?.ubicaciones || rep.ubicacion_conteo;
            rep.ubicacion_conteo_detalle = c?.ubicaciones_detalle || rep.ubicacion_conteo_detalle;
            rep.numero_conteos = c?.numero_conteos ?? rep.numero_conteos;
            rep.primera_fecha_conteo = c?.primera_fecha_conteo || rep.primera_fecha_conteo;
            rep.ultima_fecha_conteo = c?.ultima_fecha_conteo || rep.ultima_fecha_conteo;
            rep.imagenes_conteo = this.extraerImagenesBackend(c);

            // El artículo abierto en el modal ya lo sincroniza refrescarConteosDetalleActivo()
            // con más cuidado (preserva filas en edición); acá no lo tocamos para no duplicar trabajo.
            if (!(this.modalConteosAbierto && this.repuestoConteosDetalle === rep)) {
              rep.conteos_detalle = this.parsearDetalleBackend(c);
            }
          });

          this.actualizarEstadisticas();
          this.aplicarFiltros();
        });
      },
      error: (err) => {
        this.sincronizandoGlobal = false;
        console.error('Error al sincronizar el inventario en tiempo real:', err);

        // ✅ SSE: si había un aviso pendiente y esta petición falló, reintentamos una
        //    vez tras un respiro de 2s (no de inmediato, para no martillar si el error
        //    es persistente). El poll de 60s sigue como red de seguridad de todos modos.
        if (this.refrescoGlobalPendiente) {
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => this.sincronizarConteosGlobal(), 2000);
          });
        }
      }
    });
  }

  /** ✅ Consulta el backend y actualiza SOLO el artículo abierto en el modal,
   *  sin pisar filas que el propio usuario está editando en este momento.
   *  ✅ RENDIMIENTO: si nada cambió para ese artículo, no se despierta a Angular. */
  private refrescarConteosDetalleActivo(): void {
    const rep = this.repuestoConteosDetalle;
    if (!rep || !this.modalConteosAbierto) return;

    // ✅ FIX anti-bloqueo: mismo mecanismo que el polling global
    if (this.sincronizandoConteos) {
      if (Date.now() - this.sincronizandoConteosDesde < this.TIMEOUT_SINCRONIZACION_MS) return;
      this.sincronizandoConteos = false;
    }

    this.sincronizandoConteos = true;
    this.sincronizandoConteosDesde = Date.now();
    const campanaId = 3;

    this.inventarioService.getsUnificadosPorAgenciaAll(Number(this.bodegaSeleccionadaid), campanaId).subscribe({
      next: (conteos) => {
        this.sincronizandoConteos = false;
        this.ultimaSincronizacionConteos = new Date();

        const claveArticulo = (rep.articulo || '').trim().toUpperCase();
        const actualizado: any = (conteos.datos || []).find(
          (c: any) => (c.codigo_interno_agencia || '').trim().toUpperCase() === claveArticulo
        );
        if (!actualizado) return;

        const cantidadContada: number = actualizado?.cantidad_contada ?? actualizado?.cantidad_total ?? 0;
        const numeroConteosBackend: number = actualizado?.numero_conteos ?? rep.numero_conteos ?? 0;

        // ¿Cambió algo respecto a lo que ya se ve en el modal?
        const sinCambios =
          (rep.conteo_fisico || 0) === cantidadContada &&
          (rep.numero_conteos || 0) === numeroConteosBackend;
        if (sinCambios) return; // nada nuevo → cero re-render

        this.ngZone.run(() => {
          const nuevoDetalle = this.parsearDetalleBackend(actualizado);
          this.mezclarConteosDetalle(rep, nuevoDetalle);

          rep.conteo_fisico = cantidadContada;
          rep.diferencia = cantidadContada - (rep.stock_disponible || 0);
          rep.estado_conteo = rep.diferencia === 0 ? 'contado' : 'diferencia';
          rep.numero_conteos = numeroConteosBackend;

          this.reconstruirResumenConteos(rep);
          this.actualizarEstadisticas();
        });
      },
      error: (err) => {
        this.sincronizandoConteos = false;
        console.error('Error al sincronizar conteos en tiempo real:', err);
      }
    });
  }

  /** ✅ Combina el detalle recién llegado del backend con el que ya se ve en el modal:
   *  - Si una fila está en modo edición del usuario actual, se conserva intacta (no se pisa).
   *  - Las filas existentes se actualizan in-place (mismo objeto) para no perder el foco/scroll.
   *  - Las filas realmente nuevas se agregan y se marcan como "recién llegadas" unos segundos. */
  private mezclarConteosDetalle(rep: RepuestoConteo, nuevoDetalle: ConteoDetalleUbicacion[]): void {
    const actuales = rep.conteos_detalle || [];
    const actualesPorId = new Map<number, ConteoDetalleUbicacion>();
    actuales.forEach(d => { if (d.conteoId !== null && d.conteoId !== undefined) actualesPorId.set(d.conteoId, d); });

    const resultado: ConteoDetalleUbicacion[] = [];

    nuevoDetalle.forEach(nuevo => {
      const idNuevo = nuevo.conteoId ?? null;
      const existente = idNuevo !== null ? actualesPorId.get(idNuevo) : undefined;

      if (existente) {
        // Fila ya conocida: si el usuario la está editando, no tocar sus datos
        if (!existente.editando) {
          existente.cantidad = nuevo.cantidad;
          existente.ubicacion = nuevo.ubicacion;
          existente.usuario = nuevo.usuario;
          existente.fecha = nuevo.fecha;
          existente.estadoProducto = nuevo.estadoProducto;
          existente.observaciones = nuevo.observaciones;
          existente.usuarioContadorId = nuevo.usuarioContadorId;
        }
        resultado.push(existente);
        actualesPorId.delete(idNuevo!);
      } else {
        // Fila nueva (contada por alguien más, o recién guardada)
        if (idNuevo !== null && !this.idsConteoVistos.has(idNuevo)) {
          nuevo.esNuevo = true;
          this.idsConteoVistos.add(idNuevo);
          setTimeout(() => { nuevo.esNuevo = false; }, 5000);
        }
        resultado.push(nuevo);
      }
    });

    // Conservar al final cualquier fila local que el backend aún no reconoce
    actuales.forEach(d => {
      if (d.conteoId === null || d.conteoId === undefined) resultado.push(d);
    });

    rep.conteos_detalle = resultado;
  }

  // ══════════════════════════════════════════════════════════════
  // ✅ MODAL GALERÍA DE IMÁGENES
  // ══════════════════════════════════════════════════════════════

  abrirModalImagenes(repuesto: RepuestoConteo): void {
    this.repuestoImagenes = repuesto;
    this.imagenAmpliada = null;
    this.modalImagenesAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarModalImagenes(): void {
    this.modalImagenesAbierto = false;
    this.repuestoImagenes = null;
    this.imagenAmpliada = null;
    document.body.style.overflow = 'auto';
  }

  ampliarImagen(url: string): void {
    this.imagenAmpliada = url;
  }

  cerrarImagenAmpliada(): void {
    this.imagenAmpliada = null;
  }

  /** true si el repuesto tiene alguna imagen (backend o sesión) */
  tieneImagenes(repuesto: RepuestoConteo): boolean {
    return (repuesto.imagenes_conteo?.length || 0) > 0 || (repuesto.imagenes_locales?.length || 0) > 0;
  }

  getTotalImagenes(repuesto: RepuestoConteo): number {
    return (repuesto.imagenes_conteo?.length || 0) + (repuesto.imagenes_locales?.length || 0);
  }

  /** ✅ Primera imagen disponible (prioriza backend, luego sesión local) */
  getPrimeraImagen(repuesto: RepuestoConteo): string | null {
    if (repuesto.imagenes_conteo && repuesto.imagenes_conteo.length > 0) {
      return repuesto.imagenes_conteo[0];
    }
    if (repuesto.imagenes_locales && repuesto.imagenes_locales.length > 0) {
      return repuesto.imagenes_locales[0].preview;
    }
    return null;
  }

  onInputFocus(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  /** ✅ Abre/cierra el acordeón de filtros (barra de título del panel superior) */
  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
  }

  /** ✅ Abre/cierra el acordeón de estadísticas (tarjetas + avance de revisión) */
  toggleEstadisticas(): void {
    this.estadisticasAbiertas = !this.estadisticasAbiertas;
  }

  aplicarFiltros(): void {
    // ✅ Contador de filtros activos (se muestra como badge cuando el acordeón está cerrado)
    let activos = 0;
    if (this.busquedaTexto && this.busquedaTexto.trim() !== '') activos++;
    if (this.filtroEstado !== 'todos') activos++;
    if (this.filtroClaseId !== 'todas') activos++;
    if (this.filtroGrupoId !== 'todos') activos++;
    if (this.ordenCosto !== 'ninguno') activos++;
    this.filtrosActivosCount = activos;

    let resultados = [...this.repuestos];

    if (this.busquedaTexto && this.busquedaTexto.trim() !== '') {
      const texto = this.busquedaTexto.toLowerCase().trim();
      resultados = resultados.filter(rep =>
        rep.articulo?.toLowerCase().includes(texto) ||
        rep.nombre?.toLowerCase().includes(texto)
      );
    }

    if (this.filtroClaseId !== 'todas') {
      resultados = resultados.filter(rep =>
        String(rep.clase_id).trim() === this.filtroClaseId
      );
    }

    // ✅ Filtro por grupo_id
    if (this.filtroGrupoId !== 'todos') {
      resultados = resultados.filter(rep =>
        String(rep.grupo_id).trim() === this.filtroGrupoId
      );
    }

    if (this.filtroEstado === 'nuevos') {
      // ✅ Solo artículos fuera del inventario del sistema (contados como "nuevos")
      resultados = resultados.filter(rep => rep.es_articulo_nuevo);
    } else if (this.filtroEstado !== 'todos') {
      resultados = resultados.filter(rep => rep.estado_conteo === this.filtroEstado);
    }

    if (this.ordenCosto === 'mayor') {
      resultados.sort((a, b) => (b.costo_uni || 0) - (a.costo_uni || 0));
    } else if (this.ordenCosto === 'menor') {
      resultados.sort((a, b) => (a.costo_uni || 0) - (b.costo_uni || 0));
    }

    if (this.columnaOrden) {
      const dir = this.direccionOrden === 'asc' ? 1 : -1;
      resultados.sort((a, b) => {
        let valA: any;
        let valB: any;
        switch (this.columnaOrden) {
          case 'articulo':   valA = a.articulo || ''; valB = b.articulo || ''; break;
          case 'nombre':     valA = a.nombre || ''; valB = b.nombre || ''; break;
          case 'clase_id':   valA = a.clase_id || ''; valB = b.clase_id || ''; break;
          case 'grupo_id':   valA = a.grupo_id || ''; valB = b.grupo_id || ''; break;
          case 'ubicacion':  valA = a.ubicacion || ''; valB = b.ubicacion || ''; break;
          case 'stock':      valA = a.stock || 0; valB = b.stock || 0; break;
          case 'reserva':    valA = a.stock_reservado || 0; valB = b.stock_reservado || 0; break;
          case 'disponible': valA = a.stock_disponible || 0; valB = b.stock_disponible || 0; break;
          case 'costo':      valA = a.costo_uni || 0; valB = b.costo_uni || 0; break;
          case 'conteo':     valA = a.conteo_fisico ?? -1; valB = b.conteo_fisico ?? -1; break;
          case 'diferencia': valA = a.diferencia ?? 0; valB = b.diferencia ?? 0; break;
          case 'estado':     valA = a.estado_conteo || ''; valB = b.estado_conteo || ''; break;
          default: return 0;
        }
        if (typeof valA === 'string') return valA.localeCompare(valB) * dir;
        return (valA - valB) * dir;
      });
    }

    this.repuestosFiltrados = resultados;
    this.totalPaginas = Math.ceil(this.repuestosFiltrados.length / this.itemsPorPagina);

    if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
      this.paginaActual = 1;
    }

    // ✅ RENDIMIENTO: la página visible y el array de números de página se calculan
    // UNA sola vez aquí (y en cambiarPagina), no en cada ciclo de Angular.
    this.recalcularPagina();
  }

  /** ✅ RENDIMIENTO: recorta la página visible una sola vez por cambio real de datos. */
  private recalcularPagina(): void {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.repuestosPaginados = this.repuestosFiltrados.slice(inicio, fin);
    // ✅ Ventana compacta de páginas (antes se pintaban TODAS: con 79 páginas
    // en móvil se amontonaban y desbordaban). El -1 representa una elipsis "…".
    this.paginasArrayCache = this.construirVentanaPaginas();
  }

  /** ✅ Devuelve una ventana compacta de números de página:
   *  primera, última, la actual y un vecino a cada lado, con elipsis (-1) en los huecos.
   *  Ej. actual=40 de 79 → [1, -1, 39, 40, 41, -1, 79]. */
  private construirVentanaPaginas(): number[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;

    // Pocas páginas: mostrarlas todas sin elipsis.
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const vecinos = 1; // páginas visibles a cada lado de la actual
    const inicio = Math.max(2, actual - vecinos);
    const fin = Math.min(total - 1, actual + vecinos);

    const paginas: number[] = [1];
    if (inicio > 2) paginas.push(-1);              // elipsis izquierda
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    if (fin < total - 1) paginas.push(-1);         // elipsis derecha
    paginas.push(total);
    return paginas;
  }

  limpiarFiltros(): void {
    this.busquedaTexto = '';
    this.filtroEstado = 'todos';
    this.ordenCosto = 'ninguno';
    this.filtroClaseId = 'todas';
    this.filtroGrupoId = 'todos';
    this.columnaOrden = '';
    this.aplicarFiltros();
  }

  ordenarPor(columna: string): void {
    if (this.columnaOrden === columna) {
      this.direccionOrden = this.direccionOrden === 'asc' ? 'desc' : 'asc';
    } else {
      this.columnaOrden = columna;
      this.direccionOrden = 'asc';
    }
    this.aplicarFiltros();
  }

  getSortClass(columna: string): string {
    if (this.columnaOrden !== columna) return 'sort-neutral';
    return this.direccionOrden === 'asc' ? 'sort-asc' : 'sort-desc';
  }

  abrirModalNuevoArticulo(): void {
    const articuloNuevo: RepuestoConteo = {
      articulo: '',
      nombre: '',
      stock: 0,
      stock_reservado: 0,
      stock_disponible: 0,
      costo_uni: 0,
      ubicacion: '',
      conteo_fisico: 0,
      diferencia: undefined,
      observaciones: '',
      estado_conteo: 'pendiente',
      guardado_backend: false,
      numero_conteos: 0,
      conteos_detalle: [],
      imagenes_conteo: []
    } as any;

    this.esArticuloNuevo = true;
    this.esConteoAdicional = false;
    this.nuevoArticuloCodigo = '';
    this.nuevoArticuloNombre = '';
    this.repuestoDetalle = articuloNuevo;
    this.detalleConteoFisico = 0;
    this.detalleUbicacionFisica = '';
    this.detalleObservaciones = '';
    this.detalleEstadoProducto = 'bueno';
    this.detalleRequiereReconteo = false;
    this.detalleMotivoReconteo = '';
    this.imagenesLocales = [];
    this.modalDetalleAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  actualizarEstadisticas(): void {
    // ✅ RENDIMIENTO: una sola pasada por el array (antes eran 3 filter completos)
    // y sin console.log (se ejecutaba constantemente y frena mucho en WebView/celular).
    let contados = 0, diferencias = 0, pendientes = 0;
    for (const r of this.repuestos) {
      if (r.estado_conteo === 'contado') contados++;
      else if (r.estado_conteo === 'diferencia') diferencias++;
      else pendientes++;
    }
    this.contados = contados;
    this.conDiferencias = diferencias;
    this.pendientes = pendientes;

    // ✅ AVANCE DE REVISIÓN REAL: un artículo cuenta como "revisado" si tiene al
    // menos un conteo registrado (sin importar si coincidió o tuvo diferencia).
    // El porcentaje es revisados / total de artículos del inventario.
    this.revisados = contados + diferencias;
    this.porcentajeProgresoCache = this.totalRepuestos === 0
      ? 0
      : Math.round((this.revisados / this.totalRepuestos) * 100);

    // Segmentos de la barra (verde = sin diferencia, amarillo = con diferencia)
    this.porcentajeContadosOk = this.totalRepuestos === 0
      ? 0
      : (contados / this.totalRepuestos) * 100;
    this.porcentajeConDiferencias = this.totalRepuestos === 0
      ? 0
      : (diferencias / this.totalRepuestos) * 100;
  }

  getPaginasArray(): number[] {
    // ✅ RENDIMIENTO: devuelve el array precalculado (antes creaba un array nuevo
    // en cada ciclo de detección de cambios).
    return this.paginasArrayCache;
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.recalcularPagina();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  exportarResultados(): void {
    if (this.repuestos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const dataExport = this.repuestos.map(rep => {
      // ✅ Detalle de conteos por ubicación en una sola celda legible
      const detalleConteos = (rep.conteos_detalle || [])
        .map(d => {
          const cant = d.cantidad !== null && d.cantidad !== undefined ? `${d.cantidad} uds` : (d.textoOriginal ? '' : 's/c');
          const partes = [d.ubicacion, cant, d.usuario ? `Usuario: ${d.usuario}` : '', d.fecha ? `Fecha: ${d.fecha}` : '']
            .filter(p => p && p.trim() !== '');
          return d.textoOriginal && !d.cantidad ? d.textoOriginal : partes.join(' - ');
        })
        .join(' | ');

      return {
        Articulo: rep.articulo,
        Nombre: rep.nombre,
        Clase: rep.clase_id || '',
        Grupo: rep.grupo_id || '',
        'Ubicacion Sistema': rep.ubicacion || '',
        'Stock Sistema': rep.stock || 0,
        'Stock Reserva': rep.stock_reservado || 0,
        'Stock Disponible': rep.stock_disponible || 0,
        'Costo Unitario': rep.costo_uni || 0,
        'Conteo Físico': rep.conteo_fisico !== undefined ? rep.conteo_fisico : '',
        Diferencia: rep.diferencia !== undefined ? rep.diferencia : '',
        Estado: rep.estado_conteo || 'pendiente',
        'N° Conteos': rep.numero_conteos || 0,
        'Ubicación Conteo': rep.ubicacion_conteo || '',
        'Detalle Conteos por Ubicación': detalleConteos,
        'Responsable Conteo': rep.contado_por || '',
        'Estado Repuesto': rep.estado_producto ? this.getLabelEstadoProducto(rep.estado_producto) : '',
        'Fecha Último Conteo': rep.ultima_fecha_conteo || '',
        Observaciones: rep.observaciones || ''
      };
    });

    const headers = Object.keys(dataExport[0]);
    const csvContent = [
      headers.join(','),
      ...dataExport.map(row =>
        headers.map(header => {
          const value = row[header as keyof typeof row];
          if (typeof value === 'string') {
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');

    link.setAttribute('href', url);
    link.setAttribute('download', `conteo_inventario_${this.bodegaSeleccionada}_${fecha}_${hora}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getColorEstado(estado?: string): string {
    switch(estado) {
      case 'contado': return 'success';
      case 'diferencia': return 'warning';
      default: return 'secondary';
    }
  }

  getPorcentajeProgreso(): number {
    // ✅ RENDIMIENTO: devuelve el valor precalculado en actualizarEstadisticas()
    // (antes se recalculaba en cada ciclo de detección de cambios, ×3 usos en el template).
    return this.porcentajeProgresoCache;
  }

  abrirModalDetalle(repuesto: RepuestoConteo): void {
    this.repuestoDetalle = repuesto;

    // ✅ Si ya existe al menos un conteo previo, este será un conteo ADICIONAL
    // que se sumará al total acumulado (nueva ubicación → nueva cantidad, no reemplazo).
    this.esConteoAdicional = (repuesto.numero_conteos || 0) > 0 || repuesto.guardado_backend === true;

    if (this.esConteoAdicional) {
      this.detalleConteoFisico = 0;               // el nuevo conteo parte de 0
      this.detalleUbicacionFisica = '';            // se registra la NUEVA ubicación
      this.detalleObservaciones = '';              // observación propia de este conteo
    } else {
      this.detalleConteoFisico = repuesto.conteo_fisico ?? repuesto.stock_disponible ?? 0;
      this.detalleUbicacionFisica = repuesto.ubicacion || '';
      this.detalleObservaciones = repuesto.observaciones || '';
    }

    this.detalleEstadoProducto = repuesto.estado_producto || 'bueno';
    this.detalleRequiereReconteo = repuesto.requiere_reconteo || false;
    this.detalleMotivoReconteo = repuesto.motivo_reconteo || '';
    this.imagenesLocales = [];
    this.modalDetalleAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarModalDetalle(): void {
    this.modalDetalleAbierto = false;
    this.repuestoDetalle = null;
    this.imagenesLocales = [];
    this.esArticuloNuevo = false;
    this.esConteoAdicional = false;
    this.nuevoArticuloCodigo = '';
    this.nuevoArticuloNombre = '';
    document.body.style.overflow = 'auto';
  }

  // ══════════════════════════════════════════════════════════════
  // ✅ Compresión de fotos (cámara/galería) antes de mostrarlas y guardarlas.
  // Se reduce a máx. 1280px de lado largo y calidad JPEG ~72%.
  // ══════════════════════════════════════════════════════════════

  private async comprimirImagen(
    file: File,
    maxDimension: number = 1280,
    calidad: number = 0.72
  ): Promise<{ archivo: File; preview: string }> {
    // Si ya viene liviana (ej. de galería, ya optimizada), no perder tiempo comprimiendo
    if (file.size <= 250 * 1024) {
      const preview = await this.leerComoDataUrl(file);
      return { archivo: file, preview };
    }

    try {
      const bitmap = await createImageBitmap(file);

      let { width, height } = bitmap;
      if (width > maxDimension || height > maxDimension) {
        const escala = maxDimension / Math.max(width, height);
        width = Math.round(width * escala);
        height = Math.round(height * escala);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('sin contexto de canvas');

      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close?.();

      const blob: Blob | null = await new Promise(resolve =>
        canvas.toBlob(b => resolve(b), 'image/jpeg', calidad)
      );
      if (!blob) throw new Error('no se pudo comprimir');

      const nombre = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
      const archivoComprimido = new File([blob], nombre, { type: 'image/jpeg' });
      const preview = canvas.toDataURL('image/jpeg', calidad);

      return { archivo: archivoComprimido, preview };
    } catch {
      // Fallback: si el navegador no soporta createImageBitmap/canvas, usar el archivo original
      const preview = await this.leerComoDataUrl(file);
      return { archivo: file, preview };
    }
  }

  private leerComoDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  onImagenesSeleccionadas(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const yaHabiaImagenes = this.imagenesLocales.length > 0;
    const archivos = Array.from(input.files).filter(f => f.type.startsWith('image/'));

    archivos.forEach(async (file, idx) => {
      if (this.imagenesLocales.length >= 5) {
        if (idx === 0) alert('Máximo 5 imágenes permitidas');
        return;
      }
      this.procesandoFotoModal = true;
      const { archivo, preview } = await this.comprimirImagen(file);
      this.imagenesLocales.push({
        archivo,
        preview,
        descripcion: '',
        esPrincipal: !yaHabiaImagenes && idx === 0
      });
      this.procesandoFotoModal = false;
    });
    input.value = '';
  }

  eliminarImagenLocal(index: number): void {
    this.imagenesLocales.splice(index, 1);
    if (this.imagenesLocales.length > 0 && !this.imagenesLocales.some(i => i.esPrincipal)) {
      this.imagenesLocales[0].esPrincipal = true;
    }
  }

  marcarComoPrincipal(index: number): void {
    this.imagenesLocales.forEach((img, i) => img.esPrincipal = i === index);
  }

  guardarDetalleConteo(): void {
    if (!this.repuestoDetalle) return;

    if (this.esArticuloNuevo) {
      if (!this.nuevoArticuloCodigo.trim()) {
        alert('Debe ingresar el código del artículo');
        return;
      }
      if (!this.nuevoArticuloNombre.trim()) {
        alert('Debe ingresar el nombre del artículo');
        return;
      }
      this.repuestoDetalle.articulo = this.nuevoArticuloCodigo.trim().toUpperCase();
      this.repuestoDetalle.nombre = this.nuevoArticuloNombre.trim();
      // ✅ Marcarlo como artículo fuera del inventario del sistema para poder identificarlo.
      this.repuestoDetalle.es_articulo_nuevo = true;
    }

    if (this.detalleConteoFisico < 0) {
      alert('El conteo físico no puede ser negativo');
      return;
    }

    // ✅ En un conteo adicional la ubicación es obligatoria para saber DÓNDE se contó
    if (this.esConteoAdicional && !this.detalleUbicacionFisica.trim()) {
      alert('Ingrese la ubicación donde se realizó este nuevo conteo');
      return;
    }

    this.guardandoDetalle = true;

    const rep = this.repuestoDetalle;
    const stockSistema = rep.stock_disponible || 0;
    const nombreUsuario = this.getNombreUsuario();

    // ✅ Cantidad de ESTE conteo vs total acumulado.
    const cantidadEsteConteo = this.detalleConteoFisico;
    const totalAcumulado = this.esConteoAdicional
      ? (rep.conteo_fisico || 0) + cantidadEsteConteo
      : cantidadEsteConteo;

    rep.conteo_fisico = totalAcumulado;
    rep.diferencia = totalAcumulado - stockSistema;
    rep.observaciones = this.esConteoAdicional && rep.observaciones
      ? (this.detalleObservaciones ? `${rep.observaciones} | ${this.detalleObservaciones}` : rep.observaciones)
      : this.detalleObservaciones;
    rep.estado_conteo = rep.diferencia === 0 ? 'contado' : 'diferencia';
    rep.estado_producto = this.detalleEstadoProducto;
    (rep as any).ubicacion_fisica = this.detalleUbicacionFisica;
    rep.requiere_reconteo = this.detalleRequiereReconteo;
    rep.motivo_reconteo = this.detalleMotivoReconteo;

    // ✅ Acumular imágenes de sesión (no reemplazar las anteriores)
    rep.imagenes_locales = [...(rep.imagenes_locales || []), ...this.imagenesLocales];

    // Al backend se envía la cantidad de ESTE conteo individual;
    // la vista unificada del backend consolida la suma total.
    const precioUnitario = parseFloat((rep.costo_uni || 0).toFixed(2));
    const valorTotal = parseFloat(((rep.costo_uni || 0) * cantidadEsteConteo).toFixed(2));

    // ✅ IDEMPOTENCIA: id único de este guardado. Si hay que reintentar, el
    //    backend lo reconoce por este id y NO duplica el conteo.
    const clientOpId = this.generarClientOpId();

    const formData = new FormData();
    formData.append('CodigoInternoAgencia', rep.articulo || '');
    formData.append('cantidadContada', String(cantidadEsteConteo));
    formData.append('EstadoProducto', this.detalleEstadoProducto);
    formData.append('observaciones', this.detalleObservaciones);
    formData.append('ubicacion', this.detalleUbicacionFisica);
    formData.append('requiereReconteo', String(this.detalleRequiereReconteo));
    formData.append('motivoReconteo', this.detalleMotivoReconteo);
    formData.append('usuarioContador', String(this.id));
    formData.append('precioUnitario', String(precioUnitario));
    formData.append('valorTotal', String(valorTotal));
    formData.append('campanaId', '3');
    formData.append('agenciaId', this.bodegaSeleccionadaid);
    formData.append('repuestoId', String(1));
    formData.append('ubicacionFisicaId', String(1));
    formData.append('clientOpId', clientOpId);   // ✅ NUEVO

    this.imagenesLocales.forEach((imgLocal, i) => {
      formData.append('imagenes', imgLocal.archivo, imgLocal.archivo.name);
      formData.append(`descripcionImagen_${i}`, imgLocal.descripcion);
      formData.append(`esPrincipal_${i}`, String(imgLocal.esPrincipal));
    });

    // ✅ Registrar este conteo en el detalle por ubicación (modal de detalle y Excel)
    //    Devuelve el item creado para poder marcarlo como sincronizado/pendiente.
    const registrarDetalleLocal = (conteoIdBackend: number | null, pendiente: boolean): ConteoDetalleUbicacion => {
      const d = new Date();
      const dd  = String(d.getDate()).padStart(2, '0');
      const mm  = String(d.getMonth() + 1).padStart(2, '0');
      const hh  = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const fechaStr = `${dd}/${mm}/${d.getFullYear()} ${hh}:${min}`;

      const nuevoDetalle: ConteoDetalleUbicacion = {
        conteoId: conteoIdBackend,
        clientOpId,
        pendiente,
        usuarioContadorId: String(this.id),
        ubicacion: this.detalleUbicacionFisica || '-',
        cantidad: cantidadEsteConteo,
        usuario: nombreUsuario,
        fecha: fechaStr,
        estadoProducto: this.detalleEstadoProducto,
        observaciones: this.detalleObservaciones,
        origen: 'sesion'
      };

      rep.conteos_detalle = [ ...(rep.conteos_detalle || []), nuevoDetalle ];

      rep.numero_conteos = (rep.numero_conteos || 0) + 1;
      rep.contado_por = rep.contado_por
        ? (rep.contado_por.includes(nombreUsuario) ? rep.contado_por : `${rep.contado_por}, ${nombreUsuario}`)
        : nombreUsuario;
      rep.ubicacion_conteo = rep.ubicacion_conteo
        ? `${rep.ubicacion_conteo} | ${this.detalleUbicacionFisica}`
        : this.detalleUbicacionFisica;

      const nuevoDetalleTxt = `${this.detalleUbicacionFisica}: ${cantidadEsteConteo} uds (Usuario: ${nombreUsuario}, Fecha: ${fechaStr})`;
      rep.ubicacion_conteo_detalle = rep.ubicacion_conteo_detalle
        ? `${rep.ubicacion_conteo_detalle} | ${nuevoDetalleTxt}`
        : nuevoDetalleTxt;
      rep.ultima_fecha_conteo = fechaStr;

      return nuevoDetalle;
    };

    this.inventarioService.createConteo(formData).subscribe({
      next: (resp: any) => {
        rep.guardado_backend = true;
        registrarDetalleLocal(this.extraerIdConteoResp(resp), false);

        if (this.esArticuloNuevo) {
          this.repuestos.push(rep);
          this.totalRepuestos = this.repuestos.length;
        }

        this.guardandoDetalle = false;
        this.actualizarEstadisticas();
        this.aplicarFiltros();
        this.cerrarModalDetalle();
      },
      error: (err) => {
        // ⚠️ Aquí YA fallaron los reintentos rápidos del service.
        //    NO se finge éxito: se guarda local Y se encola para reintento en segundo plano.
        console.error('createConteo (modal) agotó reintentos, encolando pendiente:', err);
        const detalle = registrarDetalleLocal(null, true);
        this.encolarPendiente({ clientOpId, formData, rep, detalle, intentos: 0, ultimoError: err?.message });

        if (this.esArticuloNuevo) {
          this.repuestos.push(rep);
          this.totalRepuestos = this.repuestos.length;
        }
        this.actualizarEstadisticas();
        this.aplicarFiltros();
        this.guardandoDetalle = false;
        this.cerrarModalDetalle();
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // ✅ CONTEO INLINE (edición directa sobre la fila, sin modal)
  // ══════════════════════════════════════════════════════════════

  /** Incrementa la cantidad del conteo inline de la fila */
  incrementarInline(rep: RepuestoConteo): void {
    rep.inline_cantidad = (rep.inline_cantidad ?? 0) + 1;
  }

  /** Decrementa la cantidad del conteo inline de la fila (mínimo 0) */
  decrementarInline(rep: RepuestoConteo): void {
    const actual = rep.inline_cantidad ?? 0;
    rep.inline_cantidad = actual > 0 ? actual - 1 : 0;
  }

  /** Copia el stock disponible del sistema como cantidad de este conteo (atajo "= Sistema") */
  igualarSistemaInline(rep: RepuestoConteo): void {
    rep.inline_cantidad = rep.stock_disponible || 0;
  }

  /** Limpia los campos inline de la fila sin guardar */
  limpiarInline(rep: RepuestoConteo): void {
    rep.inline_cantidad = null;
    rep.inline_ubicacion = '';
    rep.inline_estado = 'bueno';
    rep.inline_observaciones = '';
    rep.inline_imagenes = [];
  }

  /** true si la fila tiene algo ingresado y se puede guardar */
  puedeGuardarInline(rep: RepuestoConteo): boolean {
    return rep.inline_cantidad !== null && rep.inline_cantidad !== undefined && rep.inline_cantidad >= 0 && !rep.inline_guardando;
  }

  /** Total que quedará acumulado si se guarda lo ingresado en la fila */
  getTotalPrevisto(rep: RepuestoConteo): number {
    const previo = rep.guardado_backend ? (rep.conteo_fisico || 0) : 0;
    return previo + (rep.inline_cantidad ?? 0);
  }

  /** Diferencia prevista contra el stock disponible del sistema */
  getDiferenciaPrevista(rep: RepuestoConteo): number {
    return this.getTotalPrevisto(rep) - (rep.stock_disponible || 0);
  }

  /** Selección de fotos directamente en la fila (máx. 5 por conteo) */
  onImagenesInlineSeleccionadas(event: Event, rep: RepuestoConteo): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    if (!rep.inline_imagenes) rep.inline_imagenes = [];

    const yaHabiaImagenes = rep.inline_imagenes.length > 0;
    const archivos = Array.from(input.files).filter(f => f.type.startsWith('image/'));

    archivos.forEach(async (file, idx) => {
      if ((rep.inline_imagenes?.length || 0) >= 5) {
        if (idx === 0) alert('Máximo 5 imágenes por conteo');
        return;
      }
      rep.inline_procesandoFoto = true;
      const { archivo, preview } = await this.comprimirImagen(file);
      rep.inline_imagenes!.push({
        archivo,
        preview,
        descripcion: '',
        esPrincipal: !yaHabiaImagenes && idx === 0
      });
      rep.inline_procesandoFoto = false;
    });
    input.value = '';
  }

  /** Elimina una foto cargada inline antes de guardar */
  eliminarImagenInline(rep: RepuestoConteo, index: number): void {
    if (!rep.inline_imagenes) return;
    rep.inline_imagenes.splice(index, 1);
    if (rep.inline_imagenes.length > 0 && !rep.inline_imagenes.some(i => i.esPrincipal)) {
      rep.inline_imagenes[0].esPrincipal = true;
    }
  }

  /** ✅ Guarda el conteo ingresado en la fila (misma lógica de acumulación que el modal). */
  guardarConteoInline(rep: RepuestoConteo): void {
    const cantidad = rep.inline_cantidad;

    if (cantidad === null || cantidad === undefined) {
      alert('Ingrese la cantidad contada');
      return;
    }
    if (cantidad < 0) {
      alert('El conteo físico no puede ser negativo');
      return;
    }

    const esAdicional = (rep.numero_conteos || 0) > 0 || rep.guardado_backend === true;

    // En un conteo adicional la ubicación es obligatoria para saber DÓNDE se contó
    if (esAdicional && !(rep.inline_ubicacion || '').trim()) {
      alert('Ingrese la ubicación donde se realizó este nuevo conteo');
      return;
    }

    rep.inline_guardando = true;

    const stockSistema = rep.stock_disponible || 0;
    const nombreUsuario = this.getNombreUsuario();
    const ubicacion = (rep.inline_ubicacion || '').trim();
    const estado = rep.inline_estado || 'bueno';
    const observaciones = (rep.inline_observaciones || '').trim();
    const imagenes = rep.inline_imagenes || [];

    const cantidadEsteConteo = cantidad;
    const totalAcumulado = esAdicional
      ? (rep.conteo_fisico || 0) + cantidadEsteConteo
      : cantidadEsteConteo;

    const precioUnitario = parseFloat((rep.costo_uni || 0).toFixed(2));
    const valorTotal = parseFloat(((rep.costo_uni || 0) * cantidadEsteConteo).toFixed(2));

    // ✅ IDEMPOTENCIA: id único de este guardado (reintento seguro, sin duplicar).
    const clientOpId = this.generarClientOpId();

    const formData = new FormData();
    formData.append('CodigoInternoAgencia', rep.articulo || '');
    formData.append('cantidadContada', String(cantidadEsteConteo));
    formData.append('EstadoProducto', estado);
    formData.append('observaciones', observaciones);
    formData.append('ubicacion', ubicacion);
    formData.append('requiereReconteo', 'false');
    formData.append('motivoReconteo', '');
    formData.append('usuarioContador', String(this.id));
    formData.append('precioUnitario', String(precioUnitario));
    formData.append('valorTotal', String(valorTotal));
    formData.append('campanaId', '3');
    formData.append('agenciaId', this.bodegaSeleccionadaid);
    formData.append('repuestoId', String(1));
    formData.append('ubicacionFisicaId', String(1));
    formData.append('clientOpId', clientOpId);   // ✅ NUEVO

    imagenes.forEach((imgLocal, i) => {
      formData.append('imagenes', imgLocal.archivo, imgLocal.archivo.name);
      formData.append(`descripcionImagen_${i}`, imgLocal.descripcion);
      formData.append(`esPrincipal_${i}`, String(imgLocal.esPrincipal));
    });

    // Registra este conteo en el estado local (fila + detalle por ubicación + Excel).
    // Devuelve el item de detalle creado para marcarlo sincronizado/pendiente después.
    const aplicarLocal = (conteoIdBackend: number | null, pendiente: boolean): ConteoDetalleUbicacion => {
      const d = new Date();
      const dd  = String(d.getDate()).padStart(2, '0');
      const mm  = String(d.getMonth() + 1).padStart(2, '0');
      const hh  = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const fechaStr = `${dd}/${mm}/${d.getFullYear()} ${hh}:${min}`;

      rep.conteo_fisico = totalAcumulado;
      rep.diferencia = totalAcumulado - stockSistema;
      rep.observaciones = esAdicional && rep.observaciones
        ? (observaciones ? `${rep.observaciones} | ${observaciones}` : rep.observaciones)
        : observaciones;
      rep.estado_conteo = rep.diferencia === 0 ? 'contado' : 'diferencia';
      rep.estado_producto = estado;
      (rep as any).ubicacion_fisica = ubicacion;

      rep.imagenes_locales = [...(rep.imagenes_locales || []), ...imagenes];

      const nuevoDetalleItem: ConteoDetalleUbicacion = {
        conteoId: conteoIdBackend,
        clientOpId,
        pendiente,
        usuarioContadorId: String(this.id),
        ubicacion: ubicacion || '-',
        cantidad: cantidadEsteConteo,
        usuario: nombreUsuario,
        fecha: fechaStr,
        estadoProducto: estado,
        observaciones: observaciones,
        origen: 'sesion'
      };

      rep.conteos_detalle = [ ...(rep.conteos_detalle || []), nuevoDetalleItem ];

      rep.numero_conteos = (rep.numero_conteos || 0) + 1;
      rep.contado_por = rep.contado_por
        ? (rep.contado_por.includes(nombreUsuario) ? rep.contado_por : `${rep.contado_por}, ${nombreUsuario}`)
        : nombreUsuario;
      rep.ubicacion_conteo = rep.ubicacion_conteo
        ? `${rep.ubicacion_conteo} | ${ubicacion}`
        : ubicacion;

      const nuevoDetalle = `${ubicacion}: ${cantidadEsteConteo} uds (Usuario: ${nombreUsuario}, Fecha: ${fechaStr})`;
      rep.ubicacion_conteo_detalle = rep.ubicacion_conteo_detalle
        ? `${rep.ubicacion_conteo_detalle} | ${nuevoDetalle}`
        : nuevoDetalle;
      rep.ultima_fecha_conteo = fechaStr;

      return nuevoDetalleItem;
    };

    this.inventarioService.createConteo(formData).subscribe({
      next: (resp: any) => {
        rep.guardado_backend = true;
        aplicarLocal(this.extraerIdConteoResp(resp), false); // sincronizado
        this.limpiarInline(rep);
        rep.inline_guardando = false;
        this.actualizarEstadisticas();
        this.aplicarFiltros();
      },
      error: (err) => {
        // ⚠️ Aquí YA fallaron los reintentos rápidos del service.
        //    NO se finge éxito: se guarda local Y se encola para reintento en segundo plano.
        console.error('createConteo inline agotó reintentos, encolando pendiente:', err);
        const detalle = aplicarLocal(null, true); // pendiente = true
        this.encolarPendiente({ clientOpId, formData, rep, detalle, intentos: 0, ultimoError: err?.message });
        this.limpiarInline(rep);
        rep.inline_guardando = false;
        this.actualizarEstadisticas();
        this.aplicarFiltros();
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // ✅ COLA DE GUARDADOS PENDIENTES (anti pérdida de conteos)
  //    Reintenta en segundo plano los conteos que no se pudieron
  //    confirmar, con idempotencia (clientOpId) para no duplicar.
  // ══════════════════════════════════════════════════════════════

  /** Genera un id de operación único (uuid) para idempotencia del guardado. */
  private generarClientOpId(): string {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    }
    // Fallback por si el WebView no expone crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });
  }

  /** Encola un conteo que no se pudo confirmar, para reintentarlo en segundo plano. */
  private encolarPendiente(item: ConteoPendiente): void {
    this.colaPendientes.push(item);
    item.rep.conteos_pendientes = (item.rep.conteos_pendientes || 0) + 1;
    if (item.detalle) item.detalle.pendiente = true;
    item.rep.guardado_backend = false; // aún no está en la base
    this.iniciarPollingPendientes();
  }

  /** Marca un pendiente como sincronizado y lo quita de la cola. */
  private resolverPendiente(item: ConteoPendiente, conteoIdBackend: number | null): void {
    const idx = this.colaPendientes.indexOf(item);
    if (idx >= 0) this.colaPendientes.splice(idx, 1);

    item.rep.conteos_pendientes = Math.max(0, (item.rep.conteos_pendientes || 1) - 1);
    if ((item.rep.conteos_pendientes || 0) === 0) {
      item.rep.guardado_backend = true;
    }
    if (item.detalle) {
      item.detalle.pendiente = false;
      if (conteoIdBackend != null) item.detalle.conteoId = conteoIdBackend;
    }

    if (this.colaPendientes.length === 0) {
      this.detenerPollingPendientes();
    }
  }

  /** Recorre la cola e intenta reenviar cada conteo pendiente. */
  private procesarColaPendientes(): void {
    if (this.procesandoPendientes) return;
    if (this.colaPendientes.length === 0) { this.detenerPollingPendientes(); return; }

    this.procesandoPendientes = true;
    const pendientes = [...this.colaPendientes]; // copia para iterar seguro
    let restantes = pendientes.length;

    const finalizar = () => {
      restantes--;
      if (restantes <= 0) this.procesandoPendientes = false;
    };

    pendientes.forEach((item) => {
      item.intentos++;
      this.inventarioService.createConteo(item.formData).subscribe({
        next: (resp: any) => {
          const idBackend = this.extraerIdConteoResp(resp);
          this.ngZone.run(() => {
            this.resolverPendiente(item, idBackend);
            this.actualizarEstadisticas();
            this.aplicarFiltros();
          });
          finalizar();
        },
        error: (err) => {
          item.ultimoError = err?.message || 'Error desconocido';
          console.warn(`Pendiente sigue fallando (intento ${item.intentos}):`, item.ultimoError);
          finalizar();
        }
      });
    });
  }

  private iniciarPollingPendientes(): void {
    if (this.pollingPendientesHandle) return;
    this.ngZone.runOutsideAngular(() => {
      this.pollingPendientesHandle = setInterval(() => {
        this.procesarColaPendientes();
      }, this.INTERVALO_POLLING_PENDIENTES_MS);
    });
  }

  private detenerPollingPendientes(): void {
    if (this.pollingPendientesHandle) {
      clearInterval(this.pollingPendientesHandle);
      this.pollingPendientesHandle = null;
    }
    this.procesandoPendientes = false;
  }

  // ══════════════════════════════════════════════════════════════
  // ✅ EDICIÓN DE UN CONTEO PROPIO (desde el modal de detalle)
  // El usuario solo puede editar conteos que ÉL mismo realizó.
  // ══════════════════════════════════════════════════════════════

  /** Extrae el id del conteo de la respuesta de createConteo.
   *  El servicio usa responseType 'text', así que el JSON del backend
   *  ({ message, conteoId }) llega como STRING dentro de resp.message. */
  private extraerIdConteoResp(resp: any): number | null {
    if (!resp) return null;

    let id = resp.id ?? resp.conteoId ?? resp.conteo_id ?? null;

    // El body real viene serializado en resp.message
    if ((id === null || id === undefined) && typeof resp.message === 'string') {
      try {
        const body = JSON.parse(resp.message);
        id = body?.conteoId ?? body?.id ?? null;
      } catch {
        // El backend pudo devolver texto plano; sin id no hay edición hasta recargar
        id = null;
      }
    }

    return (id !== null && id !== undefined && !isNaN(Number(id))) ? Number(id) : null;
  }

  /** true si el conteo fue realizado por el usuario logueado. */
  esConteoDelUsuario(det: ConteoDetalleUbicacion): boolean {
    const idActual = String(this.id || '').trim();

    // Comparación exacta por id de usuario
    if (det.usuarioContadorId) {
      return det.usuarioContadorId === idActual;
    }

    // Fallback por nombre
    const u = (det.usuario || '').trim().toLowerCase();
    if (!u || u === '-') return false;

    const nombreActual = this.getNombreUsuario().trim().toLowerCase();
    return u === idActual.toLowerCase()
        || u === nombreActual
        || u === `usuario ${idActual.toLowerCase()}`;
  }

  /** true si la fila del modal puede entrar a edición */
  puedeEditarConteo(det: ConteoDetalleUbicacion): boolean {
    return this.esConteoDelUsuario(det)
        && det.cantidad !== null && det.cantidad !== undefined
        && !!det.conteoId;
  }

  /** Tooltip del botón editar según el caso */
  getTituloEditarConteo(det: ConteoDetalleUbicacion): string {
    if (!this.esConteoDelUsuario(det)) return 'Solo puede editar los conteos realizados por usted';
    if (!det.conteoId) return 'Este conteo no tiene ID del servidor; recargue la página para poder editarlo';
    return 'Editar este conteo';
  }

  /** Activa el modo edición en la fila del modal, copiando los valores actuales */
  iniciarEdicionConteo(det: ConteoDetalleUbicacion): void {
    if (!this.puedeEditarConteo(det)) return;
    // Cerrar cualquier otra edición abierta
    (this.repuestoConteosDetalle?.conteos_detalle || []).forEach(d => d.editando = false);

    det.edit_cantidad = det.cantidad;
    det.edit_ubicacion = det.ubicacion === '-' ? '' : det.ubicacion;
    det.edit_estado = det.estadoProducto || 'bueno';
    det.edit_observaciones = det.observaciones || '';
    det.editando = true;
  }

  /** Cancela la edición sin guardar */
  cancelarEdicionConteo(det: ConteoDetalleUbicacion): void {
    det.editando = false;
    det.edit_guardando = false;
  }

  /** ✅ Guarda la edición del conteo: actualiza el backend y recalcula el acumulado local */
  guardarEdicionConteo(det: ConteoDetalleUbicacion): void {
    const rep = this.repuestoConteosDetalle;
    if (!rep || !det.conteoId) return;

    const nuevaCantidad = det.edit_cantidad;
    if (nuevaCantidad === null || nuevaCantidad === undefined || nuevaCantidad < 0) {
      alert('Ingrese una cantidad válida (0 o mayor)');
      return;
    }
    const nuevaUbicacion = (det.edit_ubicacion || '').trim();
    if (!nuevaUbicacion) {
      alert('Ingrese la ubicación del conteo');
      return;
    }

    const nuevoEstado = det.edit_estado || 'bueno';
    const nuevasObs = (det.edit_observaciones || '').trim();

    det.edit_guardando = true;

    // ✅ Payload con la forma EXACTA del ConteoInventarioDto que espera PUT conteo/{id}.
    const payload: any = {
      CodigoInternoAgencia: rep.articulo || '',
      cantidadContada: nuevaCantidad,
      EstadoProducto: nuevoEstado,
      observaciones: nuevasObs,
      ubicacion: nuevaUbicacion,
      usuarioContador: String(this.id),   // el backend valida que el conteo sea de este usuario
      precioUnitario: parseFloat((rep.costo_uni || 0).toFixed(2)),
      valorTotal: parseFloat(((rep.costo_uni || 0) * nuevaCantidad).toFixed(2)),
      campanaId: 3,
      agenciaId: this.bodegaSeleccionadaid,
      repuestoId: 1,
      ubicacionFisicaId: 1,
      requiereReconteo: false,
      motivoReconteo: '',
      usuarioReconteo: '',
      cantidadReconteo: null
    };

    this.inventarioService.updateConteo(det.conteoId, payload).subscribe({
      next: () => {
        this.aplicarEdicionLocal(rep, det, nuevaCantidad, nuevaUbicacion, nuevoEstado, nuevasObs);
        det.edit_guardando = false;
        det.editando = false;
        this.actualizarEstadisticas();
        this.aplicarFiltros();
      },
      error: (err) => {
        console.error('Error al actualizar conteo:', err);
        det.edit_guardando = false;
        alert('No se pudo actualizar el conteo en el servidor. Intente nuevamente.');
      }
    });
  }

  /** Aplica la edición al estado local */
  private aplicarEdicionLocal(
    rep: RepuestoConteo,
    det: ConteoDetalleUbicacion,
    nuevaCantidad: number,
    nuevaUbicacion: string,
    nuevoEstado: string,
    nuevasObs: string
  ): void {
    const delta = nuevaCantidad - (det.cantidad || 0);

    det.cantidad = nuevaCantidad;
    det.ubicacion = nuevaUbicacion;
    det.estadoProducto = nuevoEstado;
    det.observaciones = nuevasObs;

    rep.conteo_fisico = (rep.conteo_fisico || 0) + delta;
    rep.diferencia = rep.conteo_fisico - (rep.stock_disponible || 0);
    rep.estado_conteo = rep.diferencia === 0 ? 'contado' : 'diferencia';

    this.reconstruirResumenConteos(rep);
  }

  /** Reconstruye ubicacion_conteo y ubicacion_conteo_detalle a partir del array de conteos */
  private reconstruirResumenConteos(rep: RepuestoConteo): void {
    const detalles = rep.conteos_detalle || [];
    if (detalles.length === 0) return;

    rep.ubicacion_conteo = detalles.map(d => d.ubicacion).filter(u => u && u !== '-').join(' | ');

    rep.ubicacion_conteo_detalle = detalles.map(d => {
      const cant = (d.cantidad !== null && d.cantidad !== undefined) ? `${d.cantidad} uds` : '';
      const partes = [
        `${d.ubicacion}: ${cant}`.trim(),
        d.usuario ? `Usuario: ${d.usuario}` : '',
        d.fecha ? `Fecha: ${d.fecha}` : ''
      ].filter(p => p);
      return `${partes[0]} (${partes.slice(1).join(', ')})`;
    }).join(' | ');
  }

  getColorEstadoProducto(estado: string): string {
    const found = this.estadosProducto.find(e => e.valor === estado);
    return found ? found.color : 'secondary';
  }

  getIconoEstadoProducto(estado: string): string {
    const found = this.estadosProducto.find(e => e.valor === estado);
    return found ? found.icono : 'bi-question';
  }

  getLabelEstadoProducto(estado: string): string {
    const found = this.estadosProducto.find(e => e.valor === estado);
    return found ? found.label : estado;
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  ngOnDestroy(): void {
    this.detenerPollingConteos();
    this.detenerPollingGlobal();
    this.detenerPollingPendientes();
    this.sseConteos.desconectar();   // ✅ SSE: cierra el EventSource
    this.sseSub?.unsubscribe();      // ✅ SSE: desarma la suscripción a avisos
    document.removeEventListener('visibilitychange', this.onCambioVisibilidadDocumento);
    this.busquedaTexto$.complete();
  }
}