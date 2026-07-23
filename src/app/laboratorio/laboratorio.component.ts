import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../models/usuario';
import { AuthService } from '../services/auth.service';
import { PedidobodegaService } from '../services/pedidobodega.service';
import { ReloadService } from '../services/reload.service';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';



@Component({
  selector: 'app-laboratorio',
  templateUrl: './laboratorio.component.html',
  styleUrls: ['./laboratorio.component.css']
})
export class LaboratorioComponent implements OnInit, OnDestroy {
  stats = {
    totalImportaciones: 0,
    enTransito: 0,
    pendientesLiquidacion: 0,
    tiempoPromedio: 28
  };

  // Nuevas variables para estadísticas
  estadisticasGenerales: any = {
    total_carros: 0,
    total_partes_revisadas: 0,
    total_partes_pendientes: 0,
    total_partes: 0
  };
  estadisticasPorLinea: any[] = [];
  lineas: any[] = [];
  lineaSeleccionada: number = 0;

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
  private subscription = new Subscription();

  startDate: string = '';
  endDate: string = '';
  filtersApplied: boolean = false;

  selectedImageUrl: string = '';
  isModalOpen: boolean = false;
  totalItems: number = 0;
  estadoActivo: string = '';
  showExportMenu: boolean = false;
  mostrarEstadisticasLinea: boolean = false; // Controla si se muestran las estadísticas por línea
  showLineStats: boolean = false;
lineStats: any[] = [];
rolusuario:any;
activeStatsTab: string = ''; // Controla qué pestaña de estadísticas está activa
categoryStats: any[] = [];
modelStats: any[] = [];
// ✅ Para el progreso de descarga
 
downloadProgress = 0;
downloadMessage = '';

// ✅ Cache de imágenes
private imageCache = new Map<string, string>();

// ✅ Toast con barra de progreso
private progressToast: HTMLDivElement | null = null;

  constructor(
    private router: Router, 
    private tutorialService: PedidobodegaService, 
    private reloadService: ReloadService, 
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        this.rolusuario=this.usuario.rol;
        console.log(this.id);
         if(this.rolusuario === 'admin' || this.rolusuario === 'laboratorio1' || this.rolusuario === 'laboratorio2'|| this.rolusuario === 'bodegaimpor'){
          this.loadimportaciones(); 
        }
       else if(this.rolusuario === 'repuestoslv'){
          this.loadimportacionesid('liv'); 
          this.cargarEstadisticasGenerales();
          this.cargarLineas();
          this.cargarEstadisticasPorLinea();
        } 
        if(this.rolusuario === 'repuestoslsc'){
          this.loadimportacionesid('sc'); 
          this.cargarEstadisticasGenerales();
          this.cargarLineas();
          this.cargarEstadisticasPorLinea();
        } 
        if(this.rolusuario === 'repuestoslk'){
          this.loadimportacionesid('lk'); 
          this.cargarEstadisticasGenerales();
          this.cargarLineas();
          this.cargarEstadisticasPorLinea();
        } 
         if(this.rolusuario === 'repuestos'){
          this.loadimportacionesid('pesa'); 
          this.cargarEstadisticasGenerales();
          this.cargarLineas();
          this.cargarEstadisticasPorLinea();
        }
        
      }
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadimportaciones();
        this.cargarEstadisticasGenerales();
      })
    );

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.startDate = this.formatDateForInput(firstDayOfMonth);
    this.endDate = this.formatDateForInput(lastDayOfMonth);
  }

  // Nuevos métodos para cargar estadísticas
  cargarEstadisticasGenerales() {
    this.tutorialService.getEstadisticasGenerales().subscribe({
      next: (data) => {
        this.estadisticasGenerales = data;
        console.log('Estadísticas generales:', data);
      },
      error: (err) => console.error('Error al cargar estadísticas generales:', err)
    });
  }

  cargarLineas() {
    this.tutorialService.getLineas().subscribe({
      next: (data) => {
        this.lineas = data;
        console.log('Líneas disponibles:', data);
      },
      error: (err) => console.error('Error al cargar líneas:', err)
    });
  }

  cargarEstadisticasPorLinea() {
    this.tutorialService.getEstadisticasPorLinea().subscribe({
      next: (data) => {
        this.estadisticasPorLinea = data;
        console.log('Estadísticas por línea:', data);
      },
      error: (err) => console.error('Error al cargar estadísticas por línea:', err)
    });
  }

  consultarLineaEspecifica(idLinea: number) {
    this.lineaSeleccionada = idLinea;
    this.tutorialService.getEstadisticasDeLinea(idLinea).subscribe({
      next: (data) => {
        console.log(`Estadísticas de línea ${idLinea}:`, data);
        // Aquí puedes hacer algo con las estadísticas de la línea específica
        // Por ejemplo, mostrarlas en un modal o actualizar una vista
      },
      error: (err) => console.error('Error al cargar estadísticas de línea:', err)
    });
  }

  // Método para mostrar/ocultar las estadísticas por línea
  toggleEstadisticasLinea() {
    this.mostrarEstadisticasLinea = !this.mostrarEstadisticasLinea;
  }

  toggleLineStats(): void {
  if (this.activeStatsTab === 'linea') {
    this.activeStatsTab = ''; // Cerrar si ya está abierto
  } else {
    this.activeStatsTab = 'linea';
    this.calculateLineStats();
  }
}

toggleCategoryStats(): void {
  if (this.activeStatsTab === 'categoria') {
    this.activeStatsTab = '';
  } else {
    this.activeStatsTab = 'categoria';
    this.calculateCategoryStats();
  }
}

toggleModelStats(): void {
  if (this.activeStatsTab === 'modelo') {
    this.activeStatsTab = '';
  } else {
    this.activeStatsTab = 'modelo';
    this.calculateModelStats();
  }
}

