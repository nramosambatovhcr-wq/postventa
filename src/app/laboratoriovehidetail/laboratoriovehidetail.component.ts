import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import saveAs from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../models/usuario';
import { AuthService } from '../services/auth.service';
import { PedidobodegaService } from '../services/pedidobodega.service';
import { ReloadService } from '../services/reload.service';
import * as XLSX from 'xlsx';
import { Workbook } from 'exceljs';
import * as ExcelJS from 'exceljs';

@Component({
  selector: 'app-laboratoriovehidetail',
  templateUrl: './laboratoriovehidetail.component.html',
  styleUrls: ['./laboratoriovehidetail.component.css']
})
export class LaboratoriovehidetailComponent implements OnInit, OnDestroy  {
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
idvehi=0;
  // Date filter variables
  startDate: string = '';
  endDate: string = '';
  filtersApplied: boolean = false; // Flag to track if filters are applied

  selectedImageUrl: string = '';
  isModalOpen: boolean = false;
  totalItems: number = 0;
  usuariorol:any;

  isDownloading = false;
downloadProgress = 0;
downloadMessage = '';

  constructor(
    private router: Router, 
    private tutorialService: PedidobodegaService, 
    private reloadService: ReloadService, 
    private authService: AuthService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
     const item = this.route.snapshot.params['id'];
     this,this.idvehi=item;
     console.log(item);
     
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id = this.usuario.id;
        this.usuariorol=this.usuario.rol;
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

  // Método para abrir la modal de imagen
  openImageModal(imagePath: string): void {
  // Usa la misma lógica que en laboratorio
  this.selectedImageUrl = this.getFullImageUrl(imagePath);
  this.isModalOpen = true;
}

// Agrega este helper (copia exacta del laboratorio)
getFullImageUrl(relativePath: string): string {
  const filename = relativePath.split(/[\\/]/).pop();
  return `https://bodega.vehicentro.com:1830/api/api/Laboratorio/images/${filename}`;
}

  // Método para cerrar la modal de imagen
  closeImageModal(): void {
    this.isModalOpen = false;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  
  loadimportaciones() {
    this.loading = true;
    this.tutorialService.laboratoriovehiall(this.idvehi).subscribe({
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
    this.stats = {
      totalImportaciones: this.allData.length,
      enTransito: this.allData.filter(item => item.estado === 'Revisado').length,
      pendientesLiquidacion: this.allData.filter(item => item.liquidacion === 'Pendiente').length,
      tiempoPromedio: 28
    };
    console.log('Estadísticas calculadas:', this.stats);
  }

  // Método para actualizar el estado de un pedido
actualizarEstado(item: any): void {
  console.log(item);

  console.log(`Actualizando estado: ${item.codigo} - ${item.revisado}`);

  // --- Cuerpo exacto que espera la API (C#) ---
  const pedidoActualizado = {
    Id: Number(item.id) || 0,
    Cantidad: Number(item.cantidad) || 0,
    Codigo: String(item.codigo || ""),
    Descripcion: String(item.descripcion || ""),
    Observaciones: String(item.observacion || ""),   // tu html usa [(ngModel)]="item.observacion"
    Estado: String(item.revisado || ""),
    IdUsuarioCreacion: Number(item.idUsuarioCreacion) || 0,
    IdUsuarioModificacion: Number(this.usuario?.id) || 0, // usuario logueado
    Nombre: String(item.nombre || "")
  };
  // -------------------------------------------

  console.log("Enviando objeto:", JSON.stringify(pedidoActualizado));

  this.tutorialService.actualizarEstadoLabRep(item.id, pedidoActualizado).subscribe({
    next: () => {
      // toast verde
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
      setTimeout(() => document.body.removeChild(toast), 3000);

      this.loadimportaciones();
      console.log("Estado actualizado");
    },
    error: (err) => {
      // toast rojo
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
      setTimeout(() => document.body.removeChild(toast), 3000);

      console.error("Error al actualizar estado", err);
      console.error("Cuerpo de la respuesta:", err.error);
    }
  });
}


    getImageUrl(relativePath: string, useProxy = false): string {
  const filename = relativePath.split(/[\\/]/).pop()!;
  const base = useProxy
    ? '/api/Laboratorio/images'          // <-- proxy sin CORS
    : 'https://bodega.vehicentro.com:1830/api/api/Laboratorio/images';
  return `${base}/${filename}`;
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
      // Si se limpia la búsqueda, volver a aplicar solo el filtro de fechas
      if (this.startDate && this.endDate) {
        this.applyDateFilter();
      } else {
        this.filteredData = [...this.allData];
        this.updateDisplayedData();
      }
      return;
    }
    
    // Filtrar los datos ya filtrados por fecha
    const tempFiltered = this.filteredData.filter(item => 
      (item.codigo && item.codigo.toLowerCase().includes(searchTermLower)) ||
      (item.descripcion && item.descripcion.toLowerCase().includes(searchTermLower)) ||
      (item.observaciones && item.observaciones.toLowerCase().includes(searchTermLower))
    );
    
    this.filteredData = tempFiltered;
    this.currentPage = 1; // Reset to first page when filter is applied
    this.updateDisplayedData();
  }

  // Buscar importaciones
  searchImports(): void {
    this.filtersApplied = true;
    // Primero aplicar filtro de fecha y luego el de búsqueda
   // this.applyDateFilter();
    this.applySearchFilter();
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

  revisado() {
    this.router.navigate(['/laboratoriorev']);
  }

   pendiente() {
    this.router.navigate(['/laboratorio']);
  }

   asignado() {
    this.router.navigate(['/asignarvehi']);
  }
  
  vehis() {
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
  // Crear un array para guardar los datos con el formato de la tabla
  const dataToExport = this.filteredData.map(item => {
    return {
      'Codigo': item.codigo,
      'Nombre': item.nombre,
      'Descripcion': item.descripcion,
      'Cantidad': item.cantidad,
      'Modelo': item.modelo, 
      'Categoria': item.categoriam,
      'Observaciones': item.observacion,
      'Fecha': item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : '-',
      'Estado': item.revisado === 'revisado' ? 'REVISADO' : item.revisado
    };
  });

  // Crear la hoja de trabajo a partir del nuevo array
  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
  
  // Crear el libro de trabajo y añadir la hoja
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos Revisados');
  
  // Generar y descargar el archivo
  const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(blob, `Pedidos_Revisados_${new Date().toISOString().split('T')[0]}.xlsx`);
}

  downloadCSV(): void {
    // Convert data to CSV format
    let csvContent = 'Codigo,Descripcion,Cantidad,Observacion,Fecha,Estado\n';
    
    this.filteredData.forEach(item => {
      const row = [
        item.codigo,
        item.descripcion,
        item.cantidad,
        item.observaciones || '-',
        item.fecha ? new Date(item.fecha).toLocaleDateString() : '-',
        item.estado || '-'
      ].join(',');
      csvContent += row + '\n';
    });
    
    // Create a Blob from the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    
    // Save the file
    saveAs(blob, `Pedidos_${new Date().toISOString().split('T')[0]}.csv`);
  }
   

  // Descarga y convierte una imagen de URL a Base64
  private async getBase64ImageFromUrl(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error al obtener la imagen:', error);
      return ''; // Retorna una cadena vacía en caso de error
    }
  }

  // Nueva función para descargar Excel con imágenes
  async downloadExcelWithImages1(): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pedidos con Imagen');
  
    const headers = [
      { header: 'Codigo', key: 'codigo', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Descripcion', key: 'descripcion', width: 40 },
      { header: 'Cantidad', key: 'cantidad', width: 10 },
      { header: 'Modelo', key: 'modelo', width: 20 },
      { header: 'Categoria', key: 'categoria', width: 20 },
      { header: 'Observaciones', key: 'observaciones', width: 30 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Imagen', key: 'imagen', width: 20 }
    ];
  
    worksheet.columns = headers;
  
    const rowPromises = this.filteredData.map(async (item) => {
      const rowData = {
        codigo: item.codigo,
        nombre: item.nombre,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        modelo: item.modelo,
        categoria: item.categoriam,
        observaciones: item.observacion,
        fecha: item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : '-',
        estado: item.revisado === 'revisado' ? 'REVISADO' : item.revisado,
        imagen: ''
      };
  
      const newRow = worksheet.addRow(rowData);
  
      if (item.imagenes && item.imagenes.length > 0) {
        try {
          const firstImageRelativePath = item.imagenes[0];
          const imageUrl = this.getImageUrl(firstImageRelativePath);
          const base64String = await this.getBase64ImageFromUrl(imageUrl);
  
          if (base64String) {
            const imageId = workbook.addImage({
              base64: base64String,
              extension: 'png',
            });
  
            worksheet.addImage(imageId, {
              tl: { col: 10, row: newRow.number - 1 },
              ext: { width: 100, height: 100 }
            });
          }
        } catch (error) {
          console.error(`Error al procesar la imagen para el item con codigo ${item.codigo}:`, error);
        }
      }
    });
  
    await Promise.all(rowPromises);
  
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Pedidos_Revisados_con_Imagenes_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  async downloadExcelWithImages2(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Pedidos con Imagen');

  const headers = [
    { header: 'Codigo', key: 'codigo', width: 15 },
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Descripcion', key: 'descripcion', width: 40 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'Modelo', key: 'modelo', width: 20 },
    { header: 'Categoria', key: 'categoria', width: 20 },
    { header: 'Observaciones', key: 'observaciones', width: 30 },
    { header: 'Fecha', key: 'fecha', width: 15 },
    { header: 'Estado', key: 'estado', width: 15 },
    { header: 'Imagen', key: 'imagen', width: 20 }
  ];

  worksheet.columns = headers;

  // Limitar concurrencia (ej. 5 imágenes a la vez)
  const MAX_CONCURRENT = 5;

  // Función para procesar un lote de filas con control de concurrencia
  const processWithConcurrency = async <T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    maxConcurrent: number
  ) => {
    const results: Promise<void>[] = [];
    for (let i = 0; i < items.length; i++) {
      const promise = processor(items[i]).finally(() => {
        // Cuando una termina, inicia la siguiente si hay más
      });
      results.push(promise);
      if (results.length >= maxConcurrent || i === items.length - 1) {
        await Promise.all(results.splice(0, maxConcurrent));
      }
    }
  };

  // Redimensionar imagen usando canvas
  const resizeImageToBase64 = (url: string, maxWidth = 100, maxHeight = 100): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');

        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // JPEG con compresión
      };
      img.onerror = () => resolve('');
      img.src = url;
    });
  };

  // Procesar cada fila
  await processWithConcurrency(this.filteredData, async (item) => {
    const rowData = {
      codigo: item.codigo,
      nombre: item.nombre,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      modelo: item.modelo,
      categoria: item.categoriam,
      observaciones: item.observacion,
      fecha: item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : '-',
      estado: item.revisado === 'revisado' ? 'REVISADO' : item.revisado,
      imagen: ''
    };

    const newRow = worksheet.addRow(rowData);

    if (item.imagenes?.[0]) {
      try {
        const imageUrl = this.getImageUrl(item.imagenes[0]);
        const base64 = await resizeImageToBase64(imageUrl, 100, 100);

        if (base64) {
          const imageId = workbook.addImage({
            base64,
            extension: 'jpeg', // usa jpeg para menor tamaño
          });

          worksheet.addImage(imageId, {
            tl: { col: 9, row: newRow.number - 1 }, // columna "Imagen" es la 10 (índice 9)
            ext: { width: 100, height: 100 }
          });
        }
      } catch (error) {
        console.error(`Error al procesar imagen del item ${item.codigo}:`, error);
      }
    }
  }, MAX_CONCURRENT);

  // Generar y descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, `Pedidos_Revisados_con_Imagenes_${new Date().toISOString().split('T')[0]}.xlsx`);
}


async downloadExcelWithImages(): Promise<void> {
  this.isDownloading = true;
  this.downloadProgress = 0;
  this.downloadMessage = 'Iniciando...';

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Partes con Imagen');

  worksheet.columns = [
    { header: 'Codigo', key: 'codigo', width: 15 },
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Descripcion', key: 'descripcion', width: 40 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'Modelo', key: 'modelo', width: 20 },
    { header: 'Categoria', key: 'categoria', width: 20 },
    { header: 'Observaciones', key: 'observaciones', width: 30 },
    { header: 'Fecha', key: 'fecha', width: 15 },
    { header: 'Estado', key: 'estado', width: 15 },
    { header: 'Imagen', key: 'imagen', width: 50 }
  ];

  const dataToProcess = this.filteredData;
  const total = dataToProcess.length;
  if (!total) {
    this.isDownloading = false;
    return;
  }

  const imageCache = new Map<string, string>();

  const resizeImageToBase64 = (url: string): Promise<string> =>
    new Promise((resolve) => {
      if (imageCache.has(url)) return resolve(imageCache.get(url)!);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');

        const targetWidth = 300;
        const targetHeight = 200;

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const base64 = canvas.toDataURL('image/jpeg', 0.95); // ✅ más calidad
        imageCache.set(url, base64);
        resolve(base64);
      };
      img.onerror = () => resolve('');
      img.src = url;
    });

