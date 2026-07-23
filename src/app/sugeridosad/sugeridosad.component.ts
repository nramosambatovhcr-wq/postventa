import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import saveAs from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../models/usuario';
import { AuthService } from '../services/auth.service';
import { PedidobodegaService } from '../services/pedidobodega.service';
import { ReloadService } from '../services/reload.service';
import * as XLSX from 'xlsx';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

/* ── Rankings para los paneles interactivos ─────────────────── */
interface RankUsuario {
  usuario: string;
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
  selector: 'app-sugeridosad',
  templateUrl: './sugeridosad.component.html',
  styleUrls: ['./sugeridosad.component.css']
})
export class SugeridosadComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('userChart') userChartRef!: ElementRef<HTMLCanvasElement>;

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
  allData: any[] = [];       // Todos los datos sin paginar (crudo del servicio)
  allData1: any[] = [];      // Base filtrada por rol/modelo
  datosBase: any[] = [];     // allData1 + fecha + búsqueda (base para gráfico y rankings)
  filteredData: any[] = [];  // datosBase + selección de paneles (lo que se pagina)
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;
  usrol = '';

  // Chart variables
  userChart: Chart | null = null;
  showChart: boolean = true;
  userStats: { [key: string]: number } = {};

  private subscription = new Subscription();

  // Date filter variables
  startDate: string = '';
  endDate: string = '';

  // ── Paneles interactivos (clic para filtrar) ────────────────
  rankingUsuarios: RankUsuario[] = [];
  rankingCodigos: RankCodigo[] = [];
  usuarioSel: string = '';  // usuario seleccionado (nombre apellido)
  codigoSel: string = '';   // código seleccionado
  topN: number = 25;
  readonly topNOpciones: number[] = [10, 25, 50, 100];

  constructor(
    private router: Router,
    private tutorialService: PedidobodegaService,
    private reloadService: ReloadService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if(this.usuario != null){
        this.id = this.usuario.id;
        this.usrol = this.usuario.rol;
        this.loadimportaciones();
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

  ngAfterViewInit(): void {
    // Chart will be initialized after data is loaded
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
    if (this.userChart) {
      this.userChart.destroy();
    }
  }

  totalItems: number = 0;

  loadimportaciones() {
    this.loading = true;
    this.tutorialService.sugeridos().subscribe({
      next: (data: any) => {
        this.allData = data;

        // Base según rol/modelo
        let roleBase: any[];
        if (this.usrol == 'repuestoslv') {
          roleBase = this.allData.filter(item => item && item.modelo === 'sl');
        } else if (this.usrol == 'repuestoslk') {
          roleBase = this.allData.filter(item => item && item.modelo === 'lc');
        } else if (this.usrol == 'repuestoslsc') {
          roleBase = this.allData.filter(item => item && item.modelo === 'sw');
        } else if (this.usrol == 'repuestos') {
          roleBase = this.allData.filter(item => item && item.modelo === 'sp');
        } else {
          roleBase = this.allData;
        }
        this.allData1 = roleBase;

        // fecha + búsqueda + selección de paneles + paginación + stats + gráfico
        this.aplicarFiltrosBase();

        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  // ── Filtros base: rol → fecha → búsqueda ⇒ datosBase ─────────
  private aplicarFiltrosBase(): void {
    let base = this.allData1 || [];

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

    // El gráfico y los rankings se basan en datosBase (no en la selección de paneles)
    this.calculateUserStats();
    this.recomputarVista();

    if (this.showChart) {
      setTimeout(() => { this.initializeChart(); }, 100);
    }
  }

  // ── Recalcula rankings, tabla (paginada) y total según la selección ──
  recomputarVista(): void {
    const base = this.datosBase || [];

    let vista = base;
    if (this.usuarioSel) {
      vista = vista.filter(i => this.nombreUsuario(i) === this.usuarioSel);
    }
    if (this.codigoSel) {
      vista = vista.filter(i => String(i.codigo || '').trim() === this.codigoSel);
    }

    this.filteredData = vista;
    this.totalItems = vista.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage) || 1;
    this.currentPage = 1;
    this.updatePageData();

    // Ranking de usuarios: siempre sobre la base (para poder cambiar de usuario)
    this.rankingUsuarios = this.calcRankingUsuarios(base);

    // Ranking de códigos: respeta el usuario seleccionado
    const baseCod = this.usuarioSel
      ? base.filter(i => this.nombreUsuario(i) === this.usuarioSel)
      : base;
    this.rankingCodigos = this.calcRankingCodigos(baseCod);
  }

  private nombreUsuario(item: any): string {
    return `${item?.nombre ?? ''} ${item?.apellido ?? ''}`.trim() || 'SIN USUARIO';
  }

  private calcRankingUsuarios(data: any[]): RankUsuario[] {
    const map = new Map<string, RankUsuario>();
    for (const r of data) {
      const key = this.nombreUsuario(r);
      let row = map.get(key);
      if (!row) {
        row = { usuario: key, registros: 0, cantidad: 0, porcentaje: 0 };
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
  seleccionarUsuario(usuario: string): void {
    const key = (usuario || '').trim();
    this.usuarioSel = (this.usuarioSel === key) ? '' : key; // toggle
    this.codigoSel = '';                                     // reinicia código al cambiar usuario
    this.recomputarVista();
  }

  seleccionarCodigo(codigo: string): void {
    const key = String(codigo || '').trim();
    this.codigoSel = (this.codigoSel === key) ? '' : key; // toggle
    this.recomputarVista();
  }

  limpiarSeleccion(): void {
    this.usuarioSel = '';
    this.codigoSel = '';
    this.recomputarVista();
  }

  get haySeleccion(): boolean {
    return !!(this.usuarioSel || this.codigoSel);
  }

  // ✅ Cuenta códigos únicos por usuario — ahora sobre datosBase (para el gráfico)
  calculateUserStats(): void {
    const userUniqueCodes: { [key: string]: Set<string> } = {};

    this.datosBase.forEach(item => {
      const userName = `${item.nombre} ${item.apellido}`.trim();
      const codigo = item.codigo?.toString().trim();

      if (userName && codigo) {
        if (!userUniqueCodes[userName]) {
          userUniqueCodes[userName] = new Set<string>();
        }
        userUniqueCodes[userName].add(codigo);
      }
    });

    this.userStats = {};
    Object.keys(userUniqueCodes).forEach(userName => {
      this.userStats[userName] = userUniqueCodes[userName].size;
    });
  }

  initializeChart(): void {
    if (!this.userChartRef?.nativeElement) {
      return;
    }

    if (this.userChart) {
      this.userChart.destroy();
    }

    const ctx = this.userChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const sortedUserData = Object.entries(this.userStats)
      .sort(([, a], [, b]) => b - a)
      .map(([user, count]) => ({ user, count }));

    const users = sortedUserData.map(item => item.user);
    const quantities = sortedUserData.map(item => item.count);

    const colors = this.generateColors(users.length);

    const config: ChartConfiguration = {
      type: 'bar' as ChartType,
      data: {
        labels: users,
        datasets: [{
          label: 'Códigos Únicos Reportados',
          data: quantities,
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Códigos Únicos Reportados por Usuario (Mayor a Menor)',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Cantidad de Códigos Únicos'
            },
            ticks: {
              stepSize: 1
            }
          },
          x: {
            title: {
              display: true,
              text: 'Usuarios'
            },
            ticks: {
              maxRotation: 45,
              minRotation: 0
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    };

    this.userChart = new Chart(ctx, config);
  }

  generateColors(count: number): { background: string[], border: string[] } {
    const baseColors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
    ];

    const background: string[] = [];
    const border: string[] = [];

    for (let i = 0; i < count; i++) {
      const baseColor = baseColors[i % baseColors.length];
      background.push(baseColor + '80');
      border.push(baseColor);
    }

    return { background, border };
  }

  toggleChartView(): void {
    this.showChart = !this.showChart;

    if (this.showChart) {
      setTimeout(() => {
        this.initializeChart();
      }, 100);
    }
  }

  actualizarEstado(item: any): void {
    const pedidoActualizado = {
      id_pedido: parseInt(item.id_sugerido) || 0,
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

    this.tutorialService.actualizarEstadoSugerido(item.id_sugerido, pedidoActualizado).subscribe({
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

  revisado(){
    this.router.navigate(['/sugeridosadrev']);
  }

  error(){
    this.router.navigate(['/sugeridosaderror']);
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Pedidos_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    saveAs(blob, `Pedidos_${new Date().toISOString().split('T')[0]}.csv`);
  }
}