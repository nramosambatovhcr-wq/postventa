import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/usuario';
import * as XLSX from 'xlsx';

interface PedidoExcel {
  codigo: string;
  descripcion: string;
  cantidad: number;
  modelo?: string;
  cliente?: string;
  ot?: string;
  tipo?: string;
  imagen?: File | null;
  imagenUrl?: string;
  imagenBase64?: string;
}

interface ImageData {
  file: File;
  rowIndex: number;
  codigo: string;
}

@Component({
  selector: 'app-createpedidoexcel',
  templateUrl: './createpedidoexcel.component.html',
  styleUrls: ['./createpedidoexcel.component.css']
})
export class CreatepedidoexcelComponent implements OnInit {
  usuario: Usuario | null = null;
  loading = false;
  uploading = false;
  excelFile: File | null = null;
  fileData: any[] = [];
  previewData: PedidoExcel[] = [];
  errorMessage = '';
  successMessage = '';
  currentStep = 1;
  requiredColumns = ['Codigo', 'Descripcion', 'Cantidad'];
  showPreview = false;
  isTemplateDownloaded = false;
  validationErrors: string[] = [];
  invalidRows: number[] = [];
  
  // Variables para manejo de imágenes
  imageFiles: ImageData[] = [];
  showImageUpload = false;
  
  // Variables para el paso 3
  importInProgress = false;
  importComplete = false;
  importFailed = false;
  importProgress = 0;
  processedRows = 0;
  successRows = 0;
  failedRows = 0;

  // Variables adicionales para el modal de imágenes
  selectedImageUrl: string = '';
  selectedImageTitle: string = '';