  for (let i = 0; i < total; i++) {
    const item = dataToProcess[i];

    const rowData = {
      codigo: item.codigo,
      nombre: item.nombre,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      modelo: item.modelo,
      categoria: item.categoriam,
      observaciones: item.observacion,
      fecha: item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : '-',
      estado: item.revisado === 'revisado' ? 'REVISADO' : item.revisado,
      imagen: ''
    };

    const newRow = worksheet.addRow(rowData);

    if (item.imagenes?.[0]) {
      try {
        const imageUrl = this.getImageUrl(item.imagenes[0]);
        const base64 = await resizeImageToBase64(imageUrl);
        if (base64) {
          const imageId = workbook.addImage({ base64, extension: 'jpeg' });
          worksheet.addImage(imageId, {
            tl: { col: 9, row: newRow.number - 1 },
            ext: { width: 300, height: 200 }
          });

          // ✅ Aumentar alto de fila
          worksheet.getRow(newRow.number).height = 120;
        }
      } catch (error) {
        console.error(`Error al procesar imagen del item ${item.codigo}:`, error);
      }
    }

    this.downloadProgress = Math.round(((i + 1) / total) * 100);
    this.downloadMessage = `Procesando imagen ${i + 1} de ${total}...`;
  }

  this.downloadMessage = 'Generando archivo final...';
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, `Partes_Revisados_con_Imagenes_${new Date().toISOString().split('T')[0]}.xlsx`);

  this.isDownloading = false;
  this.downloadProgress = 0;
  this.downloadMessage = '';
}

 

