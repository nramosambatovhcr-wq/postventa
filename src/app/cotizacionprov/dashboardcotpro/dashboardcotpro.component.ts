import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import { TranslationService, Language, Translations } from '../../services/translation.service';
import * as XLSX from 'xlsx';
import { CotizacionService } from 'src/app/services/cotizacion.service';


@Component({
  selector: 'app-dashboardcotpro',
  templateUrl: './dashboardcotpro.component.html',
  styleUrls: ['./dashboardcotpro.component.css']
})
export class DashboardcotproComponent implements OnInit, OnDestroy {
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
  allData: any[] = [];
  filteredData: any[] = [];
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;
  private subscription = new Subscription();

  // Date filter variables
  startDate: string = '';
  endDate: string = '';

  // Language variables
  currentLanguage: Language = 'es';
  showLanguageMenu: boolean = false;
  translations: Translations = {};
  
  languages = [
    { code: 'es' as Language, name: 'Español', flag: '🇪🇸' },
    { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
    { code: 'zh' as Language, name: '中文', flag: '🇨🇳' }
  ];

  constructor(
    private router: Router,
    private tutorialService: CotizacionService,
    private reloadService: ReloadService,
    private authService: AuthService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    // Suscribirse a cambios de idioma
    this.subscription.add(
      this.translationService.currentLanguage$.subscribe(lang => {
        this.currentLanguage = lang;
        this.translations = this.translationService.getTranslations();
      })
    );

    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if (this.usuario != null) {
        this.id = Number(this.usuario.id);
        console.log(this.id);
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

  // Language methods
  changeLanguage(lang: Language): void {
    this.translationService.setLanguage(lang);
    this.showLanguageMenu = false;
  }

  toggleLanguageMenu(): void {
    this.showLanguageMenu = !this.showLanguageMenu;
  }

  getCurrentLanguageFlag(): string {
    return this.languages.find(l => l.code === this.currentLanguage)?.flag || '🇪🇸';
  }

  // Helper method to access translations safely
  t(key: string): string {
    return this.translations[key] || key;
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
    this.tutorialService.getCotizacionProByUser(this.id).subscribe({
      next: (data: any) => {
          const estadosExcluidos = new Set(['Aprobada', 'Rechazada', 'Asignada']);

          this.allData = data.filter((item:any) =>
            !estadosExcluidos.has(item.estadoCotizacion)   // ←←← deja pasar cualquier otro estado
          );

          this.filteredData = this.allData;
          this.totalItems = this.filteredData.length;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          this.currentPage = 1;
          this.updatePageData();
          this.loading = false;
        },
      error: (e) => {
        console.error(e);
        this.loading = false;
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

  applyDateFilter() {
    if (!this.startDate || !this.endDate) {
      this.filteredData = this.allData;
    } else {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);

      this.filteredData = this.allData.filter(item => {
        const itemDate = new Date(item.fecha_creacion);
        return itemDate >= start && itemDate <= end;
      });
    }

    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePageData();
  }

  resetDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.filteredData = this.allData;
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePageData();
  }

  searchImports(): void {
    if (this.searchTerm.trim() === '') {
      this.applyDateFilter();
    } else {
      const searchTermLower = this.searchTerm.toLowerCase();

      let dateFilteredData = this.allData;
      if (this.startDate && this.endDate) {
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        end.setHours(23, 59, 59, 999);

        dateFilteredData = this.allData.filter(item => {
          const itemDate = new Date(item.fecha_creacion);
          return itemDate >= start && itemDate <= end;
        });
      }

      this.filteredData = dateFilteredData.filter(item =>
        (item.codigo && item.codigo.toLowerCase().includes(searchTermLower)) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(searchTermLower)) ||
        (item.observaciones && item.observaciones.toLowerCase().includes(searchTermLower))
      );

      this.totalItems = this.filteredData.length;
      this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
      this.currentPage = 1;
      this.updatePageData();
    }
    console.log('Buscando:', this.searchTerm);
  }

  filterData(): void {
    console.log('Filtrar datos');
  }

  revisado() {
    this.router.navigate(['/pedidobodrev']);
  }

  error() {
    this.router.navigate(['/cotasignada']);
  }

  crear() {
    this.router.navigate(['/crearcot']);
  }

  coti() {
    this.router.navigate(['/dashboardcotpro']);
  }

  aprobada() {
    this.router.navigate(['/cotaprobada']);
  }

  rechazada() {
    this.router.navigate(['/cotrechazada']);
  }

  verDetalles(codigoId: any) {
    this.router.navigate(['/respuestapro', codigoId]);
  }

  addDetalles(codigoId: any) {
    this.router.navigate(['/detallexcelcot', codigoId]);
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