calculateCategoryStats(): void {
  const statsMap = new Map<string, any>();
  
  this.filteredData.forEach(item => {
    const categoria = item.categoria?.codigo || 'Sin Categoría';
    
    if (!statsMap.has(categoria)) {
      statsMap.set(categoria, {
        categoria: categoria,
        total: 0,
        totalCantidad: 0,
        modelos: new Set(),
        codigos: new Set()
      });
    }
    
    const stats = statsMap.get(categoria);
    stats.total++;
    stats.totalCantidad += parseInt(item.cantidad) || 0;
    if (item.modelo) stats.modelos.add(item.modelo);
    if (item.codigo) stats.codigos.add(item.codigo);
  });
  
  this.categoryStats = Array.from(statsMap.values()).map(stat => ({
    categoria: stat.categoria,
    total: stat.total,
    totalCantidad: stat.totalCantidad,
    modelos: stat.modelos.size,
    codigos: stat.codigos.size,
    porcentaje: ((stat.total / this.filteredData.length) * 100).toFixed(1)
  })).sort((a, b) => b.total - a.total);
}

calculateModelStats(): void {
  const statsMap = new Map<string, any>();
  
  this.filteredData.forEach(item => {
    const modelo = item.modelo || 'Sin Modelo';
    
    if (!statsMap.has(modelo)) {
      statsMap.set(modelo, {
        modelo: modelo,
        total: 0,
        totalCantidad: 0,
        categorias: new Set(),
        codigos: new Set()
      });
    }
    
    const stats = statsMap.get(modelo);
    stats.total++;
    stats.totalCantidad += parseInt(item.cantidad) || 0;
    if (item.categoria?.codigo) stats.categorias.add(item.categoria.codigo);
    if (item.codigo) stats.codigos.add(item.codigo);
  });
  
  this.modelStats = Array.from(statsMap.values()).map(stat => ({
    modelo: stat.modelo,
    total: stat.total,
    totalCantidad: stat.totalCantidad,
    categorias: stat.categorias.size,
    codigos: stat.codigos.size,
    porcentaje: ((stat.total / this.filteredData.length) * 100).toFixed(1)
  })).sort((a, b) => b.total - a.total);
}