/* ----------  NUEVO MÉTODO  ---------- */
saveAsSugerido(item: any): void {
  if (!this.usuario || !this.usuario.id) {
    this.showToast('Error: Usuario no logueado', '#F44336');
    return;
  }

  const pedidoRequest = {
    Codigo:        item.codigo,
    Descripcion:   item.descripcion,
    Observaciones: item.observacion || null,
    Cantidad:      item.cantidad,
    Modelo:        item.modelo        || '',
    Cliente:       item.cliente      || 'lab1',
    Ot:            item.ot           || '',
    IdUsuarioCreacion: this.usuario.id
  };

  this.tutorialService.createSugerido1(pedidoRequest).subscribe({
    next: () => {
      this.showToast('Sugerido guardado exitosamente', '#4CAF50');
    },
    error: (err) => {
      const msg = err.error?.message || 'Error desconocido';
      this.showToast(`Error al guardar sugerido: ${msg}`, '#F44336');
    }
  });
}

/* ----------  TOAST AUXILIAR  ---------- */
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
  setTimeout(() => document.body.removeChild(toast), 3000);
}

/* (resto de métodos de descarga sin cambios) ... */
private imageCache = new Map<string, string>();



clearImageCache(): void {
  this.imageCache.clear();
  this.showToast('Caché de imágenes limpiado', '#2196F3');
}

