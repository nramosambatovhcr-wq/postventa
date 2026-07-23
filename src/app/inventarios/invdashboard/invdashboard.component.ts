import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { InventarioService } from 'src/app/services/inventario.service';
import { forkJoin } from 'rxjs';

const SVG = {
  home:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  boxes:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="m17 16.5-5-3"/><path d="m17 16.5 4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/><path d="M12 8 7.26 5.15"/><path d="m12 8 4.74-2.85"/><path d="M12 13.5V8"/></svg>`,
  check:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  redo:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
  warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  trophy:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>`,
  bullhorn:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  building:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
  users:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  sync:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  chart:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  poll:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`,
  pie:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
};

interface Agencia {
  idSerial: number;
  idAgencia: string;
  nombre: string;
  codigo: string;
  codigoAgencia: string;
}

interface EstadoConteo {
  totalRepuestos: number;
  contados: number;
  pendientes: number;
  conDiferencias: number;
  porcentaje: number;
}

@Component({
  selector: 'app-invdashboard',
  templateUrl: './invdashboard.component.html',
  styleUrls: ['./invdashboard.component.css']
})
export class InvdashboardComponent implements OnInit {

  menuAbierto: boolean = true;
  moduloActivo: string = 'inicio';
  usuario: any = null;
  userMenuAbierto: boolean = false;
  submoduloExpandido: string | null = null;

  // ── Agencias y conteo ──────────────────────────
  agencias: Agencia[] = [];
  agenciaSeleccionada: string = '';
  estadoConteo: EstadoConteo | null = null;
  cargandoConteo: boolean = false;
  errorConteo: string = '';
  private readonly CAMPANA_ID = 3;

  // ── Tabla inline de conteos ────────────────────
  conteosAgencia: any[] = [];
  errorTablaConteos: string = '';
  eliminandoId: number | null = null;
  confirmEliminar: any | null = null;
  filtroEstado: string = '';
  busqueda: string = '';

  // ── Getter: conteos filtrados por estado y búsqueda ───────
  get conteosFiltered(): any[] {
    let lista = this.conteosAgencia;

    if (this.filtroEstado) {
      lista = lista.filter(c => c.estado_inventario === this.filtroEstado);
    }

    const q = this.busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter(c =>
        (c.codigo_interno_agencia || '').toLowerCase().includes(q) ||
        (c.nombre_articulo        || '').toLowerCase().includes(q)
      );
    }

