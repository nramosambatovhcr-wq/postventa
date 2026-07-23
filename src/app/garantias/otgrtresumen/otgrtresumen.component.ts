import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { OrdenTrabajoDetalle, GarantiasService } from 'src/app/services/garantias.service';
import { SeguimientoOtService, ObservacionOt, SincronizarOtRequest } from 'src/app/services/seguimiento-ot.service';
// ⚠️ Ajusta la ruta de arriba a donde ubiques seguimiento-ot.service.ts


import * as XLSX from 'xlsx';

// ⭐️ [NUEVO] Referencia mínima a una imagen de evidencia (para las miniaturas en la tabla)
interface ImagenMiniatura {
  id: number;
  nombreArchivo: string;
}

// ⭐️ [NUEVO] Estructura del resumen agrupado por agencia
interface AgenciaResumen {
  oficinaId: string;
  oficinaNombre: string;
  cantidadOTs: number;
  totalGeneral: number;
  promedioDias: number;
  porcentaje: number; // ancho de la barra relativo a la agencia con mayor total
}

// ⭐️ [NUEVO] Una fila = una Orden de Trabajo (sin desglosar artículos).
// El detalle de artículos queda embebido en `detalles` y se muestra solo al expandir.
// Los campos de texto son opcionales porque OrdenTrabajoDetalle los define como `string | undefined`.
interface OrdenAgrupada {
  numero: string | undefined;
  tipo?: string;
  oficinaId: string | undefined;
  oficinaNombre: string | undefined;
  estado: string | undefined;
  fechaSolicitud: Date | undefined;
  diasAbierto: number;
  clienteNombre: string | undefined;
  clienteCedula: string | undefined;
  chasis: string | undefined;
  motivo: string | undefined;
  monto: number;
  tasaIva: number;
  total: number;
  usuarioCreacion: string | undefined;
  usuarioActualizacion: string | undefined;
  cantidadArticulos: number;   // número de líneas de artículo distintas
  totalArticulos: number;      // suma de cantidades de todas las líneas
  detalles: OrdenTrabajoDetalle[];
}

@Component({
  selector: 'app-otgrtresumen',
  templateUrl: './otgrtresumen.component.html',
  styleUrls: ['./otgrtresumen.component.css']
})
export class OtgrtresumenComponent implements OnInit {
  ordenes: OrdenTrabajoDetalle[] = [];
  ordenesFiltradas: OrdenTrabajoDetalle[] = [];

  // ⭐️ [NUEVO] Órdenes agrupadas por número de OT (una fila por orden, sin detalle de artículos)
  ordenesAgrupadas: OrdenAgrupada[] = [];

  loading = false;
  error: string | null = null;
  
  // ⭐️ [NUEVO] Propiedad para controlar la vista actual
  vistaActual: 'pendientes' | 'procesadas' = 'pendientes';
  
  // Filtros
  filtroOficina = '';
  filtroNumero = '';
  filtroCliente = '';
  filtroArticulo = '';
  
  // Paginación
  paginaActual = 1;
  itemsPorPagina = 30;
  
  // Ordenamiento
  columnaOrden = 'diasAbierto';
  ordenAscendente = false;
  
  // Vista detalle (modal con el detalle completo de UNA línea de artículo)
  mostrarDetalleExpandido = false;
  ordenSeleccionada: OrdenTrabajoDetalle | null = null;

  // ⭐️ [NUEVO] Número de OT actualmente expandida en la tabla (acordeón). null = ninguna
  ordenExpandidaNumero: string | null | undefined = null;

  // ⭐️ [NUEVO] Seguimiento en PostgreSQL: números de OT marcados como "recién aparece"
  // en la última sincronización (fecha de solicitud vieja pero detectada apenas ahora)
  ordenesRecienAparecen: Set<string> = new Set<string>();
  sincronizandoSeguimiento = false;

  // ⭐️ [NUEVO] Panel de observaciones (histórico) de una OT
  mostrarObservaciones = false;
  ordenObservacionesActual: OrdenAgrupada | null = null;
  listaObservaciones: ObservacionOt[] = [];
  nuevaObservacion = '';
  cargandoObservaciones = false;
  guardandoObservacion = false;

  // ⭐️ [NUEVO] Imágenes de evidencia adjuntas a la nueva observación (antes de guardar)
  imagenesSeleccionadas: File[] = [];
  previewsImagenes: string[] = [];

