import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import { CotizacionService } from 'src/app/services/cotizacion.service';
import { BlService } from 'src/app/services/bl.service';
import * as XLSX from 'xlsx'; 
import { Language, TranslationinvoService } from 'src/app/services/translationinvo.service';


@Component({
  selector: 'app-invoicepro',
  templateUrl: './invoicepro.component.html',
  styleUrls: ['./invoicepro.component.css']
})
export class InvoiceproComponent implements OnInit, OnDestroy {

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 0;
  lista: any[] = [];
  allData: any[] = [];
  filteredData: any[] = [];
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;

  // Multilenguaje - EMOJIS CORREGIDOS
  currentLanguage: Language = 'es';
  translations: any = {};
  showLanguageMenu = false;
  languages = [
    { code: 'es' as Language, name: 'Español', flag: '🇪🇸' },
    { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
    { code: 'zh' as Language, name: '中文', flag: '🇨🇳' }
  ];

  // Date filter
  startDate: string = '';
  endDate: string = '';

  // Modal image
  isModalOpen = false;
  currentImageUrl = '';

  private subs = new Subscription();

  constructor(
    private router: Router,
    private authService: AuthService,
    private pedidobodegaService: PedidobodegaService,
    private reloadService: ReloadService,
    private cotizacionService: BlService,
    private translationService: TranslationinvoService
  ) {}

  ngOnInit(): void {
    // Idioma - cargar traducciones inicialmente
    this.currentLanguage = this.translationService.getCurrentLanguage();
    this.translations = this.translationService.getTranslations();
    
    this.subs.add(
      this.translationService.currentLanguage$.subscribe(lang => {
        this.currentLanguage = lang;
        this.translations = this.translationService.getTranslations();
      })
    );

    // Usuario
    this.subs.add(
      this.authService.usuarioActual$.subscribe(usuario => {
        this.usuario = usuario;
        if (usuario) {
          this.id = Number(usuario.agencia);
          this.loadInitialData();
        }
      })
    );

    // Reload
    this.subs.add(
      this.reloadService.reload$.subscribe(() => this.loadInitialData())
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /* ---------- MULTIIDIOMA ---------- */
  t(key: string): string {
    return this.translations[key] || key;
  }

  toggleLanguageMenu(): void {
    this.showLanguageMenu = !this.showLanguageMenu;
  }

  changeLanguage(lang: Language): void {
    this.translationService.setLanguage(lang);
    this.showLanguageMenu = false;
  }

  getCurrentLanguageFlag(): string {
    const language = this.languages.find(l => l.code === this.currentLanguage);
    return language?.flag || '🇪🇸';
  }

  /* ---------- DATOS ---------- */
  loadInitialData(): void {
    this.loading = true;
    this.cotizacionService.getAllBlProveedorIn(this.id).subscribe({
      next: (data: any) => {
        this.allData = data;
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error fetching data:', err);
        this.loading = false;
      },
      complete: () => this.loading = false
    });
  }

  applyFilters(): void {
    let temp = this.allData;

    // Filtro de fecha
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate).setHours(0, 0, 0, 0);
      const end = new Date(this.endDate).setHours(23, 59, 59, 999);
      temp = temp.filter(item => {
        const itemDate = new Date(item.fecha_creacion).getTime();
        return itemDate >= start && itemDate <= end;
      });
    }

    // Filtro de texto
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      temp = temp.filter(item =>
        item.invoice?.toLowerCase().includes(searchLower) ||
        item.cotizacion?.toLowerCase().includes(searchLower) ||
        item.codigo?.toLowerCase().includes(searchLower) ||
        item.descripcion?.toLowerCase().includes(searchLower) ||
        item.estado?.toLowerCase().includes(searchLower) ||
        item.observaciones?.toLowerCase().includes(searchLower) ||
        item.cliente?.toLowerCase().includes(searchLower) ||
        item.ot?.toLowerCase().includes(searchLower) ||
        item.usuario?.toLowerCase().includes(searchLower)
      );
    }

    this.filteredData = temp;
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePagination();
  }

