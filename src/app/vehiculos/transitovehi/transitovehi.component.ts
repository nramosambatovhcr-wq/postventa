import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import {
  VentasbdcService,
  TransitoItem,
  ApiResponseTransito
} from '../../services/ventasbdc.service';

// ============================================
// Interfaces de vista
// ============================================

interface OrdenGroupView {
  orden: string;
  contenedores: string;
  colapsado: boolean;
  filas: TransitoItem[];
  totalUnidades: number;
}

@Component({
  selector: 'app-transitovehi',
  templateUrl: './transitovehi.component.html',
  styleUrls: ['./transitovehi.component.css'],
  standalone: false
})
export class TransitovehiComponent implements OnInit, OnDestroy {

  // Datos
  items: TransitoItem[] = [];
  totalRegistrosApi = 0;
  totalCantidadApi = 0;

  // Estados
  loading = false;
  error: string | null = null;

  // Búsqueda
  searchTerm = '';
  appliedSearch = '';

  // Colapso de grupos
  private collapsedOrders = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(private ventasBdcService: VentasbdcService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // DATA LOADING
  // ============================================

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.ventasBdcService.getTransito()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ApiResponseTransito) => {
          if (res.success) {
            this.items = res.datos;
            this.totalRegistrosApi = res.totalRegistros;
            this.totalCantidadApi = res.totalCantidad;
          } else {
            this.items = [];
            this.totalRegistrosApi = 0;
            this.totalCantidadApi = 0;
            this.error = 'No se pudo obtener el tránsito desde el servidor';
          }
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar el tránsito: ' + (err?.message || err);
          this.loading = false;
          console.error('Error cargando tránsito:', err);
        }
      });
  }

  // ============================================
  // BÚSQUEDA (todas las columnas de texto)
  // ============================================

  get filteredItems(): TransitoItem[] {
    const term = this.appliedSearch.toLowerCase().trim();
    if (!term) return this.items;

    const keywords = term.split(/\s+/).filter(k => k);
    return this.items.filter(item => {
      const haystack = [
        item.orden || '',
        item.modelo || '',
        item.color || '',
        item.anio?.toString() || '',
        item.contenedores || '',
        this.formatFecha(item.fecha)
      ].join(' ').toLowerCase();
      return keywords.every(k => haystack.includes(k));
    });
  }

  applySearch(): void {
    this.appliedSearch = this.searchTerm;
  }

  resetSearch(): void {
    this.searchTerm = '';
    this.appliedSearch = '';
  }

  onSearchKeyup(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.applySearch();
    }
  }

  // ============================================
  // AGRUPACIÓN POR ORDEN (como la imagen)
  // ============================================

  get groupedOrders(): OrdenGroupView[] {
    const map = new Map<string, TransitoItem[]>();

    for (const item of this.filteredItems) {
      const key = item.orden || 'SIN ORDEN';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }

    const groups: OrdenGroupView[] = [];
    map.forEach((filas, orden) => {
      groups.push({
        orden,
        contenedores: filas.find(f => !!f.contenedores)?.contenedores || '',
        colapsado: this.collapsedOrders.has(orden),
        filas,
        totalUnidades: filas.reduce((sum, f) => sum + (f.cantidad || 0), 0)
      });
    });

    return groups.sort((a, b) => a.orden.localeCompare(b.orden));
  }

  toggleGroup(orden: string): void {
    if (this.collapsedOrders.has(orden)) {
      this.collapsedOrders.delete(orden);
    } else {
      this.collapsedOrders.add(orden);
    }
  }

  expandirTodo(): void {
    this.collapsedOrders.clear();
  }

  colapsarTodo(): void {
    this.groupedOrders.forEach(g => this.collapsedOrders.add(g.orden));
  }

  // ============================================
  // TOTALES / STATS
  // ============================================

  get totalFilas(): number {
    return this.filteredItems.length;
  }

  get totalUnidades(): number {
    return this.filteredItems.reduce((sum, i) => sum + (i.cantidad || 0), 0);
  }

  get totalOrdenes(): number {
    return this.groupedOrders.length;
  }

  get totalModelos(): number {
    return new Set(this.filteredItems.map(i => i.modelo)).size;
  }

  get hayFiltroActivo(): boolean {
    return !!this.appliedSearch.trim();
  }

  // ============================================
  // EXPORTAR EXCEL
  // ============================================

  exportarExcel(): void {
    const data: any[] = [];
    for (const group of this.groupedOrders) {
      for (const f of group.filas) {
        data.push({
          'Orden': f.orden,
          '# Contenedores': f.contenedores || '',
          'Modelo': f.modelo,
          'Cantidad': f.cantidad ?? '',
          'Color': f.color || '',
          'Año': f.anio ?? '',
          'Fecha': this.formatFecha(f.fecha)
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 24 }, { wch: 14 }, { wch: 34 }, { wch: 10 },
      { wch: 16 }, { wch: 8 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transito');

    const hoy = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `transito_vehiculos_${hoy}.xlsx`);
  }

  // ============================================
  // HELPERS
  // ============================================

  formatFecha(fecha: string | null): string {
    if (!fecha) return '';
    const d = new Date(fecha.length === 10 ? fecha + 'T00:00:00' : fecha);
    if (isNaN(d.getTime())) return fecha;
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByOrden(index: number, group: OrdenGroupView): string {
    return group.orden;
  }
}