import { Component, OnInit } from '@angular/core';
import { PdfExtractorService, OrderData, RepuestoItem, TrabajoItem } from 'src/app/services/pdf-extractor.service';

@Component({
  selector: 'app-otgarantia',
  templateUrl: './otgarantia.component.html',
  styleUrls: ['./otgarantia.component.css']
})
export class OtgarantiaComponent implements OnInit {
  title = 'PDF Extractor';
  extractedData: OrderData | null = null;
  isLoading = false;
  error: string | null = null;
  debugMode = false;
  private selectedFile: File | null = null;

  constructor(private pdfExtractorService: PdfExtractorService) {}

  ngOnInit(): void {
    this.testPdfService();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    let file: File | null = null;

    // Manejar tanto drag & drop como click
    if (event.type === 'drop') {
      event.preventDefault();
      const dropEvent = event as DragEvent;
      file = dropEvent.dataTransfer?.files[0] || null;
    } else {
      file = input.files?.[0] || null;
    }

    if (!file) {
      this.showError('No se seleccionó ningún archivo');
      return;
    }

    this.selectedFile = file;
    this.validateAndProcessFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    // Añadir una clase visual si es necesario
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    // Quitar una clase visual si es necesario
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.onFileSelected(event);
  }

  private validateAndProcessFile(file: File): void {
    // Limpiar errores previos
    this.clearError();
    
    // Log detallado del archivo
    console.log('Archivo seleccionado:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: new Date(file.lastModified)
    });

    // Validaciones
    if (file.type !== 'application/pdf') {
      this.showError('Formato de archivo no soportado. Por favor, sube un PDF.');
      return;
    }

