import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../models/usuario';
import { AuthService } from '../services/auth.service';
import { PedidobodegaService } from '../services/pedidobodega.service';
import { ReloadService } from '../services/reload.service';
import * as XLSX from 'xlsx';
import { Workbook } from 'exceljs';
import * as ExcelJS from 'exceljs';



@Component({
  selector: 'app-laboratoriorev',
  templateUrl: './laboratoriorev.component.html',
  styleUrls: ['./laboratoriorev.component.css']
})
export class LaboratoriorevComponent implements OnInit, OnDestroy  {
  estadisticasGenerales: any = {
  total_carros: 0,
  total_partes_revisadas: 0,
  total_partes_pendientes: 0,
  total_partes: 0
};
estadisticasPorLinea: any[] = [];
lineas: any[] = [];

lineaSeleccionada: number = 0;
mostrarEstadisticasLinea: boolean = false;
hoveredRowIndex: number = -1;

// Estadísticas calculadas del frontend
showLineStats: boolean = false;
lineStats: any[] = [];
categoryStats: any[] = [];
modelStats: any[] = [];
showCategoryStats: boolean = false;
showModelStats: boolean = false;
rolusuario: any;

  stats = {
    totalImportaciones: 0,
    enTransito: 0,
    pendientesLiquidacion: 0,
    tiempoPromedio: 28
  };

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 0;
  lista: any[] = []; // Datos mostrados en la vista
  allData: any[] = []; // Todos los datos sin filtrar
  filteredData: any[] = []; // Datos filtrados 
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;
  private subscription = new Subscription();

  // Date filter variables
  startDate: string = '';
  endDate: string = '';
  filtersApplied: boolean = false; // Flag to track if filters are applied

  selectedImageUrl: string = '';
  isModalOpen: boolean = false;
  totalItems: number = 0;
  estadoActivo: string = '';

  isDownloading = false;
downloadProgress = 0;
downloadMessage = '';
private imageCache = new Map<string, string>();
private progressToast: HTMLDivElement | null = null;
private searchTimeout: any;

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
      this.rolusuario = this.usuario.rol;
      console.log(this.id);
      if(this.rolusuario === 'admin' || this.rolusuario === 'laboratorio1' || this.rolusuario === 'laboratorio2'|| this.rolusuario === 'bodegaimpor'){
          this.loadimportaciones(); 
          this.cargarEstadisticasGenerales();
      this.cargarLineas();
      this.cargarEstadisticasPorLinea();
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
      
      // Cargar datos y estadísticas (NUEVO)
     // this.loadimportaciones();
      
    }
  });

  this.subscription.add(
    this.reloadService.reload$.subscribe(() => {
      this.loadimportaciones();
      this.cargarEstadisticasGenerales(); // NUEVO
    })
  );

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  this.startDate = this.formatDateForInput(firstDayOfMonth);
  this.endDate = this.formatDateForInput(lastDayOfMonth);
}

  // Método para abrir la modal de imagen
  openImageModal(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  // Método para cerrar la modal de imagen
  closeImageModal(): void {
    this.isModalOpen = false;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

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
  if (idLinea === 0) {
    // Si selecciona "Todas las líneas", cargar todas
    this.cargarEstadisticasPorLinea();
  } else {
    // Si selecciona una línea específica
    this.tutorialService.getEstadisticasDeLinea(idLinea).subscribe({
      next: (data) => {
        console.log(`Estadísticas de línea ${idLinea}:`, data);
        // Reemplazar las estadísticas con solo la línea seleccionada
        this.estadisticasPorLinea = [data];
      },
      error: (err) => console.error('Error al cargar estadísticas de línea:', err)
    });
  }
}

toggleEstadisticasLinea() {
  this.mostrarEstadisticasLinea = !this.mostrarEstadisticasLinea;
}

onRowHover(index: number, isHovering: boolean) {
  this.hoveredRowIndex = isHovering ? index : -1;
}

getRowBackground(index: number): string {
  if (this.hoveredRowIndex === index) {
    return '#e3f2fd';
  }
  return index % 2 === 0 ? '#f9f9f9' : 'white';
}

// 4. AGREGAR métodos para estadísticas calculadas del frontend:

toggleLineStats(): void {
  this.showLineStats = !this.showLineStats;
  if (this.showLineStats) {
    this.calculateLineStats();
  }
}

toggleCategoryStats(): void {
  this.showCategoryStats = !this.showCategoryStats;
  if (this.showCategoryStats) {
    this.calculateCategoryStats();
  }
}

toggleModelStats(): void {
  this.showModelStats = !this.showModelStats;
  if (this.showModelStats) {
    this.calculateModelStats();
  }
}

calculateLineStats(): void {
  const statsMap = new Map<string, any>();
  
  this.filteredData.forEach(item => {
    const chasisCodigo = item.chasis?.codigo || 'Sin Línea';
    
    if (!statsMap.has(chasisCodigo)) {
      statsMap.set(chasisCodigo, {
        chasis: chasisCodigo,
        total: 0,
        totalCantidad: 0,
        modelos: new Set(),
        categorias: new Set(),
        codigos: new Set()
      });
    }
    
    const stats = statsMap.get(chasisCodigo);
    stats.total++;
    stats.totalCantidad += parseInt(item.cantidad) || 0;
    if (item.modelo?.codigo) stats.modelos.add(item.modelo.codigo);
    if (item.categoria?.codigo) stats.categorias.add(item.categoria.codigo);
    if (item.codigo) stats.codigos.add(item.codigo);
  });
  
  this.lineStats = Array.from(statsMap.values()).map(stat => ({
    chasis: stat.chasis,
    total: stat.total,
    totalCantidad: stat.totalCantidad,
    modelos: stat.modelos.size,
    categorias: stat.categorias.size,
    codigos: stat.codigos.size,
    porcentaje: ((stat.total / this.filteredData.length) * 100).toFixed(1)
  })).sort((a, b) => b.total - a.total);
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
        chasis: new Set()
      });
    }
    
    const stats = statsMap.get(categoria);
    stats.total++;
    stats.totalCantidad += parseInt(item.cantidad) || 0;
    if (item.modelo?.codigo) stats.modelos.add(item.modelo.codigo);
    if (item.chasis?.codigo) stats.chasis.add(item.chasis.codigo);
  });
  
  this.categoryStats = Array.from(statsMap.values()).map(stat => ({
    categoria: stat.categoria,
    total: stat.total,
    totalCantidad: stat.totalCantidad,
    modelos: stat.modelos.size,
    chasis: stat.chasis.size,
    porcentaje: ((stat.total / this.filteredData.length) * 100).toFixed(1)
  })).sort((a, b) => b.total - a.total);
}

