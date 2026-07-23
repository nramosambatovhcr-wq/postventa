import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';

/* ── Rankings para los paneles interactivos ─────────────────── */
interface RankEstado {
  estado: string;
  registros: number;
  cantidad: number;
  porcentaje: number;
}
interface RankCodigo {
  codigo: string;
  descripcion: string;
  cantidad: number;
  veces: number;
  porcentaje: number;
}

@Component({
  selector: 'app-dashboardlab',
  templateUrl: './dashboardlab.component.html',
  styleUrls: ['./dashboardlab.component.css']
})
export class DashboardlabComponent implements OnInit, OnDestroy  {
  stats = {
    totalImportaciones: 7,
    enTransito: 24,
    pendientesLiquidacion: 18,
    tiempoPromedio: 28
  };

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  lista: any[] = [];
  allData: any[] = [];       // Todos los datos sin paginar
  datosBase: any[] = [];     // Resultado de fecha + búsqueda (antes se mezclaba en filteredData)
  filteredData: any[] = [];  // datosBase + selección de los paneles (lo que se pagina)
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;
  cantidades:number=0;
  private subscription = new Subscription();

  // Date filter variables
  startDate: string = '';
  endDate: string = '';
  paginaActual: string = '';

  // ── Paneles interactivos (clic para filtrar) ────────────────
  rankingEstados: RankEstado[] = [];
  rankingCodigos: RankCodigo[] = [];
  estadoSel: string = '';   // estado seleccionado
  codigoSel: string = '';   // código seleccionado
  topN: number = 25;        // cuántos artículos mostrar en "más pedidos"
  readonly topNOpciones: number[] = [10, 25, 50, 100];