    const maxSizeMB = 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      this.showError(`El archivo es demasiado grande. El tamaño máximo permitido es ${maxSizeMB} MB.`);
      return;
    }

    this.extractPdfData(file);
  }

  private async extractPdfData(file: File): Promise<void> {
    this.isLoading = true;
    this.extractedData = null; // Limpiar datos anteriores
    this.error = null; // Limpiar errores anteriores

    try {
      this.extractedData = await this.pdfExtractorService.extractDataFromPdf(file);
      console.log('Extracción completada:', this.extractedData);
      if (!this.extractedData || Object.keys(this.extractedData).length === 0) {
        this.showError('No se pudieron extraer datos relevantes del PDF.');
      }
    } catch (err: any) {
      console.error('Error al extraer datos del PDF:', err);
      this.showError(err.message || 'Ocurrió un error desconocido al procesar el PDF.');
    } finally {
      this.isLoading = false;
    }
  }

  private showError(message: string): void {
    this.error = message;
    this.isLoading = false;
    console.error('Error mostrado:', message);
  }

  retryExtraction(): void {
    if (this.selectedFile) {
      this.validateAndProcessFile(this.selectedFile);
    } else {
      this.clearError();
    }
  }

  clearError(): void {
    this.error = null;
  }

  // Métodos para actualizar totales dinámicamente al editar
  updateRepuestoTotal(index: number): void {
    if (this.extractedData && this.extractedData.repuestos && this.extractedData.repuestos[index]) {
      const item = this.extractedData.repuestos[index];
      item.total = item.cantidad * item.precioUnitario;
      this.updateFinancialSummary(); // Actualizar resumen financiero si es necesario
    }
  }

  updateTrabajoTotal(index: number): void {
    if (this.extractedData && this.extractedData.trabajos && this.extractedData.trabajos[index]) {
      const item = this.extractedData.trabajos[index];
      item.total = item.cantidad * item.precioUnitario;
      this.updateFinancialSummary(); // Actualizar resumen financiero si es necesario
    }
  }

  // Recalcular el resumen financiero (subtotal, IVA, total)
  private updateFinancialSummary(): void {
    if (!this.extractedData || !this.extractedData.financiero) {
      return;
    }

    let subtotalRepuestos = this.getTotalRepuestos();
    let subtotalTrabajos = this.getTotalTrabajos();
    
    // Aquí puedes implementar la lógica de cómo se combinan los totales para el subtotal general.
    // Asumiré que el subtotal general es la suma de los totales de repuestos y trabajos.
    this.extractedData.financiero.subtotal = subtotalRepuestos + subtotalTrabajos;

    // Calcular IVA (asumiendo un 15% como en Ecuador, ajusta si es diferente)
    const ivaRate = 0.15; // Ajusta según la tasa de IVA real
    this.extractedData.financiero.iva = this.extractedData.financiero.subtotal * ivaRate;

    // Calcular Total
    this.extractedData.financiero.total = this.extractedData.financiero.subtotal + this.extractedData.financiero.iva;
  }

  // Funciones para calcular totales
  getTotalRepuestos(): number {
    if (!this.extractedData?.repuestos || !Array.isArray(this.extractedData.repuestos)) {
      return 0;
    }
    
    return this.extractedData.repuestos.reduce((sum: number, item: RepuestoItem) => {
      const total = typeof item.total === 'number' ? item.total : parseFloat(item.total as any) || 0;
      return sum + total;
    }, 0);
  }

  getTotalTrabajos(): number {
    if (!this.extractedData?.trabajos || !Array.isArray(this.extractedData.trabajos)) {
      return 0;
    }
    
    return this.extractedData.trabajos.reduce((sum: number, item: TrabajoItem) => {
      const total = typeof item.total === 'number' ? item.total : parseFloat(item.total as any) || 0;
      return sum + total;
    }, 0);
  }

  // Método para exportar a Excel (CSV)
  exportToExcel(): void {
    if (!this.extractedData) {
      alert('No hay datos para exportar.');
      return;
    }

    let csvContent = '';

    // Información General
    csvContent += 'Información General\n';
    csvContent += 'Campo,Valor\n';
    csvContent += `No. Orden,${this.extractedData.orderNumber}\n`;
    csvContent += `Cliente,${this.extractedData.cliente}\n`;
    csvContent += `Fecha,${this.extractedData.fecha}\n`;
    csvContent += `Asesor,${this.extractedData.asesor}\n`;
    csvContent += `Motivo,${this.extractedData.motivo.replace(/\n/g, ' ')}\n\n`; // Reemplazar saltos de línea en motivo

    // Información del Vehículo
    if (this.extractedData.vehiculo) {
      csvContent += 'Información del Vehículo\n';
      csvContent += 'Campo,Valor\n';
      csvContent += `Marca,${this.extractedData.vehiculo.marca}\n`;
      csvContent += `Modelo,${this.extractedData.vehiculo.modelo}\n`;
      csvContent += `Placa,${this.extractedData.vehiculo.placa}\n`;
      csvContent += `Kilometraje,${this.extractedData.vehiculo.kilometraje}\n`;
      csvContent += `Chasis,${this.extractedData.vehiculo.chasis}\n`;
      csvContent += `Motor,${this.extractedData.vehiculo.motor}\n`;
      csvContent += `Año,${this.extractedData.vehiculo.anio}\n`;
      csvContent += `Color,${this.extractedData.vehiculo.color}\n\n`;
    }

    // Repuestos Utilizados
    if (this.extractedData.repuestos && this.extractedData.repuestos.length > 0) {
      csvContent += 'Repuestos Utilizados\n';
      csvContent += 'Código,Producto,Cantidad,Precio Unitario,Total\n';
      this.extractedData.repuestos.forEach(item => {
        csvContent += `${item.codigo},"${item.producto}",${item.cantidad},${item.precioUnitario},${item.total}\n`;
      });
      csvContent += `,,,,,Total Repuestos:${this.getTotalRepuestos()}\n\n`;
    }

    // Trabajos Realizados
    if (this.extractedData.trabajos && this.extractedData.trabajos.length > 0) {
      csvContent += 'Trabajos Realizados\n';
      csvContent += 'Código,Descripción,Cantidad,Precio Unitario,Total\n';
      this.extractedData.trabajos.forEach(item => {
        csvContent += `${item.codigo},"${item.descripcion}",${item.cantidad},${item.precioUnitario},${item.total}\n`;
      });
      csvContent += `,,,,,Total Trabajos:${this.getTotalTrabajos()}\n\n`;
    }

    // Resumen Financiero
    if (this.extractedData.financiero) {
      csvContent += 'Resumen Financiero\n';
      csvContent += 'Campo,Valor\n';
      csvContent += `Subtotal,${this.extractedData.financiero.subtotal}\n`;
      csvContent += `IVA,${this.extractedData.financiero.iva}\n`;
      csvContent += `Total,${this.extractedData.financiero.total}\n\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // Feature detection for HTML5 download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Orden_Trabajo_${this.extractedData.orderNumber || 'Export'}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Fallback for older browsers
      alert('Tu navegador no soporta la descarga automática. Copia el contenido a un archivo .csv manualmente.');
    }
  }

  // Método para testear el servicio
  testPdfService(): void {
    console.log('=== TEST PDF SERVICE ===');
    console.log('Servicio disponible:', !!this.pdfExtractorService);
    
    if (this.pdfExtractorService) {
      console.log('Método extractDataFromPdf disponible:', typeof this.pdfExtractorService.extractDataFromPdf === 'function');
    } else {
      console.error('El servicio PdfExtractorService no está disponible');
    }
  }

  // Método para limpiar todo
  reset(): void {
    this.extractedData = null;
    this.error = null;
    this.isLoading = false;
    this.debugMode = false;
    this.selectedFile = null;
    
    // Limpiar input de archivo
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}