calculateModelStats(): void {
  const statsMap = new Map<string, any>();
  
  this.filteredData.forEach(item => {
    const modelo = item.modelo?.codigo || 'Sin Modelo';
    
    if (!statsMap.has(modelo)) {
      statsMap.set(modelo, {
        modelo: modelo,
        total: 0,
        totalCantidad: 0,
        categorias: new Set(),
        chasis: new Set()
      });
    }
    
    const stats = statsMap.get(modelo);
    stats.total++;
    stats.totalCantidad += parseInt(item.cantidad) || 0;
    if (item.categoria?.codigo) stats.categorias.add(item.categoria.codigo);
    if (item.chasis?.codigo) stats.chasis.add(item.chasis.codigo);
  });
  
  this.modelStats = Array.from(statsMap.values()).map(stat => ({
    modelo: stat.modelo,
    total: stat.total,
    totalCantidad: stat.totalCantidad,
    categorias: stat.categorias.size,
    chasis: stat.chasis.size,
    porcentaje: ((stat.total / this.filteredData.length) * 100).toFixed(1)
  })).sort((a, b) => b.total - a.total);
}
  
  loadimportaciones() {
    this.loading = true;
    this.tutorialService.laboratoriorev().subscribe({
      next: (data: any) => {
        console.log('Total registros cargados:', data.length);
        
        this.allData = data;
        
        // Show all data by default when first loading
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
    this.tutorialService.laboratoriorevcat(id).subscribe({
      next: (data: any) => {
        console.log('Total registros cargados:', data.length);
        
        this.allData = data;
        
        // Show all data by default when first loading
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
  
  // Actualiza los datos mostrados después de aplicar filtros
  updateDisplayedData() {
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    // Asegurar que la página actual sea válida
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
    
    // Calcular los índices para la paginación
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.totalItems);
    
    // Actualizar la lista que se muestra en la vista
    this.lista = this.filteredData.slice(startIndex, endIndex);
    console.log(this.lista);
    
    console.log(`Mostrando ${this.lista.length} registros (de ${this.totalItems} filtrados)`);
  }
  
  calculateStats(): void {
  // Calcular estadísticas del frontend
  const totalCantidad = this.filteredData.reduce((sum, item) => 
    sum + (parseInt(item.cantidad) || 0), 0);
  
  const uniqueModelos = new Set(this.filteredData.map(item => 
    item.modelo?.codigo).filter(Boolean)).size;
  
  const uniqueCategorias = new Set(this.filteredData.map(item => 
    item.categoria?.codigo).filter(Boolean)).size;

  // Usar estadísticas del backend si están disponibles
  this.stats = {
    totalImportaciones: this.estadisticasGenerales.total_partes || this.allData.length,
    enTransito: totalCantidad,
    pendientesLiquidacion: uniqueModelos,
    tiempoPromedio: uniqueCategorias
  };
  
  console.log('Estadísticas calculadas:', this.stats);
}

  // Método para actualizar el estado de un pedido
 actualizarEstado(item: any): void {
  console.log(`Actualizando estado: ${item.codigo} - ${item.estado}`);
  
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
  
  console.log("Enviando objeto:", JSON.stringify(pedidoActualizado));
  
  this.tutorialService.actualizarEstadoPedido(item.id_pedido, pedidoActualizado).subscribe({
    next: () => {
      const toast = document.createElement('div');
      toast.innerText = "Pedido actualizado exitosamente";
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
      
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 3000);
      
      // Actualizar datos y estadísticas
      this.loadimportaciones();
      this.cargarEstadisticasGenerales(); // NUEVO
      console.log("Estado actualizado");
    },
    error: (err) => {
      const toast = document.createElement('div');
      toast.innerText = `Error al actualizar pedido: ${err.error?.message || 'Error desconocido'}`;
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
      
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 3000);
      
      console.error("Error al actualizar estado", err);
      console.error("Cuerpo de la respuesta:", err.error);
    }
  });
}

  getImageUrl(relativePath: string): string {
    // Convert backslashes to forward slashes for web URLs
    const formattedPath = relativePath.replace(/\\/g, '/');
    
    // Combine with your API base URL
    return `https://bodega.vehicentro.com:1830/api/api/${formattedPath}`;
  }
  
  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateDisplayedData();
  }

  // Helper method to format date for input fields
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Aplicar filtro por fechas
  applyDateFilter() {
    this.filtersApplied = true;
    
    if (!this.startDate || !this.endDate) {
      this.filteredData = [...this.allData];
    } else {
      const start = new Date(this.startDate);
      // Set to end of day for the end date
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);

      this.filteredData = this.allData.filter(item => {
        const itemDate = new Date(item.fecha);
        return itemDate >= start && itemDate <= end;
      });
    }
    
    // Si también hay un término de búsqueda, aplicar ese filtro
    if (this.searchTerm.trim() !== '') {
      this.applySearchFilter();
    } else {
      this.currentPage = 1; // Reset to first page when filter is applied
      this.updateDisplayedData();
    }
  }

  // Aplicar filtro por término de búsqueda
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

  const tempFiltered = this.filteredData.filter(item => {
    const codigoMatch = item.codigo?.toLowerCase().includes(searchTermLower);
    const nombreMatch = item.nombre?.toLowerCase().includes(searchTermLower);
    const descripcionMatch = item.descripcion?.toLowerCase().includes(searchTermLower);
    const observacionMatch = item.observacion?.toLowerCase().includes(searchTermLower);

    const categoriaMatch = item.categoria?.codigo?.toLowerCase().includes(searchTermLower);
    const modeloMatch = item.modelo?.codigo?.toLowerCase().includes(searchTermLower);
    const chasisMatch = item.chasis?.codigo?.toLowerCase().includes(searchTermLower);

    return codigoMatch || nombreMatch || descripcionMatch || observacionMatch || categoriaMatch || modeloMatch || chasisMatch;
  });

  this.filteredData = tempFiltered;
  this.currentPage = 1;
  this.updateDisplayedData();
}

  // Buscar importaciones
 searchImports(): void {
  if (this.searchTimeout) {
    clearTimeout(this.searchTimeout);
  }

  this.searchTimeout = setTimeout(() => {
    this.filtersApplied = true;
    this.applySearchFilter();
  }, 300);
}

  // Resetear filtro de fechas
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
    // Show a more advanced filter modal/dialog
    console.log('Filtrar datos');
  }

  pendiente() {
    this.estadoActivo = 'pendiente';
    this.router.navigate(['/laboratorio']);
  }
  revisado() {
    this.estadoActivo = 'revisado';
    this.router.navigate(['/laboratoriorev']);
  }
  
  vehis() {
    this.estadoActivo = 'vehiculos';
    this.router.navigate(['/laboratoriovehi']);
  }

  showExportMenu: boolean = false;

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }
  
  getPaginationArray(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    
    if (totalPages <= 5) {
      // Mostrar todas las páginas si son 5 o menos
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // Lógica para mostrar páginas con elipsis
      const pages: number[] = [];
      
      // Siempre mostrar la primera página
      pages.push(1);
      
      // Añadir elipsis si el inicio está lejos
      if (currentPage > 3) {
        pages.push(-1); // -1 representa elipsis
      }
      
      // Añadir páginas alrededor de la actual
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      
      // Añadir elipsis si el final está lejos
      if (currentPage < totalPages - 2) {
        pages.push(-1); // -1 representa elipsis
      }
      
      // Siempre mostrar la última página
      if (totalPages > 1) {
        pages.push(totalPages);
      }
      
      return pages;
    }
  }

  downloadExcel(): void {
  const dataToExport = this.filteredData.map(item => ({
    'Código': item.codigo,
    'Nombre': item.nombre,
    'Descripción': item.descripcion,
    'Cantidad': item.cantidad,
    'Modelo': item.modelo?.codigo || '',
    'Chasis': item.chasis?.codigo || '',
    'Categoría': item.categoria?.codigo || '',
    'Motor': item.motor?.codigo || '',
    'Diferencial': item.diferencial?.codigo || '',
    'Frontal': item.frontal?.codigo || '',
    'Observaciones': item.observacion || '',
    'Fecha': item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : '-',
    'Estado': item.revisado === 'revisado' ? 'REVISADO' : item.revisado
  }));

  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos Revisados');

  const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Pedidos_Revisados_${new Date().toISOString().split('T')[0]}.xlsx`);
}

 downloadCSV(): void {
  let csvContent = 'Código,Descripción,Cantidad,Observaciones,Fecha,Estado,Modelo,Chasis,Categoría,Motor,Diferencial,Frontal\n';

  this.filteredData.forEach(item => {
    const row = [
      item.codigo,
      item.descripcion,
      item.cantidad,
      item.observacion || '-',
      item.fecha ? new Date(item.fecha).toLocaleDateString() : '-',
      item.revisado === 'revisado' ? 'REVISADO' : item.revisado || '-',
      item.modelo?.codigo || '',
      item.chasis?.codigo || '',
      item.categoria?.codigo || '',
      item.motor?.codigo || '',
      item.diferencial?.codigo || '',
      item.frontal?.codigo || ''
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');

    csvContent += row + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `Pedidos_Revisados_${new Date().toISOString().split('T')[0]}.csv`);
}

  isGeneratingExcel: boolean = false;
async downloadExcel1(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Pedidos con Imagen');

  const headers = [
    { header: 'Codigo', key: 'codigo', width: 15 },
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Descripcion', key: 'descripcion', width: 40 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'Modelo', key: 'modelo', width: 20 },
    { header: 'Chasis', key: 'chasis', width: 20 },
    { header: 'Categoria', key: 'categoria', width: 20 },
    { header: 'Observaciones', key: 'observaciones', width: 30 },
    { header: 'Fecha', key: 'fecha', width: 15 },
    { header: 'Estado', key: 'estado', width: 15 },
    { header: 'Imagen', key: 'imagen', width: 20 }
  ];

  worksheet.columns = headers;

  // Agregar loading indicator
  const loadingToast = this.showLoadingToast('Generando Excel con imágenes...');

  try {
    // Procesar cada item de forma secuencial para evitar sobrecarga
    for (let i = 0; i < this.filteredData.length; i++) {
      const item = this.filteredData[i];
      
      const rowData = {
        codigo: item.codigo,
        nombre: item.nombre,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        modelo: item.modelo?.codigo || '',
        chasis: item.chasis?.codigo || '',
        categoria: item.categoria?.codigo || '',
        observaciones: item.observacion || '',
        fecha: item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : '-',
        estado: item.revisado === 'revisado' ? 'REVISADO' : item.revisado || '',
        imagen: ''
      };

      const newRow = worksheet.addRow(rowData);

      // Verificar si hay imágenes - usar la propiedad correcta basada en el HTML
      if (item.imagenes && item.imagenes.length > 0) {
        const firstImageRelativePath = item.imagenes[0];
        
        if (firstImageRelativePath && firstImageRelativePath !== null) {
          try {
            const imageUrl = this.getImageUrl(firstImageRelativePath);
            console.log('Procesando imagen:', imageUrl); // Para debug
            
            const base64String = await this.getBase64ImageFromUrl(imageUrl);

            if (base64String) {
              // Determinar la extensión correcta de la imagen
              const extension = this.getImageExtension(firstImageRelativePath);
              
              const imageId = workbook.addImage({
                base64: base64String.split(',')[1], // Remover el prefijo data:image/...;base64,
                extension: extension,
              });

              // Ajustar el tamaño de la fila para acomodar la imagen
              newRow.height = 80;

              // Añadir la imagen a la celda (columna K = index 10)
              worksheet.addImage(imageId, {
                tl: { col: 10, row: newRow.number - 1 },
                ext: { width: 80, height: 80 },
                editAs: 'oneCell'
              });
            } else {
              console.log(`Imagen no disponible para el código ${item.codigo}`);
              // Opcionalmente, agregar texto indicando que no hay imagen
              newRow.getCell(11).value = 'Imagen no disponible';
            }
          } catch (error) {
            console.warn(`No se pudo procesar la imagen para el código ${item.codigo}:`, error);
            // Agregar texto indicando error con la imagen
            newRow.getCell(11).value = 'Error al cargar imagen';
          }
        } else {
          // Si no hay imagen, agregar texto indicativo
          newRow.getCell(11).value = 'Sin imagen';
        }
      }
    }

    this.hideLoadingToast(loadingToast);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Pedidos_Revisados_con_Imagenes_${new Date().toISOString().split('T')[0]}.xlsx`);

    this.showSuccessToast('Excel con imágenes generado exitosamente');

  } catch (error) {
    this.hideLoadingToast(loadingToast);
    this.showErrorToast('Error al generar el Excel con imágenes');
    console.error('Error en downloadExcel1:', error);
  }
}

