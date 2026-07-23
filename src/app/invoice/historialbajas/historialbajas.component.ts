import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';
import {
  CotizacionService,
  BajaHistorial
} from 'src/app/services/cotizacion.service';

@Component({
  selector: 'app-historialbajas',
  templateUrl: './historialbajas.component.html',
  styleUrls: ['./historialbajas.component.css']
})
export class HistorialbajasComponent implements OnInit, OnDestroy {

  // Datos
  allData: BajaHistorial[] = [];
  filteredData: BajaHistorial[] = [];
  lista: BajaHistorial[] = [];

  // Estado
  usuario: Usuario | null = null;
  id: number = 0;
  loading = false;
  private subscription = new Subscription();

  // Filtros
  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';

  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 0;
  totalItems: number = 0;

  // Totales
  totalBajas: number = 0;
  totalCantidad: number = 0;
  totalValorFob: number = 0;

  // Modal revertir
  isRevertModalOpen: boolean = false;
  bajaParaRevertir: BajaHistorial | null = null;
  revertLoading: boolean = false;
  revertError: string = '';

  constructor(
    private router: Router,
    private cotizacionService: CotizacionService,
    private authService: AuthService,
    private reloadService: ReloadService
  ) { }

  ngOnInit(): void {
    this.usuario = this.authService.getUsuarioActual();
    this.subscription.add(
      this.authService.usuarioActual$.subscribe(usuario => {
        this.usuario = usuario;
        if (this.usuario != null) {
          this.id = this.usuario.id;
          this.cargarBajas();
        }
      })
    );

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => this.cargarBajas())
    );

    const now = new Date();
    this.startDate = this.formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 1));
    this.endDate   = this.formatDateForInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // ─── Carga ──────────────────────────────────────────────────────────────────
  cargarBajas(): void {
    if (!this.usuario) return;
    this.loading = true;

    this.cotizacionService.getBajasPorUsuario(this.usuario.id).subscribe({
      next: (data) => {
        this.allData = data || [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.allData = [];
        this.applyFilters();
      }
    });
  }

  // ─── Filtros ──────────────────────────────────────────────────────────────
  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    const desde = this.startDate ? new Date(this.startDate + 'T00:00:00') : null;
    const hasta = this.endDate ? new Date(this.endDate + 'T23:59:59') : null;

    this.filteredData = this.allData.filter(b => {
      const matchTexto = !term ||
        (b.codigo && b.codigo.toLowerCase().includes(term)) ||
        (b.descripcion && b.descripcion.toLowerCase().includes(term)) ||
        (b.invoicen && b.invoicen.toLowerCase().includes(term)) ||
        (b.proveedor && b.proveedor.toLowerCase().includes(term)) ||
        (b.motivo && b.motivo.toLowerCase().includes(term)) ||
        String(b.ordenId).includes(term);

      let matchFecha = true;
      if (desde || hasta) {
        const f = new Date(b.fechaBaja);
        if (desde && f < desde) matchFecha = false;
        if (hasta && f > hasta) matchFecha = false;
      }

      return matchTexto && matchFecha;
    });

    this.calcularTotales();
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage) || 1;
    this.currentPage = 1;
    this.updatePageData();
  }

  calcularTotales(): void {
    this.totalBajas = this.filteredData.length;
    this.totalCantidad = this.filteredData.reduce((acc, b) => acc + (b.cantidadBaja || 0), 0);
    this.totalValorFob = this.filteredData.reduce((acc, b) => acc + (b.valorFobBaja || 0), 0);
  }

  onSearchChange(): void { this.applyFilters(); }
  onDateChange(): void { this.applyFilters(); }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.applyFilters();
  }

  // ─── Paginación ───────────────────────────────────────────────────────────
  updatePageData(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.lista = this.filteredData.slice(start, start + this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePageData();
  }

  getPaginationArray(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push(-1);
    if (total > 1) pages.push(total);
    return pages;
  }

  // ─── Revertir baja ─────────────────────────────────────────────────────────
  abrirRevertModal(baja: BajaHistorial): void {
    this.bajaParaRevertir = baja;
    this.revertError = '';
    this.isRevertModalOpen = true;
  }

  cerrarRevertModal(): void {
    this.isRevertModalOpen = false;
    this.bajaParaRevertir = null;
    this.revertError = '';
  }

  confirmarRevertir(): void {
    if (!this.bajaParaRevertir) return;
    this.revertLoading = true;
    this.revertError = '';

    this.cotizacionService.revertirBaja(this.bajaParaRevertir.bajaId).subscribe({
      next: (res) => {
        this.revertLoading = false;
        this.cerrarRevertModal();
        // Quitar la fila localmente
        this.allData = this.allData.filter(b => b.bajaId !== res.bajaId);
        this.applyFilters();
        alert(res.mensaje || 'Baja revertida correctamente.');
      },
      error: (err) => {
        this.revertLoading = false;
        this.revertError = err.message || 'Error al revertir la baja.';
      }
    });
  }

  // ─── Exportación ───────────────────────────────────────────────────────────
  downloadExcel(): void {
    const dataToExport = this.filteredData.map(b => ({
      BajaID: b.bajaId,
      Orden: b.ordenId,
      Invoice: b.invoicen,
      Proveedor: b.proveedor,
      Codigo: b.codigo,
      Descripcion: b.descripcion,
      CantidadAnterior: b.cantidadAnterior,
      CantidadBaja: b.cantidadBaja,
      CantidadRestante: b.cantidadRestante,
      FOB_Unitario: b.fobUnitario,
      Valor_FOB_Baja: b.valorFobBaja,
      Motivo: b.motivo,
      Usuario: b.usuario,
      Fecha: this.formatFecha(b.fechaBaja)
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bajas');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Historial_Bajas_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  downloadCSV(): void {
    let csv = 'BajaID,Orden,Invoice,Proveedor,Codigo,Descripcion,CantAnterior,CantBaja,CantRestante,FOBUnitario,ValorFOBBaja,Motivo,Usuario,Fecha\n';
    this.filteredData.forEach(b => {
      const row = [
        b.bajaId, b.ordenId, b.invoicen, b.proveedor, b.codigo, b.descripcion,
        b.cantidadAnterior, b.cantidadBaja, b.cantidadRestante,
        b.fobUnitario, b.valorFobBaja, b.motivo, b.usuario, this.formatFecha(b.fechaBaja)
      ].map(e => `"${e ?? ''}"`).join(',');
      csv += row + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Historial_Bajas_${new Date().toISOString().split('T')[0]}.csv`);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  formatDateForInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    const f = new Date(fecha);
    return f.toLocaleString('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  esBajaTotal(b: BajaHistorial): boolean {
    return b.cantidadRestante === 0;
  }

  irAOrden(ordenId: number): void {
    this.router.navigate(['/dashboardrev', ordenId]);
  }
}