  // ⭐️ [MODIFICADO] Lightbox tipo galería: en vez de una sola URL, guarda el conjunto
  // de imágenes del contexto desde donde se abrió (miniaturas de la tabla, previews,
  // o evidencias de una observación del histórico) y el índice de la imagen visible.
  // Así se puede navegar entre todas sin cerrar y volver a abrir.
  galeriaUrls: string[] = [];
  galeriaNombres: string[] = [];
  galeriaIndice = 0;

  get galeriaAbierta(): boolean {
    return this.galeriaUrls.length > 0;
  }

  get galeriaUrlActual(): string {
    return this.galeriaUrls[this.galeriaIndice] || '';
  }

  get galeriaNombreActual(): string {
    return this.galeriaNombres[this.galeriaIndice] || '';
  }

  // ⭐️ [NUEVO] Control de acceso: solo este usuario puede registrar observaciones.
  // Los demás usuarios solo pueden VER la columna con la última observación.
  private readonly USUARIO_CON_PERMISO_OBSERVACIONES = 'fmoya';

  // ⭐️ [MODIFICADO] Última observación de cada OT (numero -> texto/usuario/fecha/imágenes),
  // para mostrarla en la columna de la tabla sin tener que abrir el modal.
  // `imagenes` = todas las evidencias de la última observación; `miniaturas` = las primeras
  // MAX_MINIATURAS_TABLA precalculadas (evita crear arrays nuevos en cada ciclo de change detection).
  ultimasObservaciones: Map<string, {
    texto: string;
    usuario: string;
    fecha: Date;
    imagenes: ImagenMiniatura[];
    miniaturas: ImagenMiniatura[];
  }> = new Map();

  // ⭐️ [NUEVO] Máximo de miniaturas visibles en la celda de la tabla; el resto se
  // resume en un botón "+N" que abre el modal.
  private readonly MAX_MINIATURAS_TABLA = 3;

  // ⭐️ [NUEVO] Array vacío compartido para los helpers de la tabla (referencia estable,
  // no genera trabajo extra de change detection).
  private readonly SIN_IMAGENES: ImagenMiniatura[] = [];

  Math = Math;
  id: number = 0;
    usuario: Usuario | null = null;
    rolusuario:any;
    nombre:any;