  constructor(
    private router: Router,
    private tutorialService: PedidobodegaService,
    private reloadService: ReloadService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.paginaActual = 'pendiente';
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if(this.usuario != null){
        this.id = this.usuario.id;
        if(this.id==7){
          this.loadimportaciones();
        }
        else{
          this.loadimportaciones1();
        }
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadimportaciones();
      })
    );

    // Initialize date filters with current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.startDate = this.formatDateForInput(firstDayOfMonth);
    this.endDate = this.formatDateForInput(lastDayOfMonth);
  }

  selectedImageUrl: string = '';
  isModalOpen: boolean = false;

  openImageModal(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  closeImageModal(): void {
    this.isModalOpen = false;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  totalItems: number = 0;

  loadimportaciones() {
    this.loading = true;
    this.tutorialService.sugeridoslabbyuser(this.id).subscribe({
      next: (data: any) => {
        this.allData = data;
        this.aplicarFiltrosBase(); // fecha + búsqueda + selección de paneles + paginación + rankings
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  loadimportaciones1() {
    this.loading = true;
    this.tutorialService.sugeridoslabuser().subscribe({
      next: (data: any) => {
        this.allData = data;
        this.aplicarFiltrosBase();
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  // ── Filtros base: fecha + búsqueda → datosBase ──────────────
  private aplicarFiltrosBase(): void {
    let base = this.allData || [];

    // Filtro por fecha
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      base = base.filter(item => {
        const d = new Date(item.fecha_creacion);
        return d >= start && d <= end;
      });
    }

    // Filtro por búsqueda
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (term) {
      base = base.filter(item =>
        (item.codigo && String(item.codigo).toLowerCase().includes(term)) ||
        (item.descripcion && String(item.descripcion).toLowerCase().includes(term)) ||
        (item.observaciones && String(item.observaciones).toLowerCase().includes(term))
      );
    }

    this.datosBase = base;
    this.recomputarVista();
  }

  // ── Recalcula rankings, tabla (paginada) y total según la selección ──
  recomputarVista(): void {
    const base = this.datosBase || [];

    // Vista = base + selección de estado + selección de código
    let vista = base;
    if (this.estadoSel) {
      vista = vista.filter(i => this.normEstado(i.estado) === this.estadoSel);
    }
    if (this.codigoSel) {
      vista = vista.filter(i => String(i.codigo || '').trim() === this.codigoSel);
    }

    this.filteredData = vista;
    this.totalItems = vista.length;
    this.cantidades = this.totalItems;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage) || 1;
    this.currentPage = 1;
    this.updatePageData();

    // Ranking de estados: siempre sobre la base (para poder cambiar de estado)
    this.rankingEstados = this.calcRankingEstados(base);

    // Ranking de códigos: respeta el estado seleccionado
    const baseCod = this.estadoSel
      ? base.filter(i => this.normEstado(i.estado) === this.estadoSel)
      : base;
    this.rankingCodigos = this.calcRankingCodigos(baseCod);
  }

  private normEstado(estado: any): string {
    return (estado ?? '').toString().trim().toUpperCase() || 'SIN ESTADO';
  }

  private calcRankingEstados(data: any[]): RankEstado[] {
    const map = new Map<string, RankEstado>();
    for (const r of data) {
      const key = this.normEstado(r.estado);
      let row = map.get(key);
      if (!row) {
        row = { estado: key, registros: 0, cantidad: 0, porcentaje: 0 };
        map.set(key, row);
      }
      row.registros++;
      row.cantidad += Number(r.cantidad) || 0;
    }
    const arr = Array.from(map.values())
      .sort((a, b) => (b.registros - a.registros) || (b.cantidad - a.cantidad));
    const max = arr.length ? Math.max(...arr.map(x => x.registros)) : 0;
    arr.forEach(x => x.porcentaje = max ? Math.round((x.registros / max) * 100) : 0);
    return arr;
  }

  private calcRankingCodigos(data: any[]): RankCodigo[] {
    const map = new Map<string, RankCodigo>();
    for (const r of data) {
      const key = String(r.codigo || '').trim();
      if (!key) continue;
      let row = map.get(key);
      if (!row) {
        row = { codigo: key, descripcion: r.descripcion || '', cantidad: 0, veces: 0, porcentaje: 0 };
        map.set(key, row);
      }
      row.cantidad += Number(r.cantidad) || 0;
      row.veces++;
      if (!row.descripcion && r.descripcion) row.descripcion = r.descripcion;
    }
    const arr = Array.from(map.values())
      .sort((a, b) => (b.cantidad - a.cantidad) || (b.veces - a.veces));
    const top = arr.slice(0, this.topN);
    const max = top.length ? Math.max(...top.map(x => x.cantidad)) : 0;
    top.forEach(x => x.porcentaje = max ? Math.round((x.cantidad / max) * 100) : 0);
    return top;
  }

  // ── Clics en los paneles ────────────────────────────────────
  seleccionarEstado(estado: string): void {
    const key = this.normEstado(estado);
    this.estadoSel = (this.estadoSel === key) ? '' : key; // toggle
    this.codigoSel = '';                                   // reinicia código al cambiar estado
    this.recomputarVista();
  }

  seleccionarCodigo(codigo: string): void {
    const key = String(codigo || '').trim();
    this.codigoSel = (this.codigoSel === key) ? '' : key; // toggle
    this.recomputarVista();
  }

  limpiarSeleccion(): void {
    this.estadoSel = '';
    this.codigoSel = '';
    this.recomputarVista();
  }

  get haySeleccion(): boolean {
    return !!(this.estadoSel || this.codigoSel);
  }

  actualizarEstado(item: any): void {
    const pedidoActualizado = {
      id_pedido: parseInt(item.id_pedido) || 0,
      Cantidad: parseInt(item.cantidad) || 0,
      Codigo: String(item.codigo || ""),
      Descripcion: String(item.descripcion || ""),
      Observaciones: String(item.observaciones || ""),
      Estado: String(item.estado || ""),
      IdUsuarioCreacion: parseInt(item.idUsuarioCreacion) || 0,
      IdUsuarioModificacion: parseInt(item.idUsuarioModificacion) || 0,
      Modelo: String(item.modelo || ""),
      Cliente: String(item.cliente || ""),
      Ot: String(item.ot || "")
    };

    this.tutorialService.actualizarEstadoPedido(item.id_pedido, pedidoActualizado).subscribe({
      next: () => {
        const toast = document.createElement('div');
        toast.innerText = "Sugerido actualizado exitosamente";
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.backgroundColor = '#4CAF50';
        toast.style.color = 'white';
        toast.style.padding = '15px 20px';
        toast.style.borderRadius = '4px';
        toast.style.zIndex = '9999';
        toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        document.body.appendChild(toast);
        setTimeout(() => { document.body.removeChild(toast); }, 3000);
        this.loadimportaciones();
      },
      error: (err) => {
        const toast = document.createElement('div');
        toast.innerText = `Error al actualizar sugerido: ${err.error?.message || 'Error desconocido'}`;
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.backgroundColor = '#F44336';
        toast.style.color = 'white';
        toast.style.padding = '15px 20px';
        toast.style.borderRadius = '4px';
        toast.style.zIndex = '9999';
        toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        document.body.appendChild(toast);
        setTimeout(() => { document.body.removeChild(toast); }, 3000);
        console.error("Error al actualizar estado", err);
      }
    });
  }

  getImageUrl(relativePath: string): string {
    const formattedPath = relativePath.replace(/\\/g, '/');
    return `https://bodega.vehicentro.com:1830/api/api/${formattedPath}`;
  }

  updatePageData() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.lista = this.filteredData.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePageData();
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Date filter methods → ahora todos pasan por aplicarFiltrosBase()
  applyDateFilter() {
    this.aplicarFiltrosBase();
  }

  resetDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.aplicarFiltrosBase();
  }

  searchImports(): void {
    this.aplicarFiltrosBase();
  }

  filterData(): void {
    console.log('Filtrar datos');
  }

  pendiente(){
    this.paginaActual = 'pendiente';
    this.router.navigate(['/dashboardsugelab']);
  }
  revisado(){
    this.paginaActual = 'revisados';
    this.router.navigate(['/sugeridoslabrev']);
  }
  resetearEstado() {
    this.paginaActual = '';
  }

  esTarjetaActiva(tipo: string): boolean {
    return this.paginaActual === tipo;
  }
  individual(){
    this.paginaActual = 'crear';
    this.router.navigate(['/sugelabcrear']);
  }
  sugerido(){
    this.router.navigate(['/pedidosbodinser']);
  }
  excel(){
    this.paginaActual = 'excel';
    this.router.navigate(['/sugelabexcel']);
  }

  showExportMenu: boolean = false;

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  getPaginationArray(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      const pages: number[] = [];
      pages.push(1);
      if (currentPage > 3) {
        pages.push(-1);
      }
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push(-1);
      }
      if (totalPages > 1) {
        pages.push(totalPages);
      }
      return pages;
    }
  }

  downloadExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredData);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sugeridos');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `LaboratorioRepo_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  downloadCSV(): void {
    let csvContent = 'Codigo,Descripcion,Cantidad,Observacion,Fecha,Estado\n';
    this.filteredData.forEach(item => {
      const row = [
        item.codigo,
        item.descripcion,
        item.cantidad,
        item.observaciones || '-',
        item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString() : '-',
        item.estado || '-'
      ].join(',');
      csvContent += row + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `LaboratorioRepo_${new Date().toISOString().split('T')[0]}.csv`);
  }
}