calculateLineStats(): void {
  const statsMap = new Map<string, any>();
  
  this.filteredData.forEach(item => {
    const linea = item.linea || 'Sin Línea';
    
    if (!statsMap.has(linea)) {
      statsMap.set(linea, {
        linea: linea,
        total: 0,
        modelos: new Set(),
        motores: new Set(),
        chasis: new Set()
      });
    }
    
    const stats = statsMap.get(linea);
    stats.total++;
    if (item.modelo) stats.modelos.add(item.modelo);
    if (item.motor) stats.motores.add(item.motor);
    if (item.chasis) stats.chasis.add(item.chasis);
  });
  
  this.lineStats = Array.from(statsMap.values()).map(stat => ({
    linea: stat.linea,
    total: stat.total,
    modelos: stat.modelos.size,
    motores: stat.motores.size,
    chasis: stat.chasis.size,
    porcentaje: ((stat.total / this.filteredData.length) * 100).toFixed(1)
  })).sort((a, b) => b.total - a.total);
}

  // Variables para el hover de las filas
  hoveredRowIndex: number = -1;

  // Método para manejar el hover de las filas
  onRowHover(index: number, isHovering: boolean) {
    this.hoveredRowIndex = isHovering ? index : -1;
  }

  // Método para obtener el color de fondo de la fila
  getRowBackground(index: number): string {
    if (this.hoveredRowIndex === index) {
      return '#e3f2fd';
    }
    return index % 2 === 0 ? '#f9f9f9' : 'white';
  }

  closeImageModal(): void {
    this.isModalOpen = false;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  
  loadimportaciones() {
    this.loading = true;
    this.tutorialService.laboratorio().subscribe({
      next: (data: any) => {
        console.log('Total registros cargados:', data.length);
        
        this.allData = data;
        this.filteredData = [...this.allData];
        this.updateDisplayedData();
        this.calculateStats();
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar datos:', e);
        this.loading = false;
      }
    });
  }

   loadimportacionesid(id:any) {
    this.loading = true;
    this.tutorialService.laboratorioid(id).subscribe({
      next: (data: any) => {
        console.log('Total registros cargados:', data.length);
        
        this.allData = data;
        this.filteredData = [...this.allData];
        this.updateDisplayedData();
        this.calculateStats();
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar datos:', e);
        this.loading = false;
      }
    });
  }
  
  updateDisplayedData() {
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.totalItems);
    
    this.lista = this.filteredData.slice(startIndex, endIndex);
    console.log(this.lista);
    
    console.log(`Mostrando ${this.lista.length} registros (de ${this.totalItems} filtrados)`);
  }
  
 calculateStats(): void {
  // Calcular valores únicos
  const uniqueModelos = new Set(this.filteredData.map(item => 
    item.modelo).filter(Boolean)).size;
  
  const uniqueCategorias = new Set(this.filteredData.map(item => 
    item.categoria?.codigo).filter(Boolean)).size;

  this.stats = {
    totalImportaciones: this.allData.length,
    enTransito: this.allData.filter(item => item.revisado === 'Revisado').length,
    pendientesLiquidacion: uniqueModelos, // Modelos únicos
    tiempoPromedio: uniqueCategorias // Categorías únicas
  };
  console.log('Estadísticas calculadas:', this.stats);
}

  actualizarEstado(item: any): void {
    console.log(`Actualizando estado: ${item.codigo} - ${item.revisado}`);
    
    const pedidoActualizado = {
      Id: parseInt(item.id) || 0,
      Cantidad: parseInt(item.cantidad) || 0,
      Codigo: String(item.codigo || ""),
      Descripcion: String(item.descripcion || ""),
      Observaciones: String(item.observacion || ""),
      Estado: String(item.revisado || ""),
      IdUsuarioCreacion: parseInt(item.usuario) || 0,
      IdUsuarioModificacion: this.usuario?.id || 0,
      Nombre: String(item.nombre || "")
    };
    
    console.log("Enviando objeto:", JSON.stringify(pedidoActualizado));
    
    this.tutorialService.actualizarEstadoLabRep(item.id, pedidoActualizado).subscribe({
      next: () => {
        this.showToast("Pedido actualizado exitosamente", '#4CAF50');
        this.loadimportaciones();
        this.cargarEstadisticasGenerales(); // Actualizar estadísticas
        console.log("Estado actualizado");
      },
      error: (err:any) => {
        this.showToast(`Error al actualizar pedido: ${err.error?.message || 'Error desconocido'}`, '#F44336');
        console.error("Error al actualizar estado", err);
        console.error("Cuerpo de la respuesta:", err.error);
      }
    });
  }

  /*getImageUrl1(relativePath: string): string {
    const filename = relativePath.split(/[\\/]/).pop();
    console.log('Ruta original:', relativePath);
    console.log('Nombre del archivo:', filename);
    const imageUrl = `https://bodega.vehicentro.com:1830/api/api/Laboratorio/images/${filename}`;
    console.log('URL final:', imageUrl);
    return imageUrl;
  }
*/
  getImageUrl(relativePath: string, useProxy = false): string {
  const filename = relativePath.split(/[\\/]/).pop()!;
  const base = useProxy
    ? '/api/Laboratorio/images'          // <-- proxy sin CORS
    : 'https://bodega.vehicentro.com:1830/api/api/Laboratorio/images';
  return `${base}/${filename}`;
}

  onImageError(event: any, imagePath: string) {
    console.error('Error cargando imagen:', {
      imagePath: imagePath,
      generatedUrl: this.getImageUrl(imagePath),
      error: event
    });
  }

  onImageLoad(event: any, imagePath: string) {
    console.log('Imagen cargada exitosamente:', {
      imagePath: imagePath,
      generatedUrl: this.getImageUrl(imagePath)
    });
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateDisplayedData();
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  applyDateFilter() {
    this.filtersApplied = true;
    
    if (!this.startDate || !this.endDate) {
      this.filteredData = [...this.allData];
    } else {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);

      this.filteredData = this.allData.filter(item => {
        const itemDate = new Date(item.fecha);
        return itemDate >= start && itemDate <= end;
      });
    }
    
    if (this.searchTerm.trim() !== '') {
      this.applySearchFilter();
    } else {
      this.currentPage = 1;
      this.updateDisplayedData();
    }
  }

  applySearchFilter() {
    this.filtersApplied = true;
    
    const searchTermLower = this.searchTerm.toLowerCase().trim();
    
    if (searchTermLower === '') {
      if (this.startDate && this.endDate) {
        this.applyDateFilter();
      } else {
        this.filteredData = [...this.allData];
        this.updateDisplayedData();
      }
      return;
    }
    
    const tempFiltered = this.filteredData.filter(item => 
      (item.codigo && item.codigo.toLowerCase().includes(searchTermLower)) ||
      (item.descripcion && item.descripcion.toLowerCase().includes(searchTermLower)) ||
      (item.observaciones && item.observaciones.toLowerCase().includes(searchTermLower))
    );
    
    this.filteredData = tempFiltered;
    this.currentPage = 1;
    this.updateDisplayedData();
  }

  searchImports(): void {
    this.filtersApplied = true;
    this.applyDateFilter();
    this.applySearchFilter();
  }

  resetDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.searchTerm = '';
    this.filtersApplied = false;
    this.filteredData = [...this.allData];
    this.currentPage = 1;
    this.updateDisplayedData();
  }

  filterData(): void {
    console.log('Filtrar datos');
  }

  revisado() {
    this.estadoActivo = 'revisado';
    this.router.navigate(['/laboratoriorev']);
  }

  pendiente() {
    this.estadoActivo = 'pendiente';
    this.router.navigate(['/laboratorio']);
  }
  
asignar() {
    this.estadoActivo = 'pendiente';
    this.router.navigate(['/asignarvehi']);
  }

  vehis() {
    this.estadoActivo = 'vehiculos';
    this.router.navigate(['/laboratoriovehi']);
  }

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
        item.fecha ? new Date(item.fecha).toLocaleDateString() : '-',
        item.revisado || '-'
      ].join(',');
      csvContent += row + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `Pedidos_${new Date().toISOString().split('T')[0]}.csv`);
  }

  private showToast(message: string, backgroundColor: string): void {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = backgroundColor;
    toast.style.color = 'white';
    toast.style.padding = '15px 20px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

    document.body.appendChild(toast);
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  }

  saveAsSugerido(item: any): void {
    if (!this.usuario || !this.id) {
      this.showToast('Error: Usuario no logueado', '#F44336');
      return;
    }
    
    const pedidoRequest = {
      Codigo: item.codigo,
      Descripcion: item.descripcion,
      Observaciones: item.observacion || null,
      Cantidad: item.cantidad,
      Modelo: item.modelo || "",
      Cliente: item.cliente || "lab1",
      Ot: item.ot || "",
      IdUsuarioCreacion: this.id
    };
 
    this.tutorialService.createSugerido1(pedidoRequest).subscribe({
      next: (response) => {
        console.log('Sugerido guardado exitosamente:', response);
        this.showToast('Sugerido guardado exitosamente', '#4CAF50');
      },
      error: (err) => {
        console.error('Error al guardar sugerido:', err);
        const errorMessage = err.error?.message || 'Error desconocido';
        this.showToast(`Error al guardar sugerido: ${errorMessage}`, '#F44336');
      }
    });
  }

  getThumbnailUrl(relativePath: string): string {
    const filename = relativePath.split(/[\\/]/).pop();
    return `https://bodega.vehicentro.com:1830/api/api/Laboratorio/images/thumbnails/${filename}`;
  }

  getFullImageUrl(relativePath: string): string {
    const filename = relativePath.split(/[\\/]/).pop();
    return `https://bodega.vehicentro.com:1830/api/api/Laboratorio/images/${filename}`;
  }

  openImageModal(imagePath: string): void {
    this.selectedImageUrl = this.getFullImageUrl(imagePath);
    this.isModalOpen = true;
  }