  constructor(
    private garantiasService: GarantiasService,
    private seguimientoOtService: SeguimientoOtService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        this.rolusuario=this.usuario.rol;
        this.nombre = this.usuario.nombreUsuario

      }
    });
    this.cargarOrdenes();
  }

  cargarOrdenes(): void {
    this.loading = true;
    this.error = null;

    // ⭐️ [MODIFICADO] Lógica condicional para cargar datos según la vista
    const observable = this.vistaActual === 'pendientes'
      ? this.garantiasService.getOrdenesAbiertasConDetalle()
      : this.garantiasService.getOrdenesProcesadasConDetalle(); // Asume este método existe

    observable.subscribe({
      next: (data) => {
        this.ordenes = data;
        // Reiniciar la paginación y filtros al cargar nuevos datos
        this.paginaActual = 1;
        this.ordenExpandidaNumero = null;
        this.aplicarFiltros();
        this.loading = false;

        // ⭐️ [FIX] Antes estas dos llamadas se disparaban en paralelo, y como ambas son
        // HTTP async, si sincronizarConControl() respondía DESPUÉS de cargarUltimasObservaciones(),
        // su callback sobreescribía por completo `ordenesRecienAparecen` con el resultado de
        // ESA sincronización puntual (que casi siempre viene vacío, porque el backend "no
        // duplica" OTs ya existentes) — borrando el estado persistente que ya habíamos cargado
        // bien. Ahora se encadenan: primero se sincroniza (o se omite si es vista "procesadas"),
        // y solo al terminar esa sincronización se carga el estado real desde la BD, que
        // siempre queda como la última escritura y por lo tanto la fuente de verdad final.
        if (this.vistaActual === 'pendientes') {
          this.sincronizarConControl(() => this.cargarUltimasObservaciones());
        } else {
          this.cargarUltimasObservaciones();
        }
      },
      error: (err) => {
        this.error = `Error al cargar las órdenes de trabajo (${this.vistaActual}). Por favor, intente nuevamente.`;
        console.error('Error:', err);
        this.loading = false;
      }
    });
  }

  // ⭐️ [NUEVO] Envía las OTs agrupadas (pendientes) al control en PostgreSQL.
  // El backend decide: si numero_orden no existe -> la registra (y marca "recién aparece"
  // si su fecha de solicitud no es la del corte de hoy); si ya existe -> no la duplica.
  // ⭐️ [FIX] Recibe un callback `alFinalizar` que se ejecuta siempre al terminar (éxito o
  // error), para poder encadenar cargarUltimasObservaciones() después y evitar la condición
  // de carrera descrita arriba.
  private sincronizarConControl(alFinalizar?: () => void): void {
    if (this.ordenesAgrupadas.length === 0) {
      alFinalizar?.();
      return;
    }

    const usuario = this.obtenerUsuarioActual();
    if (!usuario) {
      alFinalizar?.();
      return;
    }

    const payload: SincronizarOtRequest[] = this.ordenesAgrupadas.map(ot => ({
      numeroOrden: ot.numero || '',
      oficinaId: ot.oficinaId,
      oficinaNombre: ot.oficinaNombre,
      clienteNombre: ot.clienteNombre,
      chasis: ot.chasis,
      estado: ot.estado,
      fechaSolicitud: ot.fechaSolicitud,
      usuarioCreacion: ot.usuarioCreacion
    })).filter(o => !!o.numeroOrden);

    if (payload.length === 0) {
      alFinalizar?.();
      return;
    }

    this.sincronizandoSeguimiento = true;
    this.seguimientoOtService.sincronizar(usuario, payload).subscribe({
      next: (resultado) => {
        this.sincronizandoSeguimiento = false;
        if (resultado.numerosRecienAparecen.length > 0) {
          console.log(
            `⚠️ ${resultado.numerosRecienAparecen.length} OT(s) recién aparecen con fecha antigua:`,
            resultado.numerosRecienAparecen
          );
        }
        alFinalizar?.();
      },
      error: (err) => {
        console.error('Error al sincronizar el control de seguimiento de OTs:', err);
        this.sincronizandoSeguimiento = false;
        alFinalizar?.();
      }
    });
  }

  // ⭐️ [NUEVO] TODO: reemplaza esto por tu servicio de autenticación real,
  // ej: return this.authService.usuarioActual?.nombreUsuario;
  private obtenerUsuarioActual(): string {
    return 'USUARIO_ACTUAL';
  }

  // ⭐️ [FIX] true si esta OT está marcada como "recién aparece" en el estado persistente
  // de PostgreSQL (campo `recienAparece`), cargado por cargarUltimasObservaciones().
  esRecienAparecida(numero: string | undefined): boolean {
    return !!numero && this.ordenesRecienAparecen.has(numero);
  }

  // ⭐️ [NUEVO] Trae el control completo (con última observación) y arma un mapa numero -> observación
  // para pintar la columna de la tabla sin llamadas individuales por fila.
  private cargarUltimasObservaciones(): void {
    this.seguimientoOtService.obtenerTodos().subscribe({
      next: (registros) => {
        const mapa = new Map<string, {
          texto: string; usuario: string; fecha: Date;
          imagenes: ImagenMiniatura[]; miniaturas: ImagenMiniatura[];
        }>();
        const recienAparecen = new Set<string>();

        registros.forEach(r => {
          if (r.ultimaObservacion) {
            // ⭐️ [NUEVO] El backend ahora incluye las evidencias de la última observación
            // (ultimaObservacionImagenes). Se usa (r as any) mientras el interface del
            // servicio no declare el campo; si ya lo agregaste, puedes quitar el cast.
            const imagenes: ImagenMiniatura[] = ((r as any).ultimaObservacionImagenes || [])
              .map((img: any) => ({ id: img.id, nombreArchivo: img.nombreArchivo || '' }));

            mapa.set(r.numeroOrden, {
              texto: r.ultimaObservacion,
              usuario: r.ultimaObservacionUsuario || '',
              fecha: r.ultimaObservacionFecha as Date,
              imagenes,
              miniaturas: imagenes.slice(0, this.MAX_MINIATURAS_TABLA)
            });
          }
          // ⭐️ [FIX] El backend guarda `recienAparece` como estado persistente de la OT
          // en PostgreSQL. Antes solo se leía desde la respuesta de sincronizar(), que
          // apenas marca la OT en el instante exacto en que se detecta por primera vez.
          // En cargas posteriores esa respuesta ya no la vuelve a incluir (porque la OT
          // ya existe y sincronizar() no la duplica), así que el badge desaparecía aunque
          // la OT siguiera marcada como "recién aparece" en la base de datos.
          if ((r as any).recienAparece) {
            recienAparecen.add(r.numeroOrden);
          }
        });

        this.ultimasObservaciones = mapa;
        this.ordenesRecienAparecen = recienAparecen;
      },
      error: (err) => console.error('Error al cargar las últimas observaciones:', err)
    });
  }

  // ⭐️ [NUEVO] Texto de la última observación de una OT (o '' si no tiene ninguna)
  obtenerUltimaObservacion(numero: string | undefined): string {
    if (!numero) return '';
    return this.ultimasObservaciones.get(numero)?.texto || '';
  }

  // ⭐️ [NUEVO] Tooltip con usuario y fecha de la última observación
  obtenerTooltipUltimaObservacion(numero: string | undefined): string {
    if (!numero) return '';
    const obs = this.ultimasObservaciones.get(numero);
    if (!obs) return '';
    return `${obs.usuario} · ${this.formatearFecha(obs.fecha)}`;
  }

  // ⭐️ [NUEVO] Miniaturas (máx. MAX_MINIATURAS_TABLA) de la última observación para la tabla.
  // Devuelve siempre la MISMA referencia de array (precalculada), no crea arrays por ciclo.
  obtenerMiniaturasUltimaObservacion(numero: string | undefined): ImagenMiniatura[] {
    if (!numero) return this.SIN_IMAGENES;
    return this.ultimasObservaciones.get(numero)?.miniaturas || this.SIN_IMAGENES;
  }

  // ⭐️ [NUEVO] Cuántas evidencias de la última observación NO caben como miniatura
  // (se muestran como "+N" que abre el modal)
  contarImagenesExtraUltimaObservacion(numero: string | undefined): number {
    if (!numero) return 0;
    const obs = this.ultimasObservaciones.get(numero);
    if (!obs) return 0;
    return Math.max(0, obs.imagenes.length - this.MAX_MINIATURAS_TABLA);
  }

  // ⭐️ [NUEVO] Control de acceso: solo 'fmoya' puede registrar observaciones.
  // El resto de usuarios solo ve la columna con la última observación (solo lectura).
  get puedeRegistrarObservaciones(): boolean {
    return this.nombre === this.USUARIO_CON_PERMISO_OBSERVACIONES;
  }

  // ⭐️ [NUEVO] Método para cambiar la vista y recargar
  cambiarVista(nuevaVista: 'pendientes' | 'procesadas'): void {
    if (this.vistaActual !== nuevaVista) {
      this.vistaActual = nuevaVista;
      this.limpiarFiltros(); 
      this.cargarOrdenes();
    }
  }

  aplicarFiltros(): void {
    this.ordenesFiltradas = this.ordenes.filter(orden => {
      const cumpleFiltroOficina = !this.filtroOficina || 
        orden.oficinaNombre?.toLowerCase().includes(this.filtroOficina.toLowerCase());
      
      const cumpleFiltroNumero = !this.filtroNumero || 
        orden.numero?.toLowerCase().includes(this.filtroNumero.toLowerCase());
      
      const cumpleFiltroCliente = !this.filtroCliente || 
        orden.clienteNombre?.toLowerCase().includes(this.filtroCliente.toLowerCase());
      
      const cumpleFiltroArticulo = !this.filtroArticulo || 
        orden.articuloDescripcion?.toLowerCase().includes(this.filtroArticulo.toLowerCase()) ||
        orden.articuloId?.toLowerCase().includes(this.filtroArticulo.toLowerCase());
      
      return cumpleFiltroOficina && cumpleFiltroNumero && cumpleFiltroCliente && cumpleFiltroArticulo;
    });

    // ⭐️ [NUEVO] Reconstruir el agrupado por OT cada vez que cambian los filtros
    this.agruparOrdenes();

    this.paginaActual = 1;
  }

  // ⭐️ [NUEVO] Agrupa ordenesFiltradas (líneas de artículo) en una fila por número de OT
  private agruparOrdenes(): void {
    const mapa = new Map<string, OrdenAgrupada>();

    this.ordenesFiltradas.forEach(orden => {
      const key = orden.numero || 'N/A';
      if (!mapa.has(key)) {
        mapa.set(key, {
          numero: orden.numero,
          tipo: (orden as any).tipo,
          oficinaId: orden.oficinaId,
          oficinaNombre: orden.oficinaNombre,
          estado: orden.estado,
          fechaSolicitud: orden.fechaSolicitud,
          diasAbierto: orden.diasAbierto || 0,
          clienteNombre: orden.clienteNombre,
          clienteCedula: orden.clienteCedula,
          chasis: orden.chasis,
          motivo: orden.motivo,
          monto: orden.monto || 0,
          tasaIva: orden.tasaIva || 0,
          total: orden.total || 0,
          usuarioCreacion: orden.usuarioCreacion,
          usuarioActualizacion: orden.usuarioActualizacion,
          cantidadArticulos: 0,
          totalArticulos: 0,
          detalles: []
        });
      }
      const grupo = mapa.get(key)!;
      grupo.detalles.push(orden);
      grupo.cantidadArticulos += 1;
      grupo.totalArticulos += orden.cantidad || 0;
    });

    this.ordenesAgrupadas = Array.from(mapa.values());

    // Mantener el criterio de ordenamiento activo al reagrupar
    this.ordenarOrdenesAgrupadas(this.columnaOrden, this.ordenAscendente);
  }

  limpiarFiltros(): void {
    this.filtroOficina = '';
    this.filtroNumero = '';
    this.filtroCliente = '';
    this.filtroArticulo = '';
    this.aplicarFiltros();
  }

  // ⭐️ [MODIFICADO] Ahora ordena las OTs agrupadas, no las líneas de artículo
  ordenarPor(columna: string): void {
    if (this.columnaOrden === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.columnaOrden = columna;
      this.ordenAscendente = true;
    }

    this.ordenarOrdenesAgrupadas(this.columnaOrden, this.ordenAscendente);
  }

  private ordenarOrdenesAgrupadas(columna: string, ascendente: boolean): void {
    this.ordenesAgrupadas.sort((a, b) => {
      let valorA: any;
      let valorB: any;

      switch (columna) {
        case 'diasAbierto':
          valorA = a.diasAbierto || 0;
          valorB = b.diasAbierto || 0;
          break;
        case 'oficina':
          valorA = a.oficinaNombre || '';
          valorB = b.oficinaNombre || '';
          break;
        case 'numero':
          valorA = a.numero || '';
          valorB = b.numero || '';
          break;
        case 'cliente':
          valorA = a.clienteNombre || '';
          valorB = b.clienteNombre || '';
          break;
        case 'articulos':
          valorA = a.cantidadArticulos || 0;
          valorB = b.cantidadArticulos || 0;
          break;
        case 'total':
          valorA = a.total || 0;
          valorB = b.total || 0;
          break;
        case 'fechaSolicitud':
          valorA = a.fechaSolicitud ? new Date(a.fechaSolicitud).getTime() : 0;
          valorB = b.fechaSolicitud ? new Date(b.fechaSolicitud).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (valorA < valorB) return ascendente ? -1 : 1;
      if (valorA > valorB) return ascendente ? 1 : -1;
      return 0;
    });
  }

  // ⭐️ [MODIFICADO] La paginación ahora opera sobre las OTs agrupadas
  get ordenesPaginadas(): OrdenAgrupada[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.ordenesAgrupadas.slice(inicio, fin);
  }

  // ⭐️ [NUEVO] Expande/colapsa el detalle de artículos de una OT (acordeón)
  toggleDetalle(numero: string | undefined): void {
    this.ordenExpandidaNumero = this.ordenExpandidaNumero === numero ? null : numero;
  }

  estaExpandida(numero: string | undefined): boolean {
    return this.ordenExpandidaNumero === numero;
  }

  // ⭐️ [MODIFICADO] Resumen agrupado por agencia, calculado sobre las OTs (no sobre las líneas
  // de artículo) para no duplicar el total de una orden con varios artículos.
  get resumenAgencias(): AgenciaResumen[] {
    const mapa = new Map<string, AgenciaResumen>();

    this.ordenesAgrupadas.forEach(orden => {
      const key = orden.oficinaId || orden.oficinaNombre || 'N/A';
      if (!mapa.has(key)) {
        mapa.set(key, {
          oficinaId: orden.oficinaId || 'N/A',
          oficinaNombre: orden.oficinaNombre || 'Sin Oficina',
          cantidadOTs: 0,
          totalGeneral: 0,
          promedioDias: 0,
          porcentaje: 0
        });
      }
      const item = mapa.get(key)!;
      item.cantidadOTs++;
      item.totalGeneral += orden.total || 0;
      item.promedioDias += orden.diasAbierto || 0;
    });

    const resultado = Array.from(mapa.values()).map(item => ({
      ...item,
      promedioDias: item.cantidadOTs > 0 ? Math.round(item.promedioDias / item.cantidadOTs) : 0
    }));

    resultado.sort((a, b) => b.totalGeneral - a.totalGeneral);

    const maxTotal = resultado.length > 0 ? resultado[0].totalGeneral : 0;
    resultado.forEach(item => {
      item.porcentaje = maxTotal > 0 ? Math.round((item.totalGeneral / maxTotal) * 1000) / 10 : 0;
    });

    return resultado;
  }

  // ⭐️ [MODIFICADO] KPIs globales calculados sobre las OTs agrupadas (evita doble conteo)
  get totalGeneralFiltrado(): number {
    return this.ordenesAgrupadas.reduce((sum, o) => sum + (o.total || 0), 0);
  }

  get totalAgenciasCount(): number {
    return this.resumenAgencias.length;
  }

  get promedioDiasGlobal(): number {
    if (this.ordenesAgrupadas.length === 0) return 0;
    const total = this.ordenesAgrupadas.reduce((sum, o) => sum + (o.diasAbierto || 0), 0);
    return Math.round(total / this.ordenesAgrupadas.length);
  }

  // ⭐️ [NUEVO] Clic en una agencia del resumen -> filtra la tabla por esa oficina
  filtrarPorAgencia(oficinaNombre: string): void {
    this.filtroOficina = this.filtroOficina === oficinaNombre ? '' : oficinaNombre;
    this.aplicarFiltros();
  }

  // ⭐️ [MODIFICADO] Total de páginas según las OTs agrupadas
  get totalPaginas(): number {
    return Math.ceil(this.ordenesAgrupadas.length / this.itemsPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  get paginasArray(): number[] {
    const paginas = [];
    const maxPaginas = 5;
    let inicio = Math.max(1, this.paginaActual - Math.floor(maxPaginas / 2));
    let fin = Math.min(this.totalPaginas, inicio + maxPaginas - 1);
    
    if (fin - inicio < maxPaginas - 1) {
      inicio = Math.max(1, fin - maxPaginas + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  // Modal con el detalle completo de una línea de artículo específica (dentro del acordeón)
  verDetalle(orden: OrdenTrabajoDetalle): void {
    this.ordenSeleccionada = orden;
    this.mostrarDetalleExpandido = true;
  }

  cerrarDetalle(): void {
    this.mostrarDetalleExpandido = false;
    this.ordenSeleccionada = null;
  }

  // ⭐️ [NUEVO] Panel de observaciones: abre y carga el histórico de una OT
  abrirObservaciones(orden: OrdenAgrupada): void {
    this.ordenObservacionesActual = orden;
    this.mostrarObservaciones = true;
    this.nuevaObservacion = '';
    this.listaObservaciones = [];
    this.limpiarImagenesSeleccionadas();

    if (!orden.numero) return;

    this.cargandoObservaciones = true;
    this.seguimientoOtService.obtenerObservaciones(orden.numero).subscribe({
      next: (obs) => {
        this.listaObservaciones = obs;
        this.cargandoObservaciones = false;
      },
      error: (err) => {
        console.error('Error al cargar observaciones:', err);
        this.cargandoObservaciones = false;
      }
    });
  }

  cerrarObservaciones(): void {
    this.mostrarObservaciones = false;
    this.ordenObservacionesActual = null;
    this.listaObservaciones = [];
    this.nuevaObservacion = '';
    this.limpiarImagenesSeleccionadas();
  }

  // ⭐️ [NUEVO] ============ Manejo de imágenes de evidencia ============

  onImagenesSeleccionadas(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const MAX_IMAGENES = 5;
    const MAX_MB = 5;

    Array.from(input.files).forEach(file => {
      if (this.imagenesSeleccionadas.length >= MAX_IMAGENES) return;
      if (!file.type.startsWith('image/')) return;
      if (file.size > MAX_MB * 1024 * 1024) {
        alert(`La imagen "${file.name}" supera el máximo de ${MAX_MB} MB y no se agregará.`);
        return;
      }
      this.imagenesSeleccionadas.push(file);

      // Generar preview local (base64) para mostrar antes de guardar
      const reader = new FileReader();
      reader.onload = () => this.previewsImagenes.push(reader.result as string);
      reader.readAsDataURL(file);
    });

    // Permite volver a seleccionar el mismo archivo si se quitó
    input.value = '';
  }

  quitarImagenSeleccionada(index: number): void {
    this.imagenesSeleccionadas.splice(index, 1);
    this.previewsImagenes.splice(index, 1);
  }

  limpiarImagenesSeleccionadas(): void {
    this.imagenesSeleccionadas = [];
    this.previewsImagenes = [];
  }

  // URL pública de una imagen de evidencia guardada (servida por el backend)
  urlImagenObservacion(imagenId: number): string {
    return this.seguimientoOtService.urlImagenObservacion(imagenId);
  }

  // ⭐️ [NUEVO] ============ Galería (lightbox navegable) ============

  /** Abre la galería con un conjunto de URLs, posicionada en la imagen `indice`. */
  abrirGaleria(urls: string[], indice: number, nombres: string[] = []): void {
    if (!urls || urls.length === 0) return;
    this.galeriaUrls = urls;
    this.galeriaNombres = nombres;
    this.galeriaIndice = Math.min(Math.max(indice, 0), urls.length - 1);
  }

  /** Abre la galería a partir de una lista de evidencias guardadas ({id, nombreArchivo}). */
  abrirGaleriaEvidencias(imagenes: { id: number; nombreArchivo?: string }[], indice: number): void {
    if (!imagenes || imagenes.length === 0) return;
    this.abrirGaleria(
      imagenes.map(img => this.urlImagenObservacion(img.id)),
      indice,
      imagenes.map(img => img.nombreArchivo || '')
    );
  }

  /** Abre la galería con TODAS las evidencias de la última observación de una OT
   *  (aunque en la tabla solo se muestren las primeras como miniatura). */
  abrirGaleriaUltimaObservacion(numero: string | undefined, indice: number): void {
    if (!numero) return;
    const obs = this.ultimasObservaciones.get(numero);
    if (!obs || obs.imagenes.length === 0) return;
    this.abrirGaleriaEvidencias(obs.imagenes, indice);
  }

  cerrarGaleria(): void {
    this.galeriaUrls = [];
    this.galeriaNombres = [];
    this.galeriaIndice = 0;
  }

  /** Navegación circular: desde la última pasa a la primera y viceversa. */
  galeriaSiguiente(): void {
    if (this.galeriaUrls.length < 2) return;
    this.galeriaIndice = (this.galeriaIndice + 1) % this.galeriaUrls.length;
  }

  galeriaAnterior(): void {
    if (this.galeriaUrls.length < 2) return;
    this.galeriaIndice = (this.galeriaIndice - 1 + this.galeriaUrls.length) % this.galeriaUrls.length;
  }

  // ⭐️ [NUEVO] Navegación con teclado mientras la galería está abierta:
  // flecha izquierda/derecha para moverse, Escape para cerrar.
  @HostListener('window:keydown', ['$event'])
  manejarTeclasGaleria(event: KeyboardEvent): void {
    if (!this.galeriaAbierta) return;
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        this.galeriaSiguiente();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.galeriaAnterior();
        break;
      case 'Escape':
        event.preventDefault();
        this.cerrarGaleria();
        break;
    }
  }

  // ⭐️ [NUEVO] Guarda una nueva observación para la OT abierta en el panel
  guardarObservacion(): void {
    if (!this.puedeRegistrarObservaciones) return; // control de acceso: solo fmoya
    if (!this.ordenObservacionesActual?.numero || !this.nuevaObservacion.trim()) return;

    const numero = this.ordenObservacionesActual.numero;
    const usuario = this.nombre;

    this.guardandoObservacion = true;
    // ⭐️ [MODIFICADO] Ahora se envía la observación junto con las imágenes de evidencia
    // (multipart/form-data). Si no hay imágenes, funciona igual que antes.
    this.seguimientoOtService.agregarObservacionConImagenes(
      numero,
      this.nuevaObservacion.trim(),
      usuario,
      this.imagenesSeleccionadas
    ).subscribe({
      next: (obs) => {
        this.listaObservaciones.unshift(obs);
        this.nuevaObservacion = '';
        this.limpiarImagenesSeleccionadas();
        this.guardandoObservacion = false;
        // Refleja de inmediato la nueva observación (texto + evidencias) en la columna de la tabla
        const imagenes: ImagenMiniatura[] = (obs.imagenes || [])
          .map((img: any) => ({ id: img.id, nombreArchivo: img.nombreArchivo || '' }));
        this.ultimasObservaciones.set(numero, {
          texto: obs.observacion,
          usuario: obs.usuario,
          fecha: obs.fechaObservacion,
          imagenes,
          miniaturas: imagenes.slice(0, this.MAX_MINIATURAS_TABLA)
        });
      },
      error: (err) => {
        console.error('Error al guardar la observación:', err);
        this.guardandoObservacion = false;
        alert('No se pudo guardar la observación. Por favor, intente nuevamente.');
      }
    });
  }

  formatearFecha(fecha: Date | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatearMoneda(valor: number | undefined): string {
    if (valor === undefined || valor === null) return '$0.00';
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(valor);
  }

  getClaseDiasAbierto(dias: number | undefined): string {
    if (!dias) return '';
    if (dias > 30) return 'dias-critico';
    if (dias > 15) return 'dias-alerta';
    return 'dias-normal';
  }

  exportarExcel(): void {
    try {
      const datosExportar = this.ordenesFiltradas.map(orden => ({
        'Días Abierto': orden.diasAbierto || 0,
        'Oficina': orden.oficinaNombre || '',
        'Número Orden': orden.numero || '',
        'Estado': orden.estado || '',
        'Fecha Solicitud': this.formatearFecha(orden.fechaSolicitud),
        'Cliente': orden.clienteNombre || '',
        'Cédula/RUC': orden.clienteCedula || '',
        'Chasis': orden.chasis || '',
        'Artículo ID': orden.articuloId || '',
        'Artículo': orden.articuloDescripcion || '',
        'Clase': orden.articuloClase || '',
        'Grupo': orden.articuloGrupo || '',
        'Cantidad': orden.cantidad || 0,
        'Precio Unitario': orden.precioUnitario || 0,
        'Precio Total': orden.precioTotal || 0,
        'Motivo': orden.motivo || '',
        'Monto': orden.monto || 0,
        'Tasa IVA': orden.tasaIva || 0,
        'Total': orden.total || 0,
        'Usuario Creación': orden.usuarioCreacion || '',
        'Usuario Actualización': orden.usuarioActualizacion || ''
      }));

      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);

      const columnWidths = [
        { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 },
        { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 35 },
        { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
        { wch: 35 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 18 }
      ];
      ws['!cols'] = columnWidths;

      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Órdenes Detalle GRT');

      // Resumen (calculado sobre las OTs agrupadas para no duplicar totales)
      const resumen = [
        { Indicador: 'Total OTs', Valor: this.ordenesAgrupadas.length },
        { Indicador: 'Total Líneas de Artículo', Valor: this.ordenesFiltradas.length },
        { Indicador: 'Total Artículos', Valor: this.calcularTotalArticulos() },
        { Indicador: 'Total General', Valor: this.calcularTotalGeneral() },
        { Indicador: 'Promedio Días Abierto', Valor: this.calcularPromedioDias() },
        { Indicador: 'Fecha Exportación', Valor: new Date().toLocaleString('es-EC') }
      ];
      const wsResumen: XLSX.WorkSheet = XLSX.utils.json_to_sheet(resumen);
      wsResumen['!cols'] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `Ordenes_Garantia_Detalle_${fecha}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);

      console.log('Excel exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al exportar el archivo Excel. Por favor, intente nuevamente.');
    }
  }

  private calcularTotalArticulos(): number {
    return this.ordenesFiltradas.reduce((sum, orden) => sum + (orden.cantidad || 0), 0);
  }

  // ⭐️ [MODIFICADO] Suma por OT (no por línea), para no duplicar el total de órdenes con
  // varios artículos.
  private calcularTotalGeneral(): number {
    return this.ordenesAgrupadas.reduce((sum, orden) => sum + (orden.total || 0), 0);
  }

  // ⭐️ [MODIFICADO] Promedio por OT (no por línea)
  private calcularPromedioDias(): number {
    if (this.ordenesAgrupadas.length === 0) return 0;
    const totalDias = this.ordenesAgrupadas.reduce((sum, orden) => sum + (orden.diasAbierto || 0), 0);
    return Math.round(totalDias / this.ordenesAgrupadas.length);
  }

  imprimirReporte(): void {
    window.print();
  }
}