  constructor(
    private router: Router,
    private pedidoService: PedidobodegaService,
    private reloadService: ReloadService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
    });
    this.requiredColumns = ['Codigo', 'Descripcion', 'Cantidad'];
  }

  onFileSelect(event: any): void {
    this.errorMessage = '';
    this.fileData = [];
    this.imageFiles = [];
    
    if (event.target.files.length > 0) {
      this.excelFile = event.target.files[0];
      this.readExcel();
    }
  }

  onImageFilesSelect(event: any): void {
    const files = Array.from(event.target.files) as File[];
    
    files.forEach(file => {
      if (this.isValidImageFile(file)) {
        const fileName = file.name.split('.')[0];
        const matchingRow = this.previewData.findIndex(row => 
          row.codigo.toLowerCase() === fileName.toLowerCase()
        );
        
        if (matchingRow !== -1) {
          const imageData: ImageData = {
            file: file,
            rowIndex: matchingRow,
            codigo: this.previewData[matchingRow].codigo
          };
          
          this.imageFiles.push(imageData);
          
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.previewData[matchingRow].imagenUrl = e.target.result;
            this.previewData[matchingRow].imagen = file;
          };
          reader.readAsDataURL(file);
        }
      }
    });
    
    this.successMessage = `Se han cargado ${this.imageFiles.length} imágenes`;
  }

  isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
    return validTypes.includes(file.type);
  }

  readExcel(): void {
    if (!this.excelFile) return;
    
    this.loading = true;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const workbook = XLSX.read(e.target.result, { 
          type: 'binary',
          cellHTML: false,
          cellNF: false,
          cellDates: true
        });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON first
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        // Validate required columns
        if (!this.validateRequiredColumns(data)) {
          this.errorMessage = 'El archivo no contiene las columnas requeridas: ' + this.requiredColumns.join(', ');
          this.excelFile = null;
          this.loading = false;
          return;
        }
        
        this.fileData = data;
        this.validateData();
        
        // Primero preparar datos de vista previa
        this.preparePreviewData();
        
        // Luego intentar extraer imágenes usando diferentes métodos
        this.extractImagesFromWorksheet(workbook, firstSheetName, worksheet);
        
        this.successMessage = `Se han cargado ${data.length} registros del archivo Excel.`;
        this.currentStep = 2;
        this.loading = false;
      } catch (error) {
        console.error('Error al leer Excel:', error);
        this.errorMessage = 'Error al leer el archivo Excel. Asegúrese de que el formato sea correcto.';
        this.excelFile = null;
        this.loading = false;
      }
    };
    
    reader.onerror = () => {
      this.errorMessage = 'Error al leer el archivo.';
      this.excelFile = null;
      this.loading = false;
    };
    
    reader.readAsBinaryString(this.excelFile);
  }

  private extractImagesFromWorksheet(workbook: any, sheetName: string, worksheet: any): void {
    try {
      console.log('Intentando extraer imágenes del worksheet...');
      
      // Método 1: Buscar imágenes en el workbook
      if (workbook.Sheets[sheetName]['!images']) {
        console.log('Encontradas imágenes en !images');
        this.processWorkbookImages(workbook.Sheets[sheetName]['!images']);
      }
      
      // Método 2: Buscar en las celdas que contienen objetos/medios
      this.extractImagesFromCells(worksheet);
      
      // Método 3: Procesar archivos embebidos si existen
      if (workbook.Workbook && workbook.Workbook.Sheets) {
        console.log('Buscando en Workbook.Sheets...');
        this.processEmbeddedMedia(workbook);
      }
      
      // Método 4: Leer como archivo binario para extraer imágenes manualmente
      this.extractImagesManually();
      
    } catch (error) {
      console.warn('Error al extraer imágenes del Excel:', error);
      // No es un error fatal, continuar sin imágenes
    }
  }

  private processWorkbookImages(images: any[]): void {
    images.forEach((img: any, index: number) => {
      if (img.data && img.position) {
        const rowIndex = this.getRowFromPosition(img.position);
        
        if (rowIndex >= 0 && rowIndex < this.previewData.length) {
          const imageBlob = this.base64ToBlob(img.data, img.type || 'image/png');
          const imageFile = new File([imageBlob], `imagen_${index}.png`, { type: img.type || 'image/png' });
          
          this.previewData[rowIndex].imagen = imageFile;
          this.previewData[rowIndex].imagenBase64 = img.data;
          this.previewData[rowIndex].imagenUrl = `data:${img.type || 'image/png'};base64,${img.data}`;
          
          console.log(`Imagen procesada para fila ${rowIndex}, código: ${this.previewData[rowIndex].codigo}`);
        }
      }
    });
  }

  private extractImagesFromCells(worksheet: any): void {
    try {
      // Recorrer todas las celdas buscando contenido de imagen
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell && typeof cell.v === 'object') {
            // Verificar si la celda contiene datos de imagen
            if (cell.l && cell.l.Target && this.isImageUrl(cell.l.Target)) {
              this.processImageFromUrl(cell.l.Target, row - 1); // -1 para el header
            }
          }
          
          // Verificar si hay metadatos de imagen en la celda
          if (cell && cell.c) {
            cell.c.forEach((comment: any) => {
              if (comment.t && this.containsImageData(comment.t)) {
                this.processImageFromComment(comment.t, row - 1);
              }
            });
          }
        }
      }
    } catch (error) {
      console.warn('Error extrayendo imágenes de celdas:', error);
    }
  }

  private processEmbeddedMedia(workbook: any): void {
    try {
      if (workbook.Workbook && workbook.Workbook.Drawings) {
        workbook.Workbook.Drawings.forEach((drawing: any) => {
          if (drawing.Target && drawing.Type === 'image') {
            console.log('Encontrado drawing de imagen:', drawing);
            // Procesar drawing de imagen
          }
        });
      }
    } catch (error) {
      console.warn('Error procesando medios embebidos:', error);
    }
  }

  private extractImagesManually(): void {
    if (!this.excelFile) return;
    
    try {
      // Usar FileReader para leer el archivo como ArrayBuffer
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const arrayBuffer = e.target.result;
        this.searchForImageSignatures(arrayBuffer);
      };
      reader.readAsArrayBuffer(this.excelFile);
    } catch (error) {
      console.warn('Error en extracción manual de imágenes:', error);
    }
  }

  private searchForImageSignatures(buffer: ArrayBuffer): void {
    try {
      const uint8Array = new Uint8Array(buffer);
      
      // Buscar firmas de archivos de imagen
      const signatures = [
        { type: 'image/jpeg', signature: [0xFF, 0xD8, 0xFF] },
        { type: 'image/png', signature: [0x89, 0x50, 0x4E, 0x47] },
        { type: 'image/gif', signature: [0x47, 0x49, 0x46, 0x38] },
        { type: 'image/bmp', signature: [0x42, 0x4D] }
      ];
      
      signatures.forEach(sig => {
        let index = 0;
        while (index < uint8Array.length - sig.signature.length) {
          if (this.matchesSignature(uint8Array, index, sig.signature)) {
            console.log(`Encontrada imagen ${sig.type} en posición ${index}`);
            this.extractImageFromBuffer(uint8Array, index, sig.type);
          }
          index++;
        }
      });
    } catch (error) {
      console.warn('Error buscando firmas de imagen:', error);
    }
  }

  private matchesSignature(buffer: Uint8Array, startIndex: number, signature: number[]): boolean {
    for (let i = 0; i < signature.length; i++) {
      if (buffer[startIndex + i] !== signature[i]) {
        return false;
      }
    }
    return true;
  }

  private extractImageFromBuffer(buffer: Uint8Array, startIndex: number, mimeType: string): void {
    try {
      // Encontrar el final de la imagen (esto es simplificado)
      let endIndex = startIndex + 1000; // Tamaño estimado, mejorar según necesidades
      
      // Para JPEG, buscar el marcador de fin FF D9
      if (mimeType === 'image/jpeg') {
        for (let i = startIndex + 2; i < buffer.length - 1; i++) {
          if (buffer[i] === 0xFF && buffer[i + 1] === 0xD9) {
            endIndex = i + 2;
            break;
          }
        }
      }
      
      const imageData = buffer.slice(startIndex, endIndex);
      const blob = new Blob([imageData], { type: mimeType });
      const file = new File([blob], `extracted_image.${mimeType.split('/')[1]}`, { type: mimeType });
      
      // Asociar con el primer registro que no tenga imagen
      const emptyIndex = this.previewData.findIndex(item => !item.imagen);
      if (emptyIndex !== -1) {
        this.previewData[emptyIndex].imagen = file;
        
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewData[emptyIndex].imagenUrl = e.target.result;
        };
        reader.readAsDataURL(file);
        
        console.log(`Imagen extraída y asociada con código: ${this.previewData[emptyIndex].codigo}`);
      }
    } catch (error) {
      console.warn('Error extrayendo imagen del buffer:', error);
    }
  }

  private isImageUrl(url: string): boolean {
    const imageExtensions = /\.(jpg|jpeg|png|gif|bmp)$/i;
    return imageExtensions.test(url);
  }

  private containsImageData(text: string): boolean {
    return text.includes('data:image/') || text.includes('base64');
  }

  private processImageFromUrl(url: string, rowIndex: number): void {
    // Implementar carga de imagen desde URL si es necesario
    console.log(`Procesando imagen desde URL: ${url} para fila ${rowIndex}`);
  }

  private processImageFromComment(comment: string, rowIndex: number): void {
    if (comment.includes('data:image/')) {
      const dataUrl = comment.match(/data:image\/[^;]+;base64,[^"]+/);
      if (dataUrl && rowIndex < this.previewData.length) {
        this.previewData[rowIndex].imagenUrl = dataUrl[0];
        
        try {
          const blob = this.dataURLToBlob(dataUrl[0]);
          const file = new File([blob], `comment_image_${rowIndex}.png`, { type: blob.type });
          this.previewData[rowIndex].imagen = file;
        } catch (error) {
          console.warn('Error procesando imagen de comentario:', error);
        }
      }
    }
  }

  private getRowFromPosition(position: any): number {
    try {
      if (position.row !== undefined) {
        return position.row - 2;
      } else if (position.r !== undefined) {
        return position.r - 1;
      }
      return -1;
    } catch (error) {
      return -1;
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  private dataURLToBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }

  validateRequiredColumns(data: any[]): boolean {
    if (data.length === 0) return false;
    
    const firstRow = data[0];
    return this.requiredColumns.every(col => 
      Object.keys(firstRow).some(key => key === col || key.toLowerCase() === col.toLowerCase())
    );
  }

  validateData(): void {
    this.validationErrors = [];
    this.invalidRows = [];
    
    this.fileData.forEach((row, index) => {
      let rowHasError = false;
      
      const normalizedRow: any = {};
      for (const key in row) {
        normalizedRow[key.toLowerCase()] = row[key];
      }
      
      if (!normalizedRow['codigo'] || normalizedRow['codigo'].toString().trim() === '') {
        this.validationErrors.push(`Fila ${index + 1}: El código es obligatorio`);
        rowHasError = true;
      }
      
      if (!normalizedRow['descripcion'] || normalizedRow['descripcion'].toString().trim() === '') {
        this.validationErrors.push(`Fila ${index + 1}: La descripción es obligatoria`);
        rowHasError = true;
      }
      
      if (!normalizedRow['cantidad'] || isNaN(Number(normalizedRow['cantidad'])) || Number(normalizedRow['cantidad']) <= 0) {
        this.validationErrors.push(`Fila ${index + 1}: La cantidad debe ser un número positivo`);
        rowHasError = true;
      }
      
      if (rowHasError) {
        this.invalidRows.push(index);
      }
    });
  }

  preparePreviewData(): void {
    this.previewData = this.fileData.map((row, index) => {
      const normalizedRow: PedidoExcel = {
        codigo: row['Codigo'] || row['codigo'] || '',
        descripcion: row['Descripcion'] || row['descripcion'] || '',
        cantidad: Number(row['Cantidad'] || row['cantidad'] || 0),      
        modelo: row['Modelo'] || row['modelo'] || '',
        cliente: row['Cliente'] || row['cliente'] || '',
        ot: row['OT'] || row['ot'] || '',      
        tipo: row['Tipo'] || row['tipo'] || 'pedido',
        imagen: null,
        imagenUrl: '',
        imagenBase64: ''
      };
      
      // Verificar si hay una imagen en la columna Imagen
      if (row['Imagen'] || row['imagen']) {
        const imagenData = row['Imagen'] || row['imagen'];
        if (typeof imagenData === 'string' && imagenData.startsWith('data:image')) {
          normalizedRow.imagenUrl = imagenData;
          normalizedRow.imagenBase64 = imagenData.split(',')[1];
          
          try {
            const blob = this.dataURLToBlob(imagenData);
            normalizedRow.imagen = new File([blob], `imagen_${index}.png`, { type: blob.type });
          } catch (error) {
            console.warn(`Error procesando imagen para código ${normalizedRow.codigo}:`, error);
          }
        }
      }
      
      return normalizedRow;
    });
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  nextStep(): void {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  startImport(): void {
    if (!this.usuario) {
      this.errorMessage = 'No hay usuario autenticado';
      return;
    }
    
    if (!this.excelFile) {
      this.errorMessage = 'No hay archivo seleccionado';
      return;
    }
    
    this.importInProgress = true;
    this.importProgress = 0;
    this.processedRows = 0;
    this.successRows = 0;
    this.failedRows = 0;
    this.errorMessage = '';
    
    const formData = new FormData();
    formData.append('excelFile', this.excelFile);
    formData.append('idUsuario', this.usuario.id.toString());
    
    let imageCounter = 0;
    this.previewData.forEach((item, index) => {
      if (item.imagen) {
        formData.append(`imagen_${item.codigo}`, item.imagen);
        imageCounter++;
      }
    });
    
    const embeddedImageMapping = this.previewData
      .filter(item => item.imagen)
      .map(item => ({
        codigo: item.codigo,
        fileName: item.imagen?.name || `embedded_${item.codigo}`,
        isEmbedded: true
      }));
    
    this.imageFiles.forEach((imageData) => {
      formData.append(`imagen_${imageData.codigo}`, imageData.file);
    });
    
    const allImageMapping = [
      ...embeddedImageMapping,
      ...this.imageFiles.map(img => ({
        codigo: img.codigo,
        fileName: img.file.name,
        isEmbedded: false
      }))
    ];
    
    formData.append('imageMapping', JSON.stringify(allImageMapping));
    formData.append('totalImages', imageCounter.toString());
    
    const progressInterval = setInterval(() => {
      if (this.importProgress < 90) {
        this.importProgress += 2;
      }
    }, 200);
    
    this.pedidoService.uploadExcelImage(formData).subscribe({
      next: (response: any) => {
        clearInterval(progressInterval);
        this.importProgress = 100;
        
        if (response && response.details) {
          this.processedRows = response.success + response.failed;
          this.successRows = response.success;
          this.failedRows = response.failed;
          
          if (response.failed > 0 && Array.isArray(response.details)) {
            const errorMessages = response.details
              .filter((item: any) => item.status === 'error')
              .map((item: any) => `Fila ${item.row}: ${item.message}`);
            
            if (errorMessages.length > 0) {
              this.errorMessage = `Errores encontrados: ${errorMessages.slice(0, 3).join('; ')}` + 
                (errorMessages.length > 3 ? ` y ${errorMessages.length - 3} más.` : '');
            }
          }
        }
        
        this.completeImport(response.success > 0);
      },
      error: (error) => {
        clearInterval(progressInterval);
        this.importProgress = 100;
        
        if (error.status === 405) {
          this.errorMessage = 'Error de configuración del servidor: Método no permitido (405). Contacte al administrador del sistema.';
        } else {
          this.errorMessage = error.error?.message || error.message || 'Error al procesar el archivo';
        }
        
        this.failedRows = this.fileData?.length || 0;
        this.completeImport(false);
      },
      complete: () => {
        clearInterval(progressInterval);
      }
    });
  }

  completeImport(success: boolean = true): void {
    this.importInProgress = false;
    if (success) {
      this.importComplete = true;
      this.successMessage = `Importación completada. Registros exitosos: ${this.successRows}, Registros fallidos: ${this.failedRows}`;
    } else {
      this.importFailed = true;
      this.errorMessage = 'La importación ha fallado. Por favor, revise los datos y vuelva a intentarlo.';
    }
    this.reloadService.triggerReload();
  }

  resetForm(): void {
    this.excelFile = null;
    this.fileData = [];
    this.previewData = [];
    this.imageFiles = [];
    this.errorMessage = '';
    this.successMessage = '';
    this.validationErrors = [];
    this.invalidRows = [];
    this.currentStep = 1;
    this.showPreview = false;
    this.showImageUpload = false;
    this.importInProgress = false;
    this.importComplete = false;
    this.importFailed = false;
    this.importProgress = 0;
    this.processedRows = 0;
    this.successRows = 0;
    this.failedRows = 0;
    this.selectedImageUrl = '';
    this.selectedImageTitle = '';
  }

  downloadTemplate(): void {
    const template = [
      {
        Codigo: 'ABC123',
        Descripcion: 'Ejemplo de producto 1',
        Cantidad: 10,
        Modelo: 'sl',
        Cliente: 'Cliente de Ejemplo',
        OT: 'OT-12345',
        Tipo: 'pedido',
        Imagen: ''
      },
      {
        Codigo: 'DEF456',
        Descripcion: 'Ejemplo de producto 2',
        Cantidad: 5,
        Modelo: 'sp',
        Cliente: 'Cliente Corporativo',
        OT: 'OT-67890',
        Tipo: 'pedido',
        Imagen: ''
      }
    ];
    
    const instructionsData = [
      ['INSTRUCCIONES PARA CARGAR PEDIDOS CON IMÁGENES EMBEBIDAS'],
      [''],
      ['1. Complete la información en la hoja "Pedidos" según el formato indicado.'],
      ['2. Las columnas marcadas en ROJO son obligatorias:'],
      ['   • Codigo: Identificador único del producto'],
      ['   • Descripcion: Nombre o descripción del producto'],
      ['   • Cantidad: Número de unidades (solo valores numéricos)'],
      [''],
      ['3. Las columnas opcionales incluyen:'],
      ['   • Modelo: (CAMIONES sp, LIVIANOS sl, LYNK/CO lc, SUNDVAR CASE sc)'],
      ['   • Cliente: Nombre del cliente solicitante'],
      ['   • OT: Número de orden de trabajo relacionada'],
      ['   • Tipo: Categoría del pedido (pedido)'],
      ['   • Imagen: Inserte directamente la imagen en esta celda'],
      [''],
      ['4. PARA AGREGAR IMÁGENES DIRECTAMENTE EN EL EXCEL:'],
      ['   • Haga clic en la celda de la columna "Imagen"'],
      ['   • Vaya a Insertar > Imágenes > Este dispositivo'],
      ['   • Seleccione la imagen y ajústela al tamaño de la celda'],
      ['   • La imagen se guardará embebida en el archivo Excel'],
      [''],
      ['5. ALTERNATIVA - Usar referencias de imagen:'],
      ['   • En la celda "Imagen", pegue el nombre del archivo'],
      ['   • Ej: "producto1.jpg", "ABC123.png"'],
      ['   • Luego use el botón "Cargar Imágenes" en el sistema'],
      [''],
      ['6. No modifique los nombres de las columnas ni elimine la primera fila.'],
      ['7. Guarde el archivo Excel manteniendo las imágenes embebidas.'],
      [''],
      ['NOTA: Las imágenes embebidas se procesarán automáticamente.']
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    
    const instructionsColWidth = [{ wch: 80 }];
    wsInstructions['!cols'] = instructionsColWidth;
    
    const colWidth = [
      { wch: 12 },  // Codigo
      { wch: 40 },  // Descripcion
      { wch: 10 },  // Cantidad
      { wch: 15 },  // Modelo
      { wch: 20 },  // Cliente
      { wch: 12 },  // OT
      { wch: 10 },  // Tipo
      { wch: 20 }   // Imagen
    ];
    ws['!cols'] = colWidth;
    
    XLSX.writeFile(wb, 'Plantilla_Pedidos_Con_Imagenes_Embebidas.xlsx');
    this.isTemplateDownloaded = true;
  }

  openImageModal(imageUrl: string, codigo: string): void {
    this.selectedImageUrl = imageUrl;
    this.selectedImageTitle = `Imagen del producto: ${codigo}`;
    
    const modalElement = document.getElementById('imageModal');
    if (modalElement) {
      try {
        const modal = new (window as any).bootstrap.Modal(modalElement);
        modal.show();
      } catch (error) {
        window.open(imageUrl, '_blank');
      }
    } else {
      window.open(imageUrl, '_blank');
    }
  }

  // Método completado para contar imágenes
  getImageCount(): number {
    return this.previewData.filter(item => item.imagenUrl && item.imagenUrl.trim() !== '').length;
  }

  // Métodos adicionales útiles
  
  hasValidationErrors(): boolean {
    return this.validationErrors.length > 0;
  }

  canProceedToNextStep(): boolean {
    return this.fileData.length > 0 && this.validationErrors.length === 0;
  }

  canStartImport(): boolean {
    return this.canProceedToNextStep() && this.usuario !== null && !this.importInProgress;
  }

  getValidRowsCount(): number {
    return this.fileData.length - this.invalidRows.length;
  }

  getInvalidRowsCount(): number {
    return this.invalidRows.length;
  }

  getTotalRowsCount(): number {
    return this.fileData.length;
  }

  isRowInvalid(index: number): boolean {
    return this.invalidRows.includes(index);
  }

  hasImages(): boolean {
    return this.getImageCount() > 0;
  }

  getExternalImagesCount(): number {
    return this.imageFiles.length;
  }

  getEmbeddedImagesCount(): number {
    return this.previewData.filter(item => 
      item.imagenUrl && 
      item.imagenUrl.trim() !== '' && 
      !this.imageFiles.some(img => img.codigo === item.codigo)
    ).length;
  }

  removeImage(codigo: string): void {
    const index = this.previewData.findIndex(item => item.codigo === codigo);
    if (index !== -1) {
      this.previewData[index].imagen = null;
      this.previewData[index].imagenUrl = '';
      this.previewData[index].imagenBase64 = '';
    }

    // También remover de imageFiles si existe
    const imageFileIndex = this.imageFiles.findIndex(img => img.codigo === codigo);
    if (imageFileIndex !== -1) {
      this.imageFiles.splice(imageFileIndex, 1);
    }
  }

  clearAllImages(): void {
    this.previewData.forEach(item => {
      item.imagen = null;
      item.imagenUrl = '';
      item.imagenBase64 = '';
    });
    this.imageFiles = [];
  }

  getProgressPercentage(): number {
    if (this.processedRows === 0) return 0;
    return Math.round((this.processedRows / this.getTotalRowsCount()) * 100);
  }

  getSuccessPercentage(): number {
    if (this.processedRows === 0) return 0;
    return Math.round((this.successRows / this.processedRows) * 100);
  }

  backToStart(): void {
    this.router.navigate(['/pedidos']);
  }

  restartProcess(): void {
    this.resetForm();
    // Reset file input
    const fileInput = document.getElementById('excelFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    const imageInput = document.getElementById('imageFilesInput') as HTMLInputElement;
    if (imageInput) {
      imageInput.value = '';
    }
  }

  toggleImageUpload(): void {
    this.showImageUpload = !this.showImageUpload;
  }

  downloadErrorReport(): void {
    if (this.validationErrors.length === 0) return;

    const errorData = this.validationErrors.map((error, index) => ({
      'Número de Error': index + 1,
      'Descripción del Error': error,
      'Fecha': new Date().toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Errores de Validación');

    const colWidth = [
      { wch: 15 },  // Número de Error
      { wch: 60 },  // Descripción del Error
      { wch: 20 }   // Fecha
    ];
    ws['!cols'] = colWidth;

    XLSX.writeFile(wb, `Reporte_Errores_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPreviewData(): void {
    if (this.previewData.length === 0) return;

    const exportData = this.previewData.map((item, index) => ({
      'Fila': index + 1,
      'Código': item.codigo,
      'Descripción': item.descripcion,
      'Cantidad': item.cantidad,
      'Modelo': item.modelo || '',
      'Cliente': item.cliente || '',
      'OT': item.ot || '',
      'Tipo': item.tipo || '',
      'Tiene Imagen': item.imagenUrl ? 'Sí' : 'No',
      'Estado': this.isRowInvalid(index) ? 'Error' : 'Válido'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vista Previa');

    const colWidth = [
      { wch: 8 },   // Fila
      { wch: 15 },  // Código
      { wch: 40 },  // Descripción
      { wch: 10 },  // Cantidad
      { wch: 15 },  // Modelo
      { wch: 20 },  // Cliente
      { wch: 12 },  // OT
      { wch: 10 },  // Tipo
      { wch: 12 },  // Tiene Imagen
      { wch: 10 }   // Estado
    ];
    ws['!cols'] = colWidth;

    XLSX.writeFile(wb, `Vista_Previa_Pedidos_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  // Método para limpiar recursos cuando el componente se destruye
  ngOnDestroy(): void {
    // Limpiar URLs de objeto para evitar memory leaks
    this.previewData.forEach(item => {
      if (item.imagenUrl && item.imagenUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.imagenUrl);
      }
    });
  }

  // Métodos para manejo de archivos grandes
  private processLargeFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const chunkSize = 1024 * 1024; // 1MB chunks
      const reader = new FileReader();
      let offset = 0;
      let chunks: ArrayBuffer[] = [];

      reader.onload = (e: any) => {
        chunks.push(e.target.result);
        offset += chunkSize;

        if (offset >= file.size) {
          // Combinar todos los chunks
          const combined = this.combineArrayBuffers(chunks);
          try {
            const workbook = XLSX.read(combined, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        } else {
          // Leer siguiente chunk
          readNextChunk();
        }
      };

      reader.onerror = () => reject(new Error('Error reading file'));

      const readNextChunk = () => {
        const slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
      };

      // Comenzar lectura
      readNextChunk();
    });
  }

  private combineArrayBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;

    buffers.forEach(buffer => {
      combined.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    });

    return combined.buffer;
  }
}