// Agregar estas propiedades a la clase
 
private isDownloading = false;

// Método optimizado para carga ultra-rápida con compresión agresiva


// Carga masiva con límite de concurrencia agresivo
private async loadImagesInBatches(
  imageUrls: string[], 
  batchSize: number = 15 // Aumentado de 5 a 15
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const promises = batch.map(url => this.loadImageOptimized(url));
    const batchResults = await Promise.allSettled(promises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        results.set(batch[index], result.value);
      }
    });
    
    // Actualizar progreso cada lote
    const progress = 10 + ((i / imageUrls.length) * 60);
    this.showProgressToast(
      `Cargando imágenes... ${Math.min(i + batchSize, imageUrls.length)}/${imageUrls.length}`, 
      progress
    );
  }
  
  return results;
}

// NUEVO: Excel solo con links (INSTANTÁNEO - RECOMENDADO)
downloadExcelWithImageLinks(): void {
  this.showToast('Generando Excel con links...', '#2196F3');
  
  const dataToExport = this.filteredData.map(item => {
    const imageLinks = item.imagenes && item.imagenes.length > 0
      ? item.imagenes.map((img: string) => this.getImageUrl(img)).join(' | ')
      : 'Sin imagen';

    return {
      Codigo: item.codigo || '',
      Nombre: item.nombre || '',
      Descripcion: item.descripcion || '',
      Cantidad: item.cantidad || 0,
      Observaciones: item.observacion || '',
      Fecha: item.fecha ? new Date(item.fecha).toLocaleDateString() : '',
      Estado: item.revisado || '',
      Modelo: item.modelo || '',
      Categoria: item.categoria?.codigo || '',
      'Links Imágenes': imageLinks
    };
  });

  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
  
  worksheet['!cols'] = [
    { wch: 15 }, { wch: 25 }, { wch: 35 }, { wch: 10 }, 
    { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    { wch: 15 }, { wch: 60 }
  ];

  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });

  saveAs(blob, `Pedidos_Links_${new Date().toISOString().split('T')[0]}.xlsx`);
  this.showToast('Excel generado exitosamente (Instantáneo)', '#4CAF50');
}

// NUEVO: Excel con imágenes pero con LÍMITE configurable
/*
async downloadExcelWithImagesLimited(maxImages: number = 100): Promise<void> {
  if (this.isDownloading) {
    this.showToast('Ya hay una descarga en progreso', '#FF9800');
    return;
  }

  const totalImages = this.filteredData.reduce((sum, item) => 
    sum + (item.imagenes?.length || 0), 0);

  if (totalImages > 500) {
    const confirmed = confirm(
      `Tienes ${totalImages} imágenes. Esto puede tardar varios minutos.\n\n` +
      `¿Prefieres descargar solo las primeras ${maxImages} imágenes?\n\n` +
      `Haz click en "Aceptar" para limitar a ${maxImages} imágenes\n` +
      `o "Cancelar" para descargar todas (puede ser MUY lento)`
    );
    
    if (!confirmed) {
      maxImages = totalImages; // Descargar todas
    }
  }

  this.isDownloading = true;
  this.showProgressToast('Preparando descarga...', 0);

  try {
    const dataToExport = this.filteredData.map(item => ({
      Codigo: item.codigo || '',
      Nombre: item.nombre || '',
      Descripcion: item.descripcion || '',
      Cantidad: item.cantidad || 0,
      Observaciones: item.observacion || '',
      Fecha: item.fecha ? new Date(item.fecha).toLocaleDateString() : '',
      Estado: item.revisado || '',
      Modelo: item.modelo || '',
      Categoria: item.categoria?.codigo || ''
    }));

    // Recolectar URLs limitadas
    const imageUrls = new Set<string>();
    let imageCount = 0;
    
    for (const item of this.filteredData) {
      if (imageCount >= maxImages) break;
      if (item.imagenes && Array.isArray(item.imagenes)) {
        for (const img of item.imagenes) {
          if (imageCount >= maxImages) break;
          if (img) {
            imageUrls.add(this.getImageUrl(img));
            imageCount++;
          }
        }
      }
    }

    this.showProgressToast(`Cargando ${imageUrls.size} imágenes...`, 10);

    // Cargar imágenes en lotes grandes
    const imageMap = await this.loadImagesInBatches(Array.from(imageUrls), 15);
    
    this.showProgressToast('Generando Excel...', 70);

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);

    worksheet['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 35 }, { wch: 10 },
      { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
      { wch: 15 }, { wch: 30 }
    ];

    const startRow = 1;
    let successfulImages = 0;

    this.filteredData.forEach((item, index) => {
      const rowNum = startRow + index + 1;
      
      if (item.imagenes && item.imagenes.length > 0 && item.imagenes[0]) {
        const imageUrl = this.getImageUrl(item.imagenes[0]);
        const base64Image = imageMap.get(imageUrl);
        
        if (base64Image) {
          const cellAddress = `J${rowNum}`;
          worksheet[cellAddress] = { 
            v: 'Ver imagen',
            l: { Target: imageUrl, Tooltip: 'Click para ver imagen' }
          };
          successfulImages++;
        }
      }
    });

    this.showProgressToast('Finalizando...', 95);

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');

    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array'
    });

    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    saveAs(blob, `Pedidos_Imagenes_${new Date().toISOString().split('T')[0]}.xlsx`);

    this.showProgressToast('¡Completado!', 100);
    setTimeout(() => {
      this.showToast(
        `Excel generado: ${this.filteredData.length} registros, ${successfulImages} imágenes`, 
        '#4CAF50'
      );
    }, 500);

  } catch (error) {
    console.error('Error al generar Excel:', error);
    this.showToast('Error al generar Excel con imágenes', '#F44336');
  } finally {
    this.isDownloading = false;
    this.hideProgressToast();
  }
}*/