private async getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  try {
    console.log('Intentando cargar imagen:', imageUrl);
    
    const response = await fetch(imageUrl, {
      mode: 'cors',
      headers: {
        'Accept': 'image/*',
      },
      // Agregar timeout
      signal: AbortSignal.timeout(10000) // 10 segundos timeout
    });
    
    if (!response.ok) {
      console.warn(`Imagen no encontrada (${response.status}): ${imageUrl}`);
      return null; // Retornar null en lugar de lanzar error
    }
    
    const blob = await response.blob();
    
    // Verificar que el blob sea realmente una imagen
    if (!blob.type.startsWith('image/')) {
      console.warn(`El archivo no es una imagen válida: ${imageUrl}`);
      return null;
    }

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result) {
          resolve(result);
        } else {
          reject(new Error('No se pudo leer la imagen'));
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Error al obtener la imagen:', imageUrl, error);
    return null; // Retornar null en lugar de lanzar error
  }
}

private getImageExtension(imagePath: string): 'jpeg' | 'png' | 'gif' {
  const extension = imagePath.split('.').pop()?.toLowerCase();
  
  // Mapear extensiones a formatos válidos de ExcelJS
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'jpeg';
    case 'png':
      return 'png';
    case 'gif':
      return 'gif';
    default:
      return 'png'; // Default a PNG si no se puede determinar
  }
}

