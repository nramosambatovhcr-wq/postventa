import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Usuario } from 'src/app/models/usuario';
import { PendienteAsignacion, AbastecimientoService } from 'src/app/services/abastecimiento.service';
import { AuthService } from 'src/app/services/auth.service';
import * as XLSX from 'xlsx';

// ── Interfaz para badge unificado ──────────────────────────
interface BadgeInfo {
  clase: string;
  label: string;
}

@Component({
  selector: 'app-transito',
  templateUrl: './transito.component.html',
  styleUrls: ['./transito.component.css']
})
export class TransitoComponent implements OnInit, OnDestroy {

  // ── Estado general ─────────────────────────────────────────
  pendientes: PendienteAsignacion[] = [];
  filtradas:  PendienteAsignacion[] = [];
  cargando    = false;
  error       = '';

  // ── Filtros ────────────────────────────────────────────────
  filtroBusqueda  = '';
  filtroProveedor = '';
  filtroEstado: 'todos' | 'en_transito' | 'sin_transito' = 'todos';

  // ── MEJORA 2: Propiedad en lugar de getter (evita recálculo en cada change detection) ──
  proveedores: string[] = [];

  // ── MEJORA 3: Totales como propiedades en lugar de getters ─
  totalPendiente = 0;
  totalTransito  = 0;
  totalItems     = 0;

  id: number = 0;
  usuario: Usuario | null = null;

  // ── MEJORA 1: Subject para desuscripción segura ────────────
  private destroy$ = new Subject<void>();

  constructor(private abastecimientoService: AbastecimientoService, private authService: AuthService) {}

  ngOnInit(): void {

      this.usuario = this.authService.getUsuarioActual();
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        if(this.usuario.rol=='admin'){
         this.cargarPendientes();
        }
        else{
          this.id = this.usuario.id;
          console.log(this.id);
          this.cargarPendientesid(this.id);
        }
      }
    });

    
  }

  // ── MEJORA 1: Implementar OnDestroy para evitar memory leaks ──
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Carga de datos ─────────────────────────────────────────
  cargarPendientes(): void {
    this.cargando = true;
    this.error    = '';

    this.abastecimientoService.getPendientesAsignacion()
      .pipe(takeUntil(this.destroy$))   // MEJORA 1: evita memory leak al navegar
      .subscribe({
        next: datos => {
          this.pendientes  = datos;
          // MEJORA 2: calcular proveedores solo cuando llegan datos nuevos
          this.proveedores = [...new Set(datos.map(p => p.proveedor))].sort();
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: err => {
          this.error    = 'No se pudo cargar la información. Intente nuevamente.';
          this.cargando = false;
          console.error('TransitoComponent error:', err);
        }
      });
  }

  cargarPendientesid(idUsuario:number): void {
    this.cargando = true;
    this.error    = '';

    this.abastecimientoService.getPendientesAsignacionByUsuario(idUsuario)
      .pipe(takeUntil(this.destroy$))   // MEJORA 1: evita memory leak al navegar
      .subscribe({
        next: datos => {
          this.pendientes  = datos;
          // MEJORA 2: calcular proveedores solo cuando llegan datos nuevos
          this.proveedores = [...new Set(datos.map(p => p.proveedor))].sort();
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: err => {
          this.error    = 'No se pudo cargar la información. Intente nuevamente.';
          this.cargando = false;
          console.error('TransitoComponent error:', err);
        }
      });
  }

  // ── Filtrado reactivo ──────────────────────────────────────
  aplicarFiltros(): void {
    const busq = this.filtroBusqueda.toLowerCase().trim();

    this.filtradas = this.pendientes.filter(p => {
      const coincideTexto = !busq || [
        p.orden, p.codigo, p.descripcion, p.cotizacion
      ].some(c => c?.toLowerCase().includes(busq));

      const coincideProveedor = !this.filtroProveedor || p.proveedor === this.filtroProveedor;

      const tieneTransito = p.bls_en_transito !== '—' && p.bls_en_transito !== '';
      const coincideEstado =
        this.filtroEstado === 'todos'       ? true :
        this.filtroEstado === 'en_transito' ? tieneTransito :
                                              !tieneTransito;

      return coincideTexto && coincideProveedor && coincideEstado;
    });

    // MEJORA 3: calcular totales una sola vez después de filtrar
    this.totalPendiente = this.filtradas.reduce((s, p) => s + p.cantidad_activa, 0);
    this.totalTransito  = this.filtradas.reduce((s, p) => s + p.cantidad_transito, 0);
    this.totalItems     = this.filtradas.length;
  }

  limpiarFiltros(): void {
    this.filtroBusqueda  = '';
    this.filtroProveedor = '';
    this.filtroEstado    = 'todos';
    this.aplicarFiltros();
  }

  // ── Descarga Excel ─────────────────────────────────────────
  descargarExcel(): void {
    const datos = this.filtradas.map(p => ({
      'ORDEN':                 p.orden,
      'COTIZACION':            p.cotizacion,
      'INVOICE CON ANTICIPO':  p.invoice_con_anticipo,
      'PROVEEDOR':             p.proveedor,
      'DATE INVOICE':          p.date_invoice,
      'DIAS PASADOS':          p.dias_pasados,
      'CODIGO':                p.codigo,
      'DESCRIPCION':           p.descripcion,
      'SOLICITADO':            p.solicitado,
      'ENVIADO':               p.enviado,
      'PENDIENTE':             p.cantidad_activa,
      'EN TRANSITO':           p.cantidad_transito,
      'BLS EN TRÁNSITO':       p.bls_en_transito,
      'INVOICE POR ARRIBAR':   p.invoicebl_por_arribar,
      'BLS ARRIBADOS':         p.bls_arribados,
    }));

    const ws   = XLSX.utils.json_to_sheet(datos);
    const wb   = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tránsito');

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `transito_sntca_${fecha}.xlsx`);
  }

  // ── MEJORA 4: getBadge unificado (evita doble cómputo por fila) ──
  getBadge(item: PendienteAsignacion): BadgeInfo {
    if (item.bls_en_transito !== '—' && item.bls_en_transito !== '')
      return { clase: 'badge-transito', label: 'En tránsito' };
    if (item.cantidad_activa > 0)
      return { clase: 'badge-pendiente', label: 'Pendiente' };
    return { clase: 'badge-ok', label: 'Completo' };
  }

  getDiasClass(dias: number): string {
    if (dias > 90) return 'dias-critico';
    if (dias > 45) return 'dias-alerta';
    return 'dias-ok';
  }

  // ── MEJORA 5: trackBy para evitar re-render innecesario de filas ──
  trackByOrdenCodigo(index: number, item: PendienteAsignacion): string {
    return item.orden + '_' + item.codigo;
  }
}