// NUEVO: Opción para trabajar solo con datos filtrados
async downloadCurrentPageWithImages(): Promise<void> {
  if (this.isDownloading) {
    this.showToast('Ya hay una descarga en progreso', '#FF9800');
    return;
  }

  this.isDownloading = true;
  this.showProgressToast('Preparando página actual...', 0);

  try {
    // Solo exportar lo que se ve actualmente (this.lista)
    const dataToExport = this.lista.map(item => ({
      Codigo: item.codigo || '',
      Nombre: item.nombre || '',
      Descripcion: item.descripcion || '',
      Cantidad: item.cantidad || 0,
      Observaciones: item.observacion || '',
      Fecha: item.fecha ? new Date(item.fecha).toLocaleDateString() : '',
      Estado: item.revisado || '',
      Modelo: item.modelo || '',
      Categoria: item.categoria?.codigo || ''
    }));

    const imageUrls = new Set<string>();
    this.lista.forEach(item => {
      if (item.imagenes && Array.isArray(item.imagenes)) {
        item.imagenes.forEach((img: string) => {
          if (img) imageUrls.add(this.getImageUrl(img));
        });
      }
    });

    this.showProgressToast(`Cargando ${imageUrls.size} imágenes...`, 20);

    const imageMap = await this.loadImagesInBatches(Array.from(imageUrls), 20);
    
    this.showProgressToast('Generando Excel...', 80);

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 35 }, { wch: 10 },
      { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
      { wch: 15 }, { wch: 30 }
    ];

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Página Actual');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    saveAs(blob, `Pedidos_PaginaActual_${new Date().toISOString().split('T')[0]}.xlsx`);

    this.showToast(`Excel generado: ${this.lista.length} registros de la página actual`, '#4CAF50');

  } catch (error) {
    console.error('Error:', error);
    this.showToast('Error al generar Excel', '#F44336');
  } finally {
    this.isDownloading = false;
    this.hideProgressToast();
  }
}

 

clearImageCache(): void {
  this.imageCache.clear();
  this.showToast('Cache de imágenes limpiado', '#2196F3');
}

private async loadImageAsBase64(url: string, retries: number = 5): Promise<string | null> {
  // Intentar cargar desde cache primero
  if (this.imageCache.has(url)) {
    return this.imageCache.get(url)!;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await this.attemptLoadImage(url, attempt);
      if (result) {
        this.imageCache.set(url, result);
        return result;
      }
    } catch (error) {
      console.warn(`Intento ${attempt}/${retries} falló para: ${url}`, error);
      if (attempt === retries) {
        console.error(`Falló definitivamente: ${url}`);
        return null;
      }
      // Esperar un poco antes del siguiente intento
      await this.sleep(500 * attempt);
    }
  }
  
  return null;
}
/*
private attemptLoadImage(url: string, attempt: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Configurar CORS más permisivo
    img.crossOrigin = 'anonymous';
    
    // Timeout más largo en intentos posteriores
    const timeoutDuration = 5000 + (attempt * 2000); // 5s, 7s, 9s
    const timeout = setTimeout(() => {
      img.src = ''; // Cancelar carga
      reject(new Error(`Timeout después de ${timeoutDuration}ms`));
    }, timeoutDuration);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        
        // Tamaño optimizado para Excel
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        
        // Validar dimensiones
        if (width === 0 || height === 0) {
          reject(new Error('Dimensiones de imagen inválidas'));
          return;
        }
        
        // Redimensionar proporcionalmente
        if (width > height) {
          if (width > maxDim) {
            height = (height * maxDim) / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = (width * maxDim) / height;
            height = maxDim;
          }
        }
        
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        
        const ctx = canvas.getContext('2d', { 
          alpha: false, // Mejor rendimiento
          willReadFrequently: false 
        });
        
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto 2D'));
          return;
        }
        
        // Configurar renderizado de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Fondo blanco para JPEGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar imagen
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convertir a base64 con buena calidad
        const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
        
        if (!base64 || base64.length < 100) {
          reject(new Error('Base64 generado inválido'));
          return;
        }
        
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = (error) => {
      clearTimeout(timeout);
      reject(new Error(`Error al cargar imagen: ${error}`));
    };

    // Iniciar carga
    img.src = url;
  });
}*/