/* ----------  EXPORTACIONES RÁPIDAS  ---------- */
downloadExcelWithImageLinks(): void {
  this.showToast('Generando Excel con links...', '#2196F3');
  const dataToExport = this.filteredData.map(item => ({
    Codigo: item.codigo || '',
    Nombre: item.nombre || '',
    Descripcion: item.descripcion || '',
    Cantidad: item.cantidad || 0,
    Observaciones: item.observacion || '',
    Fecha: item.fecha ? new Date(item.fecha).toLocaleDateString() : '',
    Estado: item.revisado || '',
    Modelo: item.modelo || '',
    Categoria: item.categoriam || '',
    'Links Imágenes': item.imagenes?.map((img: string) => this.getImageUrl(img)).join(' | ') || 'Sin imagen'
  }));

  const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
  ws['!cols'] = [ { wch: 15 }, { wch: 25 }, { wch: 35 }, { wch: 10 },
                  { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
                  { wch: 15 }, { wch: 60 } ];
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
         `Pedidos_Links_${new Date().toISOString().split('T')[0]}.xlsx`);
  this.showToast('Excel generado (instantáneo)', '#4CAF50');
}

/* ----------  EXPORTACIONES CON IMÁGENES (LIMITADAS)  ---------- */
async downloadExcelWithImagesLimited20(): Promise<void> {
  await this.downloadExcelWithRealImagesCore(Math.min(20, this.lista.length));
}
async downloadExcelWithImagesLimited100(): Promise<void> {
  await this.downloadExcelWithRealImagesCore(100);
}
async downloadExcelWithImagesLimited500(): Promise<void> {
  await this.downloadExcelWithRealImagesCore(500);
}
async downloadExcelWithImagesLimited(max: number): Promise<void> {
  await this.downloadExcelWithRealImagesCore(max);
}