    return lista;
  }

  menuItems = [
    {
      id: 'inicio',
      titulo: 'Inicio',
      icono: SVG.home,
      ruta: '/invdash/inicio'
    },
    {
      id: 'inventarios',
      titulo: 'Inventarios',
      icono: SVG.boxes,
      submodulos: [
        { id: 'conteos',         titulo: 'Conteos',         ruta: '/invdash/conteos',         icono: SVG.check   },
        { id: 'reconteos',       titulo: 'Reconteos',       ruta: '/invdash/reconteos',       icono: SVG.redo    },
        { id: 'inconsistencias', titulo: 'Inconsistencias', ruta: '/invdash/inconsistencias', icono: SVG.warning },
        { id: 'ranking',         titulo: 'Ranking',         ruta: '/invdash/ranking',         icono: SVG.trophy  }
      ]
    },
    {
      id: 'campanas',
      titulo: 'Campañas',
      icono: SVG.bullhorn,
      ruta: '/invdash/campanas'
    },
    {
      id: 'agencias',
      titulo: 'Agencias',
      icono: SVG.building,
      ruta: '/invdash/agencias'
    },
    {
      id: 'usuarios',
      titulo: 'Usuarios',
      icono: SVG.users,
      ruta: '/invdash/invusuario'
    },
    {
      id: 'sincronizacion',
      titulo: 'Sincronización',
      icono: SVG.sync,
      ruta: '/invdash/sincronizacion'
    },
    {
      id: 'reportes',
      titulo: 'Reportes',
      icono: SVG.chart,
      submodulos: [
        { id: 'resultados',   titulo: 'Resultados',   ruta: '/invdash/reportes/resultados',   icono: SVG.poll },
        { id: 'estadisticas', titulo: 'Estadísticas', ruta: '/invdash/reportes/estadisticas', icono: SVG.pie  }
      ]
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private inventarioService: InventarioService
  ) {}

  ngOnInit() {
    this.usuario = this.authService.getUsuarioActual();
    this.detectarModuloActivo();
    this.cargarAgencias();
  }

  // ── Agencias ───────────────────────────────────
  cargarAgencias() {
    this.inventarioService.getAgencias().subscribe({
      next: (data: any) => {
        this.agencias = Array.isArray(data) ? data : Object.values(data);
      },
      error: () => console.error('Error al cargar agencias')
    });
  }

  onAgenciaChange() {
    this.estadoConteo      = null;
    this.errorConteo       = '';
    this.conteosAgencia    = [];
    this.errorTablaConteos = '';
    this.filtroEstado      = '';
    this.busqueda          = '';
    this.confirmEliminar   = null;
    this.eliminandoId      = null;
    if (this.agenciaSeleccionada) {
      this.cargarTodo();
    }
  }

  formatearPorcentaje(): string {
    if (!this.estadoConteo) return '0';
    const p = this.estadoConteo.porcentaje;
    if (p === 0) return '0';
    if (p < 1)   return p.toFixed(2);
    if (p < 10)  return p.toFixed(1);
    return Math.round(p).toString();
  }

  getColorPorcentaje(): string {
    if (!this.estadoConteo) return '#dc2626';
    const p = this.estadoConteo.porcentaje;
    if (p >= 100) return '#059669';
    if (p >= 60)  return '#2563eb';
    if (p >= 30)  return '#d97706';
    if (p > 0)    return '#f59e0b';
    return '#dc2626';
  }

  /**
   * Un solo forkJoin alimenta el resumen de progreso Y la tabla inline
   * al mismo tiempo — sin petición extra al servidor.
   */
  cargarTodo() {
    const agencia = this.agencias.find(a => a.codigoAgencia === this.agenciaSeleccionada);
    if (!agencia) return;

    const bodegaId  = agencia.codigoAgencia;
    const agenciaId = agencia.idAgencia;

    this.cargandoConteo    = true;
    this.errorConteo       = '';
    this.errorTablaConteos = '';

    forkJoin({
      inventario: this.inventarioService.getRepuestosByBodega(bodegaId),
      conteos:    this.inventarioService.getsUnificadosPorAgenciaAll(Number(agenciaId), this.CAMPANA_ID)
    }).subscribe({
      next: ({ inventario, conteos }) => {
        // ── Tabla inline: carga directa ──────────
        this.conteosAgencia = conteos.datos || [];

        // ── Resumen de progreso ──────────────────
        const repuestos = (inventario.repuestos || [])
          .filter((r: any) => (r.stock_disponible || 0) > 0);

        const conteosMap = new Map<string, any>();
        (conteos.datos || []).forEach((c: any) => {
          if (c.codigo_interno_agencia) {
            conteosMap.set(c.codigo_interno_agencia.trim().toUpperCase(), c);
          }
        });

        let contados = 0, conDiferencias = 0;
        repuestos.forEach((rep: any) => {
          const clave    = (rep.articulo || '').trim().toUpperCase();
          const c        = conteosMap.get(clave);
          const cantidad = c?.cantidad_contada ?? c?.cantidad_total ?? 0;
          const contado  = c?.fue_contado === true || cantidad > 0;
          if (c && contado) {
            cantidad - (rep.stock_disponible || 0) === 0 ? contados++ : conDiferencias++;
          }
        });

        const total      = repuestos.length;
        const pendientes = total - contados - conDiferencias;
        const porcentaje = total > 0
          ? ((contados + conDiferencias) / total) * 100
          : 0;

        this.estadoConteo   = { totalRepuestos: total, contados, pendientes, conDiferencias, porcentaje };
        this.cargandoConteo = false;
      },
      error: () => {
        this.errorConteo       = 'No se pudo cargar el estado del conteo';
        this.errorTablaConteos = 'No se pudieron cargar los conteos';
        this.cargandoConteo    = false;
      }
    });
  }

  /** Alias para compatibilidad con cualquier llamada existente */
  cargarEstadoConteo() { this.cargarTodo(); }

  // ── Tabla inline: helpers ──────────────────────

  /** Cuenta registros por estado (chips de filtro) */
  countByEstado(estado: string): number {
    return this.conteosAgencia.filter(c => c.estado_inventario === estado).length;
  }

  /** Clase CSS del badge según estado */
  getBadgeClass(estado: string): string {
    switch (estado) {
      case 'EXACTO':           return 'badge-exacto';
      case 'FALTANTE':         return 'badge-faltante';
      case 'SOBRANTE':         return 'badge-sobrante';
      case 'FUERA_INVENTARIO': return 'badge-fuera';
      default:                 return 'badge-nd';
    }
  }

  /** Pide confirmación inline para el item dado */
  pedirConfirmacion(item: any) {
    this.confirmEliminar = item;
  }

  /** Cancela la confirmación sin eliminar */
  cancelarEliminar() {
    this.confirmEliminar = null;
  }

  /** Ejecuta la eliminación del conteo confirmado */
  confirmarEliminar() {
    if (!this.confirmEliminar) return;
    const item = this.confirmEliminar;
    this.confirmEliminar = null;

    const ids: number[] = item.ids_conteos_originales || [];
    if (!ids.length) return;

    this.eliminandoId = ids[0];

    this.inventarioService.eliminarConteo(ids[0]).subscribe({
      next: () => {
        this.conteosAgencia = this.conteosAgencia.filter(c => c !== item);
        this.eliminandoId   = null;
        // Recalcula el resumen en memoria sin nueva petición
        this.recalcularProgreso();
      },
      error: () => {
        this.eliminandoId = null;
      }
    });
  }

  /** Recalcula el progreso usando los datos ya en memoria (sin petición extra). */
  private recalcularProgreso() {
    if (!this.estadoConteo) return;
    const exactos    = this.conteosAgencia.filter(c => c.estado_inventario === 'EXACTO').length;
    const conDiffs   = this.conteosAgencia.filter(c => c.fue_contado && c.estado_inventario !== 'EXACTO').length;
    const total      = this.estadoConteo.totalRepuestos;
    const pendientes = total - exactos - conDiffs;
    const porcentaje = total > 0 ? ((exactos + conDiffs) / total) * 100 : 0;
    this.estadoConteo = { ...this.estadoConteo, contados: exactos, conDiferencias: conDiffs, pendientes, porcentaje };
  }

  // ── Menú ───────────────────────────────────────
  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

  toggleUserMenu() {
    this.userMenuAbierto = !this.userMenuAbierto;
  }

  onRootClick(event: Event) {
    this.userMenuAbierto = false;
  }

  toggleSubmodulo(moduloId: string) {
    this.submoduloExpandido = this.submoduloExpandido === moduloId ? null : moduloId;
  }

  navegar(ruta: string, moduloId: string) {
    this.moduloActivo = moduloId;
    this.router.navigate([ruta]);
  }

  detectarModuloActivo() {
    this.router.events.subscribe(() => {
      const url = this.router.url;
      for (const item of this.menuItems) {
        if (item.submodulos) {
          for (const sub of item.submodulos) {
            if (url.includes(sub.id)) {
              this.moduloActivo       = sub.id;
              this.submoduloExpandido = item.id;
              return;
            }
          }
        } else if (item.ruta && url.includes(item.id)) {
          this.moduloActivo = item.id;
          return;
        }
      }
    });

    // Detección inicial
    const url = this.router.url;
    for (const item of this.menuItems) {
      if (item.submodulos) {
        for (const sub of item.submodulos) {
          if (url.includes(sub.id)) {
            this.moduloActivo       = sub.id;
            this.submoduloExpandido = item.id;
            return;
          }
        }
      } else if (item.ruta && url.includes(item.id)) {
        this.moduloActivo = item.id;
        return;
      }
    }
  }

  cerrarSesion() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  esModuloActivo(id: string): boolean {
    return this.moduloActivo === id;
  }

  getTituloPagina(): string {
    const item = this.menuItems.find(i => i.id === this.moduloActivo);
    if (item) return item.titulo;
    for (const menuItem of this.menuItems) {
      if (menuItem.submodulos) {
        const sub = menuItem.submodulos.find(s => s.id === this.moduloActivo);
        if (sub) return sub.titulo;
      }
    }
    return 'Inicio';
  }

  getInitials(): string {
    if (!this.usuario?.nombre) return 'U';
    const parts = this.usuario.nombre.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }

  // ── Helper color barra ─────────────────────────
  getColorBarra(): string {
    if (!this.estadoConteo) return '#3b82f6';
    const p = this.estadoConteo.porcentaje;
    if (p === 100) return 'linear-gradient(90deg,#10b981,#059669)';
    if (p >= 60)   return 'linear-gradient(90deg,#3b82f6,#6366f1)';
    if (p >= 30)   return 'linear-gradient(90deg,#f59e0b,#f97316)';
    return           'linear-gradient(90deg,#ef4444,#dc2626)';
  }
}