private attemptLoadImage(url: string, attempt: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Configurar CORS más permisivo
    img.crossOrigin = 'anonymous'; // Necesita que el servidor envíe Access-Control-Allow-Origin
    
    // Timeout más largo en intentos posteriores
    const timeoutDuration = 5000 + (attempt * 2000); // 5s, 7s, 9s
    const timeout = setTimeout(() => {
      img.src = ''; // Cancelar carga
      reject(new Error(`Timeout después de ${timeoutDuration}ms (Intento ${attempt})`));
    }, timeoutDuration);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        
        // Tamaño optimizado para Excel
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        
        // Validar dimensiones
        if (width === 0 || height === 0) {
          reject(new Error('Dimensiones de imagen inválidas'));
          return;
        }
        
        // Redimensionar proporcionalmente
        if (width > height) {
          if (width > maxDim) {
            height = (height * maxDim) / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = (width * maxDim) / height;
            height = maxDim;
          }
        }
        
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        
        const ctx = canvas.getContext('2d', { 
          alpha: false, // Mejor rendimiento
          willReadFrequently: false 
        });
        
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto 2D'));
          return;
        }
        
        // Configurar renderizado de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Fondo blanco para JPEGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar imagen
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        let base64: string;
        try {
          // Intenta obtener el Base64. Fallará si el canvas está 'contaminado' por CORS.
          const fullBase64 = canvas.toDataURL('image/jpeg', 0.85);
          base64 = fullBase64.split(',')[1];
        } catch (e: any) {
          // <<< SOLUCIÓN CLAVE: Diagnóstico de Error de Seguridad (CORS)
          if (e.name === 'SecurityError' || e.message?.includes('tainted')) {
            // Este es el error de CORS. Notifica al desarrollador/usuario.
            console.error(`ERROR DE CORS DETECTADO: El servidor de imágenes (${url}) debe enviar el encabezado 'Access-Control-Allow-Origin: *'.`, e);
            reject(new Error(`SecurityError (CORS): No se puede leer la imagen. Verifique los encabezados del servidor (${new URL(url).origin}).`));
          } else {
            // Si no es CORS, es otro error de canvas.
            reject(new Error(`Error de Canvas al procesar la imagen: ${e.message}`));
          }
          return;
        }

        if (!base64 || base64.length < 100) {
          reject(new Error('Base64 generado inválido'));
          return;
        }
        
        resolve(base64);
      } catch (error) {
        // Capturar otros errores de lógica dentro del onload
        reject(error);
      }
    };

    img.onerror = (error) => {
      clearTimeout(timeout);
      // 'error' en img.onerror puede ser un objeto Event, por lo que se mejora la descripción.
      const errorMsg = typeof error === 'string' ? error : 'Error de red o archivo corrupto';
      reject(new Error(`Error al cargar imagen (Intento ${attempt}): ${errorMsg}`));
    };

    // Iniciar carga
    img.src = url;
  });
}
private sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Método mejorado para descargar Excel con imágenes REALES
 