/* ----------  MÉTODO CORE CON PROGRESO  ---------- */
private async downloadExcelWithRealImagesCore(maxImages: number = 99999): Promise<void> {
  if (this.isDownloading) return;
  this.isDownloading = true;
  this.showProgressToast('Iniciando Excel con imágenes...', 0);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('PáginaActual');

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
      categoria: item.categoriam || ''
    });
    ws.getRow(rowNum).height = 160;
  });

  const urls: { row: number; url: string }[] = [];
  rowsToExport.forEach((item, idx) => {
    if (item.imagenes?.[0]) urls.push({ row: idx + 2, url: this.getImageUrl(item.imagenes[0]) });
  });

  this.showProgressToast(`Descargando ${urls.length} imágenes...`, 10);
  const base64Map = new Map<number, string>();
  let ok = 0, fail = 0;

  for (let i = 0; i < urls.length; i++) {
    const { row, url } = urls[i];
    const base64 = await this.loadImageOptimized(url);
    if (base64) { base64Map.set(row, base64); ok++; } else fail++;
    const progress = 10 + ((i + 1) / urls.length) * 70;
    this.showProgressToast(`Imágenes ok:${ok}  fail:${fail}`, progress);
  }

  let pasted = 0;
  base64Map.forEach((base64, rowNum) => {
    try {
      const imgId = wb.addImage({ base64, extension: 'jpeg' });
      ws.addImage(imgId, { tl: { col: 9, row: rowNum - 1 }, ext: { width: 200, height: 150 }, editAs: 'absolute' });
      pasted++;
    } catch (e) { console.error(`Error pegando imagen fila ${rowNum}`, e); }
  });

  for (let r = 2; r <= rowsToExport.length + 1; r++) {
    if (!base64Map.has(r)) {
      ws.getCell(r, 10).value = 'Sin imagen / error CORS';
      ws.getCell(r, 10).alignment = { vertical: 'middle', horizontal: 'center' };
    }
  }

  this.showProgressToast('Generando archivo...', 95);
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
         `PartesRevisadas_${rowsToExport.length}_registros_${new Date().toISOString().split('T')[0]}.xlsx`);
  this.showProgressToast('¡Listo!', 100);
  setTimeout(() => {
    this.showToast(`✓ Excel: ${rowsToExport.length} filas, ${pasted} fotos insertadas, ${fail} fallidas`, '#4CAF50');
  }, 500);
  this.isDownloading = false;
  this.hideProgressToast();
}

/* ----------  TOAST CON PROGRESO  ---------- */
private progressToast: HTMLDivElement | null = null;
private showProgressToast(msg: string, progress: number): void {
  if (!this.progressToast) {
    this.progressToast = document.createElement('div');
    this.progressToast.style.cssText = `
      position:fixed;top:20px;right:20px;background:white;padding:20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:9999;min-width:350px`;
    document.body.appendChild(this.progressToast);
  }
  this.progressToast.innerHTML = `
    <div style="margin-bottom:10px;color:#333;font-weight:500">${msg}</div>
    <div style="background:#e0e0e0;border-radius:10px;height:20px;overflow:hidden">
      <div style="background:linear-gradient(90deg,#4CAF50,#45a049);height:100%;width:${progress}%;transition:width .3s;border-radius:10px"></div>
    </div>
    <div style="text-align:right;margin-top:5px;color:#666;font-size:12px">${Math.round(progress)}%</div>`;
}
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

/* ----------  CARGA DE IMÁGENES (CACHE + COMPRESIÓN)  ---------- */
private async loadImageOptimized(url: string): Promise<string | null> {
  if (this.imageCache.has(url)) return this.imageCache.get(url)!;
  return new Promise(res => {
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
      if (!ctx) return res(null);
      ctx.drawImage(img, 0, 0, w, h);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      this.imageCache.set(url, base64);
      res(base64);
    };
    img.onerror = () => res(null);
    img.src = url;
  });
}

}