  searchImports(): void {
    this.applyFilters();
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.lista = this.filteredData.slice(start, end);
  }

  changePage(page: any): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  trackById(_: number, item: any): any {
    return item.id ?? item.codigo ?? item.invoice;
  }

  getPaginationArray(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    const start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(this.totalPages, start + maxVisible - 1);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (end < this.totalPages) {
      if (end < this.totalPages - 1) pages.push('...');
      pages.push(this.totalPages);
    }
    return pages;
  }

  /* ---------- NAVEGACIÓN ---------- */
  coti(): void { 
    this.router.navigate(['/dashboardcot']); 
  }
  
  crear(): void { 
    this.router.navigate(['/crearinvoipro']); 
  }
  
  error(): void { 
    this.router.navigate(['/subir-detalle']); 
  }
  
  revi(): void { 
    this.router.navigate(['/dashboardrev']); 
  }
  
  aprobada(): void { 
    this.router.navigate(['/dashboardapro']); 
  }
   asignada(): void { 
    this.router.navigate(['/dashboardapro']); 
  }
  

  entregada(): void { 
    this.router.navigate(['/dashboardentre']); 
  }
  
  anulada(): void { 
    this.router.navigate(['/dashboardanulada']); 
  }
  
  navigate1(): void { 
    // Implementar edición si es necesario
  }
  
  navigate2(orden: any): void { 
    this.router.navigate(['/detailinvoi', orden]); 
  }
  
  navigate3(orden: any): void { 
    this.router.navigate(['/dashinvorev', orden]); 
  }

  /* ---------- CRUD ---------- */
  eliminar(id: number): void {
    if (!confirm(this.t('confirmDelete'))) return;
    
    this.pedidobodegaService.deletePedido(id).subscribe({
      next: () => {
        this.showNotification(this.t('deleteOk'), 'success');
        this.reloadService.triggerReload();
      },
      error: (err) => {
        console.error('Error al eliminar:', err);
        this.showNotification(this.t('deleteError'), 'error');
      }
    });
  }

  /* ---------- MODAL ---------- */
  openModal(imageUrl: string): void {
    this.currentImageUrl = imageUrl;
    this.isModalOpen = true;
  }
  
  closeModal(): void {
    this.isModalOpen = false;
    this.currentImageUrl = '';
  }

  /* ---------- EXPORT ---------- */
  downloadExcel(): void {
    const exportData = this.filteredData.map(item => ({
      'Invoice': item.invoice || '',
      'Cotización': item.cotizacion || '',
      'Estado': item.estado || '',
      'Código': item.codigo || '',
      'Descripción': item.descripcion || '',
      'Cantidad': item.cantidad || '',
      'Cliente': item.cliente || '',
      'OT': item.ot || '',
      'Usuario': item.usuario || '',
      'Fecha': item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString() : '',
      'Observaciones': item.observaciones || ''
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const fileName = `Invoice_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, fileName);
  }

  downloadCSV(): void {
    const headers = [
      'Invoice',
      'Cotización',
      'Estado',
      'Código',
      'Descripción',
      'Cantidad',
      'Cliente',
      'OT',
      'Usuario',
      'Fecha',
      'Observaciones'
    ];
    
    const headerRow = headers.join(',') + '\n';
    
    const dataRows = this.filteredData.map(item => {
      const row = [
        item.invoice || '',
        item.cotizacion || '',
        item.estado || '',
        item.codigo || '',
        item.descripcion || '',
        item.cantidad || '',
        item.cliente || '',
        item.ot || '',
        item.usuario || '',
        item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString() : '',
        item.observaciones || ''
      ];
      
      return row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    }).join('\n');
    
    const csvContent = headerRow + dataRows;
    const blob = new Blob(['\ufeff' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const fileName = `Invoice_${new Date().toISOString().split('T')[0]}.csv`;
    saveAs(blob, fileName);
  }

  /* ---------- NOTIFICACIONES ---------- */
  showNotification(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Implementar con tu sistema de notificaciones (snackbar, toast, etc.)
    console.log(`[${type.toUpperCase()}] ${msg}`);
    alert(msg);
  }
}