// También mejorar el método para todas las imágenes
async downloadExcelWithRealImagesLimited(maxImages: number = 100): Promise<void> {
  if (this.isDownloading) {
    this.showToast('Ya hay una descarga en progreso', '#FF9800');
    return;
  }

  const totalImages = this.filteredData.reduce((sum, item) => 
    sum + (item.imagenes?.length || 0), 0);

  if (totalImages > maxImages) {
    const confirmed = confirm(
      `Hay ${totalImages} imágenes en total.\n\n` +
      `Se limitará a las primeras ${maxImages} imágenes.\n\n` +
      `Tiempo estimado: ${Math.ceil(maxImages / 10)}-${Math.ceil(maxImages / 5)} minutos\n\n` +
      `¿Continuar?`
    );
    if (!confirmed) return;
  }

  this.isDownloading = true;
  this.showProgressToast('Inicializando Excel...', 0);

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pedidos Completos');

    worksheet.columns = [
      { header: 'Código', key: 'codigo', width: 20 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Cantidad', key: 'cantidad', width: 12 },
      { header: 'Observaciones', key: 'observaciones', width: 35 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Modelo', key: 'modelo', width: 20 },
      { header: 'Categoría', key: 'categoria', width: 18 },
      { header: 'Imagen', key: 'imagen', width: 45 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    this.showProgressToast('Agregando datos...', 5);

    this.filteredData.forEach((item) => {
      const row = worksheet.addRow({
        codigo: item.codigo || '',
        nombre: item.nombre || '',
        descripcion: item.descripcion || '',
        cantidad: item.cantidad || 0,
        observaciones: item.observacion || '',
        fecha: item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : '',
        estado: item.revisado || '',
        modelo: item.modelo || '',
        categoria: item.categoria?.codigo || '',
        imagen: ''
      });
      row.height = 140;
      row.alignment = { vertical: 'middle', wrapText: true };
      
    });

    this.showProgressToast('Recopilando imágenes...', 10);

    // Recopilar URLs de imágenes limitadas
    const imagePromises: Array<{ promise: Promise<string | null>; index: number; url: string; }> = [];
    let imageCount = 0;

    for (let i = 0; i < this.filteredData.length && imageCount < maxImages; i++) {
      const item = this.filteredData[i];
      if (item.imagenes && item.imagenes.length > 0 && item.imagenes[0]) {
        const imageUrl = this.getImageUrl(item.imagenes[0]);
        imagePromises.push({
          promise: this.loadImageAsBase64(imageUrl, 3),
          index: i,
          url: imageUrl
        });
        imageCount++;
      }
    }

    console.log(`Cargando ${imagePromises.length} imágenes...`);

    // Cargar en lotes
    const batchSize = 15;
    const imageResults = new Map<number, string>();
    let loadedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < imagePromises.length; i += batchSize) {
      const batch = imagePromises.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch.map(item => item.promise));

      batchResults.forEach((result, batchIndex) => {
        const actualIndex = i + batchIndex;
        const imageData = imagePromises[actualIndex];

        if (result.status === 'fulfilled' && result.value) {
          imageResults.set(imageData.index, result.value);
          loadedCount++;
        } else {
          failedCount++;
        }
      });

      const progress = 10 + ((i + batch.length) / imagePromises.length) * 70;
      this.showProgressToast(
        `Cargadas: ${loadedCount}/${imagePromises.length} (${failedCount} fallidas)`,
        progress
      );
    }

    this.showProgressToast('Insertando imágenes...', 85);

    let insertedCount = 0;
    for (const [itemIndex, base64] of imageResults.entries()) {
      try {
        const imageId = workbook.addImage({
          base64: base64,
          extension: 'jpeg',
        });

        const rowNumber = itemIndex + 2;
        worksheet.addImage(imageId, {
          tl: { col: 9, row: rowNumber - 1 },
          ext: { width: 160, height: 110 },
          editAs: 'oneCell'
        });
        insertedCount++;
      } catch (error) {
        console.error(`Error insertando imagen:`, error);
      }
    }

    this.showProgressToast('Generando archivo...', 95);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    saveAs(blob, `Pedidos_Completo_${new Date().toISOString().split('T')[0]}.xlsx`);

    this.showProgressToast('¡Completado!', 100);
    setTimeout(() => {
      this.showToast(
        `✓ Excel: ${this.filteredData.length} registros, ${insertedCount} imágenes insertadas, ${failedCount} fallidas`,
        '#4CAF50'
      );
    }, 500);

  } catch (error: any) {
    console.error('Error:', error);
    this.showToast(`Error: ${error.message}`, '#F44336');
  } finally {
    this.isDownloading = false;
    this.hideProgressToast();
  }
}



// ✅ Mostrar toast con barra de progreso
private showProgressToast(message: string, progress: number): void {
  if (!this.progressToast) {
    this.progressToast = document.createElement('div');
    this.progressToast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      min-width: 350px;
      max-width: 400px;
    `;
    document.body.appendChild(this.progressToast);
  }

  this.progressToast.innerHTML = `
    <div style="margin-bottom: 10px; color: #333; font-weight: 500;">
      ${message}
    </div>
    <div style="background: #e0e0e0; border-radius: 10px; height: 20px; overflow: hidden;">
      <div style="
        background: linear-gradient(90deg, #4CAF50, #45a049);
        height: 100%;
        width: ${progress}%;
        transition: width 0.3s ease;
        border-radius: 10px;
      "></div>
    </div>
    <div style="text-align: right; margin-top: 5px; color: #666; font-size: 12px;">
      ${Math.round(progress)}%
    </div>
  `;
}

// ✅ Ocultar toast de progreso
private hideProgressToast(): void {
  if (this.progressToast) {
    setTimeout(() => {
      if (this.progressToast) {
        document.body.removeChild(this.progressToast);
        this.progressToast = null;
      }
    }, 1000);
  }
}

// ✅ Cargar imagen con compresión y cache
private async loadImageOptimized(url: string): Promise<string | null> {
  if (this.imageCache.has(url)) return this.imageCache.get(url)!;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 800;
      let w = img.width, h = img.height;
      if (w > h) { if (w > max) { h = (h * max) / w; w = max; } }
      else { if (h > max) { w = (w * max) / h; h = max; } }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, w, h);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      this.imageCache.set(url, base64);
      resolve(base64);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async downloadExcelWithRealImages(): Promise<void> {
  await this.downloadExcelWithRealImagesCore(99999); // todas las imágenes
}

// ✅ Llamadas desde los botones de límite
async downloadExcelWithImagesLimited20(): Promise<void> {
  await this.downloadExcelWithRealImagesCore(20);
}

async downloadExcelWithImagesLimited100(): Promise<void> {
  await this.downloadExcelWithRealImagesCore(100);
}

async downloadExcelWithImagesLimited500(): Promise<void> {
  await this.downloadExcelWithRealImagesCore(500);
}

async downloadExcelWithImagesLimited(maxImages: number): Promise<void> {
  await this.downloadExcelWithRealImagesCore(maxImages);
}

private async downloadExcelWithRealImagesCore(maxImages: number = 99999): Promise<void> {
  if (this.isDownloading) {
    this.showToast('Ya hay una descarga en progreso', '#FF9800');
    return;
  }

  const totalRows = this.filteredData.length;

  if (totalRows > maxImages) {
    const confirmed = confirm(
      `Hay ${totalRows} códigos en total.\n\n` +
      `Se descargarán las primeras ${maxImages} filas con su imagen principal.\n\n` +
      `¿Continuar?`
    );
    if (!confirmed) return;
  }

  this.isDownloading = true;
  this.showProgressToast('Iniciando Excel con imágenes...', 0);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Partespendientes');

  ws.columns = [
    { header: 'Código', key: 'codigo', width: 18 },
    { header: 'Nombre', key: 'nombre', width: 28 },
    { header: 'Descripción', key: 'descripcion', width: 35 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'Observaciones', key: 'observaciones', width: 30 },
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Modelo', key: 'modelo', width: 18 },
    { header: 'Categoría', key: 'categoria', width: 15 },
    { header: 'Imagen', key: 'imagen', width: 50 }
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // ✅ Exportar solo las primeras N filas (códigos)
  const rowsToExport = this.filteredData.slice(0, maxImages);

  rowsToExport.forEach((item, idx) => {
    const rowNum = idx + 2;
    ws.addRow({
      codigo: item.codigo || '',
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      cantidad: item.cantidad || 0,
      observaciones: item.observacion || '',
      fecha: item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : '',
      estado: item.revisado || '',
      modelo: item.modelo || '',
      categoria: item.categoria?.codigo || ''
    });

    const row = ws.getRow(rowNum);
    row.height = 160;
  });

  // ✅ Recolectar imágenes de esas N filas
  const urls: { row: number; url: string }[] = [];
  rowsToExport.forEach((item, idx) => {
    if (item.imagenes?.[0]) {
      urls.push({ row: idx + 2, url: this.getImageUrl(item.imagenes[0]) });
    }
  });

  this.showProgressToast(`Descargando ${urls.length} imágenes...`, 10);

  const base64Map = new Map<number, string>();
  let ok = 0, fail = 0;

  for (let i = 0; i < urls.length; i++) {
    const { row, url } = urls[i];
    const base64 = await this.loadImageOptimized(url);
    if (base64) {
      base64Map.set(row, base64);
      ok++;
    } else {
      fail++;
    }
    const progress = 10 + ((i + 1) / urls.length) * 70;
    this.showProgressToast(`Imágenes ok:${ok}  fail:${fail}`, progress);
  }

  let pasted = 0;
  base64Map.forEach((base64, rowNum) => {
    try {
      const imgId = workbook.addImage({ base64, extension: 'jpeg' });
      ws.addImage(imgId, {
        tl: { col: 9, row: rowNum - 1 },
        ext: { width: 200, height: 150 },
        editAs: 'absolute'
      });
      pasted++;
    } catch (e) {
      console.error(`Error pegando imagen fila ${rowNum}`, e);
    }
  });

  for (let r = 2; r <= rowsToExport.length + 1; r++) {
    if (!base64Map.has(r)) {
      ws.getCell(r, 10).value = 'Sin imagen / error CORS';
      ws.getCell(r, 10).alignment = { vertical: 'middle', horizontal: 'center' };
    }
  }

  this.showProgressToast('Generando archivo...', 95);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, `PartesPendientes_${rowsToExport.length}_registros_${new Date().toISOString().split('T')[0]}.xlsx`);

  this.showProgressToast('¡Listo!', 100);
  setTimeout(() => {
    this.showToast(
      `✓ Excel con imágenes: ${rowsToExport.length} filas, ${pasted} fotos insertadas, ${fail} fallidas`,
      '#4CAF50'
    );
  }, 500);

  this.isDownloading = false;
  this.hideProgressToast();
}

private async downloadExcelWithRealImagesCore1(maxImages: number = 99999): Promise<void> {
  if (this.isDownloading) return;
  this.isDownloading = true;
  this.showProgressToast('Iniciando Excel con imágenes...', 0);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('PáginaActual');

  ws.columns = [
    { header: 'Código', key: 'codigo', width: 18 },
    { header: 'Nombre', key: 'nombre', width: 28 },
    { header: 'Descripción', key: 'descripcion', width: 35 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'Observaciones', key: 'observaciones', width: 30 },
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Modelo', key: 'modelo', width: 18 },
    { header: 'Categoría', key: 'categoria', width: 15 },
    { header: 'Imagen', key: 'imagen', width: 50 } // ✅ más ancho
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // ✅ Solo exportar la página actual (this.lista)
  this.lista.forEach((item, idx) => {
    const rowNum = idx + 2;
    ws.addRow({
      codigo: item.codigo || '',
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      cantidad: item.cantidad || 0,
      observaciones: item.observacion || '',
      fecha: item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : '',
      estado: item.revisado || '',
      modelo: item.modelo || '',
      categoria: item.categoria?.codigo || ''
    });

    // ✅ Aumentar alto de fila
    const row = ws.getRow(rowNum);
    row.height = 160;
  });

  // ✅ Recolectar URLs de imágenes
  const urls: { row: number; url: string }[] = [];
  this.lista.forEach((item, idx) => {
    if (item.imagenes?.[0]) {
      urls.push({ row: idx + 2, url: this.getImageUrl(item.imagenes[0]) });
    }
  });

  this.showProgressToast(`Descargando ${urls.length} imágenes...`, 10);

  // ✅ Cargar imágenes con progreso
  const base64Map = new Map<number, string>();
  let ok = 0, fail = 0;

  for (let i = 0; i < urls.length; i++) {
    const { row, url } = urls[i];
    const base64 = await this.loadImageOptimized(url);
    if (base64) {
      base64Map.set(row, base64);
      ok++;
    } else {
      fail++;
    }
    const progress = 10 + ((i + 1) / urls.length) * 70;
    this.showProgressToast(`Imágenes ok:${ok}  fail:${fail}`, progress);
  }

  // ✅ Insertar imágenes en Excel (sin deformar)
  let pasted = 0;
  base64Map.forEach((base64, rowNum) => {
    try {
      const imgId = workbook.addImage({ base64, extension: 'jpeg' });
      ws.addImage(imgId, {
        tl: { col: 9, row: rowNum - 1 },
        ext: { width: 200, height: 150 },
        editAs: 'absolute' // ✅ se saldrá si hace falta, no se comprime
      });
      pasted++;
    } catch (e) {
      console.error(`Error pegando imagen fila ${rowNum}`, e);
    }
  });

  // ✅ Marcar filas sin imagen
  for (let r = 2; r <= this.lista.length + 1; r++) {
    if (!base64Map.has(r)) {
      ws.getCell(r, 10).value = 'Sin imagen / error CORS';
      ws.getCell(r, 10).alignment = { vertical: 'middle', horizontal: 'center' };
    }
  }

  this.showProgressToast('Generando archivo...', 95);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, `Pedidos_Imagenes_${new Date().toISOString().split('T')[0]}.xlsx`);

  this.showProgressToast('¡Listo!', 100);
  setTimeout(() => {
    this.showToast(
      `✓ Excel con imágenes: ${this.lista.length} filas, ${pasted} fotos insertadas, ${fail} fallidas`,
      '#4CAF50'
    );
  }, 500);

  this.isDownloading = false;
  this.hideProgressToast();
}
}