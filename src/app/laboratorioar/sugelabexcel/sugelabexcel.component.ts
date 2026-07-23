import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/usuario';
import * as XLSX from 'xlsx';
import { FormBuilder } from '@angular/forms';
import { first, takeUntil } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';

interface PedidoExcel {
  codigo: string;
  descripcion: string;
  cantidad: number;
 
  modelo?: string;
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
  selector: 'app-sugelabexcel',
  templateUrl: './sugelabexcel.component.html',
  styleUrls: ['./sugelabexcel.component.css']
})
export class SugelabexcelComponent implements OnInit, OnDestroy {
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
  successCount: number = 0;
  failedCount: number = 0;

  // Variables adicionales para el modal de imágenes
  selectedImageUrl: string = '';
  selectedImageTitle: string = '';

  private destroy$ = new Subject<void>();
  private userSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private pedidobodegaService: PedidobodegaService,
    private reloadService: ReloadService,
    private authService: AuthService,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.userSubscription = this.authService.usuarioActual$
      .pipe(takeUntil(this.destroy$))
      .subscribe(usuario => {
        this.usuario = usuario;
      });

    this.resetForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Limpiar URLs de objeto para evitar memory leaks
    this.previewData.forEach(item => {
      if (item.imagenUrl && item.imagenUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.imagenUrl);
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard']);
  }

  onFileChange(event: any): void {
    this.errorMessage = '';
    this.fileData = [];
    this.imageFiles = [];
    this.resetFormState();
    
    const files = event.target.files;
    if (files && files.length > 0) {
      this.excelFile = files[0];
      this.readExcel();
    } else {
      this.excelFile = null;
      this.errorMessage = 'No se ha seleccionado ningún archivo.';
      this.currentStep = 1;
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
    
    if (!this.excelFile.name.endsWith('.xlsx')) {
      this.errorMessage = 'Solo se permiten archivos Excel (.xlsx).';
      this.excelFile = null;
      this.currentStep = 1;
      return;
    }
    
    this.loading = true;
    
    // Usar el método mejorado de lectura por chunks para archivos grandes
    this.readFileChunked(this.excelFile)
      .then((data: PedidoExcel[]) => {
        this.fileData = data;
        this.validateData();
        this.preparePreviewData();
        
        // Intentar extraer imágenes embebidas
        this.extractImagesFromFile();
        
        this.successMessage = `Se han cargado ${data.length} registros del archivo Excel.`;
        this.loading = false;
        
        if (!this.errorMessage && this.previewData.length > 0) {
          this.currentStep = 2;
          this.showPreview = true;
        } else if (!this.errorMessage && this.previewData.length === 0) {
          this.errorMessage = 'El archivo Excel está vacío o no contiene datos válidos después del procesamiento.';
          this.currentStep = 1;
        } else {
          this.currentStep = 1;
        }
      })
      .catch(error => {
        this.errorMessage = `Error al leer o procesar el archivo: ${error.message || error}`;
        this.loading = false;
        this.excelFile = null;
        this.currentStep = 1;
      });
  }

  private readFileChunked(file: File): Promise<PedidoExcel[]> {
    return new Promise((resolve, reject) => {
      const chunkSize = 1024 * 1024;
      const reader = new FileReader();
      let offset = 0;
      let chunks: ArrayBuffer[] = [];

      reader.onload = (e: any) => {
        chunks.push(e.target.result);
        offset += chunkSize;

        if (offset >= file.size) {
          const combined = this.combineArrayBuffers(chunks);
          try {
            const workbook = XLSX.read(combined, { 
              type: 'array',
              cellHTML: false,
              cellNF: false,
              cellDates: true
            });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            if (rawData.length === 0) {
              reject(new Error('La hoja Excel está vacía.'));
              return;
            }

            const headers = rawData[0].map(h => String(h || '').trim());

            const missingHeaders = this.requiredColumns.filter(col => !headers.includes(col));
            if (missingHeaders.length > 0) {
              reject(new Error(`Faltan las columnas requeridas: ${missingHeaders.join(', ')}`));
              return;
            }

            const processedData: PedidoExcel[] = [];
            for (let i = 1; i < rawData.length; i++) {
              const row = rawData[i];
              if (!row || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
                continue;
              }

              const rowObject: any = {};
              headers.forEach((header, index) => {
                rowObject[header] = row[index];
              });

              const pedido: PedidoExcel = {
                codigo: String(rowObject['Codigo'] || '').trim(),
                descripcion: String(rowObject['Descripcion'] || '').trim(),
                cantidad: Number(rowObject['Cantidad']),
                modelo: String(rowObject['Modelo'] || '').trim() || undefined,
                tipo: String(rowObject['Tipo'] || '').trim().toUpperCase() || 'SUGERIDO',
                imagen: null,
                imagenUrl: '',
                imagenBase64: ''
              };

              // Procesar imagen si existe en la columna
              const imagenColIndex = headers.indexOf('Imagen');
              if (imagenColIndex !== -1 && row[imagenColIndex]) {
                const cellValue = String(row[imagenColIndex]).trim();
                if (cellValue) {
                  if (cellValue.startsWith('data:image/')) {
                    pedido.imagenBase64 = cellValue.split(',')[1];
                    pedido.imagenUrl = cellValue;
                    try {
                      const blob = this.dataURLToBlob(cellValue);
                      pedido.imagen = new File([blob], `imagen_${i}.png`, { type: blob.type });
                    } catch (error) {
                      console.warn(`Error procesando imagen para código ${pedido.codigo}:`, error);
                    }
                  } else {
                    pedido.imagenUrl = cellValue;
                  }
                }
              }
             
              processedData.push(pedido);
            }
            
            // Guardar referencia al workbook para extracción de imágenes
            (this as any).currentWorkbook = workbook;
            (this as any).currentWorksheet = worksheet;
            
            resolve(processedData);

          } catch (error: any) {
            reject(new Error(`Error al parsear el archivo Excel: ${error.message || error}`));
          }
        } else {
          readNextChunk();
        }
      };

      reader.onerror = () => reject(new Error('Error al leer el archivo.'));

      const readNextChunk = () => {
        const slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
      };

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

  private extractImagesFromFile(): void {
    try {
      if ((this as any).currentWorkbook && (this as any).currentWorksheet) {
        const workbook = (this as any).currentWorkbook;
        const worksheet = (this as any).currentWorksheet;
        
        // Intentar extraer imágenes usando varios métodos
        this.extractImagesFromWorksheet(workbook, workbook.SheetNames[0], worksheet);
      }
    } catch (error) {
      console.warn('Error al extraer imágenes del Excel:', error);
    }
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
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell && typeof cell.v === 'object') {
            if (cell.l && cell.l.Target && this.isImageUrl(cell.l.Target)) {
              this.processImageFromUrl(cell.l.Target, row - 1);
            }
          }
          
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
      let endIndex = startIndex + 1000;
      
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

  // Métodos de utilidad para imágenes
  private isImageUrl(url: string): boolean {
    const imageExtensions = /\.(jpg|jpeg|png|gif|bmp)$/i;
    return imageExtensions.test(url);
  }

  private containsImageData(text: string): boolean {
    return text.includes('data:image/') || text.includes('base64');
  }

  private processImageFromUrl(url: string, rowIndex: number): void {
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

  validateData(): void {
    this.validationErrors = [];
    this.invalidRows = [];
    
    this.fileData.forEach((row, index) => {
      let rowHasError = false;
      const rowErrors: string[] = [];
      
      const codigo = String(row.codigo || '').trim();
      const descripcion = String(row.descripcion || '').trim();
      const cantidad = Number(row.cantidad);
      
      if (!codigo) {
        rowErrors.push('Falta el Código');
        rowHasError = true;
      }
      if (!descripcion) {
        rowErrors.push('Falta la Descripción');
        rowHasError = true;
      }
      if (isNaN(cantidad) || cantidad < 0) {
        rowErrors.push('Cantidad debe ser un número no negativo');
        rowHasError = true;
      }
      
      if (rowHasError) {
        this.validationErrors.push(`Fila ${index + 2}: ${rowErrors.join(', ')}`);
        this.invalidRows.push(index);
      }
    });
  }

  preparePreviewData(): void {
    this.previewData = this.fileData.map((row, index) => {
      return {
        codigo: String(row.codigo || '').trim(),
        descripcion: String(row.descripcion || '').trim(),
        cantidad: Number(row.cantidad || 0),
          modelo: String(row.modelo || '').trim() || undefined,
        tipo: String(row.tipo || '').trim().toUpperCase() || 'SUGERIDO',
        imagen: row.imagen || null,
        imagenUrl: row.imagenUrl || '',
        imagenBase64: row.imagenBase64 || ''
      };
    });

    this.showPreview = this.previewData.length > 0;
  }

  nextStep(): void {
    if (this.currentStep === 1 && this.excelFile && this.previewData.length > 0 && this.validationErrors.length === 0) {
      this.currentStep = 2;
      this.showPreview = true;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      if (this.currentStep === 1) {
        this.resetForm();
      } else if (this.currentStep === 2) {
        this.showPreview = this.previewData.length > 0;
        this.errorMessage = '';
        this.successMessage = '';
      }
    }
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  async uploadData(): Promise<void> {
    if (!this.excelFile || !this.usuario?.id) {
      this.errorMessage = 'No se ha seleccionado ningún archivo o no se ha podido obtener la información del usuario.';
      return;
    }
    if (this.validationErrors.length > 0 || this.previewData.length === 0) {
      this.errorMessage = 'No se puede iniciar la importación debido a errores de validación o falta de datos válidos.';
      this.currentStep = 2;
      return;
    }

    this.uploading = true;
    this.importInProgress = true;
    this.importComplete = false;
    this.importFailed = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.successCount = 0;
    this.failedCount = 0;
    this.importProgress = 0;

    const formData = new FormData();
    formData.append('excelFile', this.excelFile);
    formData.append('idUsuario', this.usuario.id.toString());

    // Agregar imágenes embebidas
    let imageCounter = 0;
    this.previewData.forEach((item, index) => {
      if (item.imagen) {
        formData.append(`imagen_${item.codigo}`, item.imagen);
        imageCounter++;
      }
    });

    // Agregar imágenes externas
    this.imageFiles.forEach((imageData) => {
      formData.append(`imagen_${imageData.codigo}`, imageData.file);
    });

    // Crear mapeo de imágenes
    const embeddedImageMapping = this.previewData
      .filter(item => item.imagen)
      .map(item => ({
        codigo: item.codigo,
        fileName: item.imagen?.name || `embedded_${item.codigo}`,
        isEmbedded: true
      }));

    const allImageMapping = [
      ...embeddedImageMapping,
      ...this.imageFiles.map(img => ({
        codigo: img.codigo,
        fileName: img.file.name,
        isEmbedded: false
      }))
    ];

    formData.append('imageMapping', JSON.stringify(allImageMapping));
    formData.append('totalImages', (imageCounter + this.imageFiles.length).toString());

    // Simular progreso
    const progressInterval = setInterval(() => {
      if (this.importProgress < 90) {
        this.importProgress += 2;
      }
    }, 200);

    try {
      const response = await this.pedidobodegaService.uploadExcelLabSu(formData).pipe(first()).toPromise()!;

      clearInterval(progressInterval);
      this.importProgress = 100;

      this.successMessage = `Importación completada: ${response.success} filas exitosas, ${response.failed} filas fallidas.`;
      this.successCount = response.success;
      this.failedCount = response.failed;
      this.processedRows = response.success + response.failed;
      this.importComplete = true;
      this.importFailed = response.failed > 0;
      this.currentStep = 3;
      
      this.reloadService.triggerReload();
    } catch (error: any) {
      clearInterval(progressInterval);
      this.importProgress = 100;
      
      this.errorMessage = error.error?.message || error.message || 'Error desconocido al importar los datos. Por favor, inténtalo de nuevo.';
      this.importFailed = true;
      this.importComplete = true;
      this.currentStep = 3;
      this.failedCount = this.fileData?.length || 0;
    } finally {
      this.uploading = false;
      this.importInProgress = false;
    }
  }

  resetForm(): void {
    this.excelFile = null;
    this.fileData = [];
    this.previewData = [];
    this.imageFiles = [];
    this.errorMessage = '';
    this.successMessage = '';
    this.currentStep = 1;
    this.showPreview = false;
    this.showImageUpload = false;
    this.isTemplateDownloaded = false;
    this.validationErrors = [];
    this.invalidRows = [];
    this.importInProgress = false;
    this.importComplete = false;
    this.importFailed = false;
    this.importProgress = 0;
    this.processedRows = 0;
    this.successCount = 0;
    this.failedCount = 0;
    this.selectedImageUrl = '';
    this.selectedImageTitle = '';
  }

  private resetFormState(): void {
    this.previewData = [];
    this.errorMessage = '';
    this.successMessage = '';
    this.showPreview = false;
    this.validationErrors = [];
    this.invalidRows = [];
    this.importComplete = false;
    this.importFailed = false;
    this.successCount = 0;
    this.failedCount = 0;
    this.importInProgress = false;
    this.importProgress = 0;
    this.processedRows = 0;
  }

 
  downloadExcelTemplate(): void {
    // **UPDATED: Removed Cliente, OT, Observaciones from template data**
    const template = [
      {
        Codigo: 'COD-123',
        Descripcion: 'Descripción del producto',
        Cantidad: 10,
      
        Modelo: 'sp',
        Tipo: 'sugerido',
        Imagen: ''
      },
      {
        Codigo: 'COD-456',
        Descripcion: 'Otro producto',
        Cantidad: 5,
    
        Modelo: 'sp',
        Tipo: 'sugerido',
        Imagen: ''
      }
    ];

    const instructionsData = [
      ['INSTRUCCIONES DE USO:'],
      ['1. Asegúrese de que la primera fila de su archivo Excel contenga los encabezados exactos que se muestran en la plantilla.'],
      ['2. Las columnas "Codigo", "Descripcion" y "Cantidad" son OBLIGATORIAS.'],
      ['3. "Cantidad" debe ser un número entero no negativo. (0 es permitido si su lógica de negocio lo permite)'],
      // **UPDATED: Removed Cliente, OT, Observaciones from instructions**
      ['4. Las columnas "Modelo", "Tipo" e "Imagen" son OPCIONALES.'],
       ['   • Modelo: (CAMIONES sp, LIVIANOS sl, LYNK/CO lc, SUNDVAR CASE sc)'],
      ['5. Se debe proporcionar la columna "Tipo", debe ser "sugerido".'],
      ['6. PARA AGREGAR IMÁGENES DIRECTAMENTE EN EL EXCEL:'],
      ['   • Haga clic en la celda de la columna "Imagen"'],
      ['   • Vaya a Insertar > Imágenes > Este dispositivo'],
      ['   • Seleccione la imagen y ajústela al tamaño de la celda'],
      ['   • La imagen se guardará embebida en el archivo Excel'],
      [''],
        ['7. Cada fila representa un nuevo sugerido.'],
      ['8. Las filas completamente vacías serán ignoradas.'],
      [''],
      ['DIAGRAMA DE FLUJO DEL PROCESO:'],
      ['1. Cargar Excel → 2. Validar Datos → 3. Procesar Sugerido → 4. Recibir Confirmación']
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    
    const ws = XLSX.utils.json_to_sheet(template);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');
 
    XLSX.utils.book_append_sheet(wb, ws, 'Sugeridos');

    const instructionsColWidth = [{ wch: 80 }];
    wsInstructions['!cols'] = instructionsColWidth;

 

    // **UPDATED: Removed Cliente, OT, Observaciones from column widths**
    const colWidth = [
      { wch: 12 },  // Codigo - OBLIGATORIO
      { wch: 40 },  // Descripcion - OBLIGATORIO
      { wch: 10 },  // Cantidad - OBLIGATORIO
     
      { wch: 20 },  // Modelo - OPCIONAL
      { wch: 15 },  // Tipo - OPCIONAL
      { wch: 30 }   // Imagen - OPCIONAL
    ];
    ws['!cols'] = colWidth;

    XLSX.writeFile(wb, 'Plantilla_Sugeridos.xlsx');
    this.isTemplateDownloaded = true;
  }
}