// Métodos auxiliares para mostrar notificaciones de carga
private showLoadingToast(message: string): HTMLElement {
  const toast = document.createElement('div');
  toast.className = 'notificacion info visible';
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 20px; height: 20px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      ${message}
    </div>
  `;
  
  // Agregar animación de carga si no existe
  if (!document.querySelector('#loading-animation-style')) {
    const style = document.createElement('style');
    style.id = 'loading-animation-style';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  return toast;
}

private hideLoadingToast(toast: HTMLElement): void {
  if (toast && toast.parentNode) {
    toast.classList.remove('visible');
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }
}

private showSuccessToast(message: string): void {
  const toast = document.createElement('div');
  toast.className = 'notificacion success visible';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

private showErrorToast(message: string): void {
  const toast = document.createElement('div');
  toast.className = 'notificacion error visible';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 5000);
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

async downloadExcelWithRealImages(limit: number = 99999): Promise<void> {
  if (this.isDownloading) return;
  this.isDownloading = true;

  const rowsToExport = this.filteredData.slice(0, limit);
  this.showProgressToast(`Preparando ${rowsToExport.length} filas con imágenes...`, 0);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('PedidosRevisados');

  ws.columns = [
    { header: 'Código', key: 'codigo', width: 18 },
    { header: 'Nombre', key: 'nombre', width: 28 },
    { header: 'Descripción', key: 'descripcion', width: 35 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'Modelo', key: 'modelo', width: 18 },
    { header: 'Chasis', key: 'chasis', width: 18 },
    { header: 'Categoría', key: 'categoria', width: 15 },
    { header: 'Motor', key: 'motor', width: 18 },
    { header: 'Diferencial', key: 'diferencial', width: 18 },
    { header: 'Frontal', key: 'frontal', width: 18 },
    { header: 'Observaciones', key: 'observaciones', width: 30 },
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Imagen', key: 'imagen', width: 50 }
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // Agregar filas
  rowsToExport.forEach((item, idx) => {
    ws.addRow({
      codigo: item.codigo || '',
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      cantidad: item.cantidad || 0,
      modelo: item.modelo?.codigo || '',
      chasis: item.chasis?.codigo || '',
      categoria: item.categoria?.codigo || '',
      motor: item.motor?.codigo || '',
      diferencial: item.diferencial?.codigo || '',
      frontal: item.frontal?.codigo || '',
      observaciones: item.observacion || '',
      fecha: item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : '',
      estado: item.revisado === 'revisado' ? 'REVISADO' : item.revisado || ''
    });

    const row = ws.getRow(idx + 2);
    row.height = 160;
  });

  // Procesar imágenes (ya tienes este código)
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
        tl: { col: 13, row: rowNum - 1 },
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
      ws.getCell(r, 14).value = 'Sin imagen / error CORS';
      ws.getCell(r, 14).alignment = { vertical: 'middle', horizontal: 'center' };
    }
  }

  this.showProgressToast('Generando archivo...', 95);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, `PedidosRevisados_${rowsToExport.length}_registros_${new Date().toISOString().split('T')[0]}.xlsx`);

  this.showToast(
    `Excel con imágenes: ${rowsToExport.length} filas, ${pasted} fotos insertadas, ${fail} fallidas`,
    'success'
  );

  this.isDownloading = false;
  this.hideProgressToast();
}

private showToast(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
  const toast = document.createElement('div');
  toast.className = `toast-custom toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  // Auto-eliminar con animación
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => {
      if (toast.parentNode) document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

clearImageCache(): void {
  this.imageCache.clear();
  this.showToast('✅ Caché de imágenes limpiada correctamente', 'success');
}

downloadExcelWithImageLinks(): void {
  this.showToast('Generando Excel con links...', 'info');

  const dataToExport = this.filteredData.map(item => {
    const imageLinks = item.imagenes?.[0]
      ? this.getImageUrl(item.imagenes[0])
      : 'Sin imagen';

    return {
      Código: item.codigo || '',
      Nombre: item.nombre || '',
      Descripción: item.descripcion || '',
      Cantidad: item.cantidad || 0,
      Modelo: item.modelo?.codigo || '',
      Chasis: item.chasis?.codigo || '',
      Categoría: item.categoria?.codigo || '',
      Motor: item.motor?.codigo || '',
      Diferencial: item.diferencial?.codigo || '',
      Frontal: item.frontal?.codigo || '',
      Observaciones: item.observacion || '',
      Fecha: item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : '',
      Estado: item.revisado === 'revisado' ? 'REVISADO' : item.revisado || '',
      'Link Imagen': imageLinks
    };
  });

  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
  worksheet['!cols'] = [
    { wch: 15 }, { wch: 25 }, { wch: 35 }, { wch: 10 },
    { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 12 },
    { wch: 12 }, { wch: 50 }
  ];

  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos Revisados');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  saveAs(blob, `Pedidos_Revisados_Links_${new Date().toISOString().split('T')[0]}.xlsx`);
  this.showToast('Excel con links generado exitosamente (Instantáneo)', 'success');
}

}