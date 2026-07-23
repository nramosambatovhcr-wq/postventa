import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { InvioceblService } from 'src/app/services/inviocebl.service';
import { ReloadService } from 'src/app/services/reload.service';
import { Usuario } from '../../models/usuario';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { CommonModule, CurrencyPipe } from '@angular/common';

// Interfaz actualizada para mapear todos los campos del Excel
interface DetalleBlExcel {
  item?: number;
  line?: string;
  codigo: string;
  descripcion_espanol: string;
  chino?: string;
  qty?: number;
  unit?: string;
  unit_cost?: number;
  total?: number;
  eta?: string;
  ref?: string;
  bl?: string;
}

// Configuración de validación
interface ValidationConfig {
  MAX_FILE_SIZE: number;
  ALLOWED_EXTENSIONS: string[];
  MAX_ROWS: number;
}



@Component({
  selector: 'app-blprocreateexcel',
  templateUrl: './blprocreateexcel.component.html',
  styleUrls: ['./blprocreateexcel.component.css']
})
export class BlprocreateexcelComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  usuario: Usuario | null = null;
  loading = false;
  uploading = false;
  excelFile: File | any;
  fileData: any[] = [];
  previewData: DetalleBlExcel[] = [];
  errorMessage = '';
  successMessage = '';
  currentStep = 1;
  
  // Configuración de validación
  private readonly VALIDATION_CONFIG: ValidationConfig = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_EXTENSIONS: ['.xlsx', '.xls'],
    MAX_ROWS: 10000
  };

  // Mapeo de columnas actualizado según la imagen
  private readonly COLUMN_MAPPINGS = {
    ITEM: ['ITEM', 'ITEM#', 'NUM', 'NUMBER', '#'],
    LINE: ['LINE', 'LINEA', 'TIPO'],
    CODIGO: ['CODIGO', 'CODE', 'CÓDIGO', 'PART_NUMBER'],
    DESCRIPCION_ESPANOL: ['DESCRIPCION ESPAÑOL', 'DESCRIPCION', 'DESCRIPTION', 'DESC_ESP'],
    CHINO: ['CHINO', 'CHINESE', 'DESC_CHINO', 'DESCRIPCION_CHINO'],
    QTY: ['QTY', 'CANTIDAD', 'QUANTITY', 'CANT'],
    UNIT: ['UNIT', 'UNIDAD', 'UOM', 'MEDIDA'],
    UNIT_FOB: ['UNIT_FOB', 'UNIT COST', 'PRECIO_UNITARIO', 'PRECIO UNITARIO', 'COSTO_UNITARIO'],
    TOTAL: ['TOTAL', 'AMOUNT', 'IMPORTE', 'TOTAL_AMOUNT'],
    ORD: ['OR. PI','OR PI'],
    REF: ['REF', 'REFERENCIA', 'REFERENCE'],
    BL: ['BL', 'BILL_OF_LADING', 'CONOCIMIENTO']
  };
  
  showPreview = false;
  isTemplateDownloaded = false;
  validationErrors: string[] = [];
  invalidRows: number[] = [];

  // Variables para el progreso de importación
  importInProgress = false;
  importComplete = false;
  importFailed = false;
  importProgress = 0;
  processedRows = 0;
  successRows = 0;
  failedRows = 0;

  constructor(
    private blService: InvioceblService,
    private router: Router,
    private authService: AuthService,
    private reloadService: ReloadService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.authService.usuarioActual$
      .pipe(takeUntil(this.destroy$))
      .subscribe(usuario => {
        this.usuario = usuario;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupFileData();
  }

  onFileSelect(event: any): void {
    this.resetValidationState();

    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      
      if (!this.validateFile(file)) {
        return;
      }

      this.excelFile = file;
      this.readExcel();
    }
  }

  private validateFile(file: File): boolean {
    // Validar extensión
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!this.VALIDATION_CONFIG.ALLOWED_EXTENSIONS.includes(fileExtension)) {
      this.errorMessage = `Formato de archivo no válido. Solo se permiten archivos: ${this.VALIDATION_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`;
      return false;
    }

    // Validar tamaño
    if (file.size > this.VALIDATION_CONFIG.MAX_FILE_SIZE) {
      this.errorMessage = `El archivo es demasiado grande. Tamaño máximo permitido: ${this.VALIDATION_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`;
      return false;
    }

    return true;
  }

  private resetValidationState(): void {
    this.errorMessage = '';
    this.fileData = [];
    this.previewData = [];
    this.validationErrors = [];
    this.invalidRows = [];
    this.successMessage = '';
    this.currentStep = 1;
  }

  readExcel(): void {
    if (!this.excelFile) return;

    this.loading = true;
    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convertir a JSON
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (data.length === 0) {
          this.errorMessage = 'El archivo Excel está vacío o no contiene datos válidos.';
          this.loading = false;
          return;
        }

        if (data.length > this.VALIDATION_CONFIG.MAX_ROWS) {
          this.errorMessage = `El archivo contiene demasiados registros. Máximo permitido: ${this.VALIDATION_CONFIG.MAX_ROWS}`;
          this.loading = false;
          return;
        }

        // Validar columnas requeridas
        if (!this.validateRequiredColumns(data)) {
          const missingColumns = this.getMissingColumns(data);
          this.errorMessage = `Faltan columnas requeridas: ${missingColumns.join(', ')}. Descargue la plantilla para ver el formato correcto.`;
          this.loading = false;
          return;
        }

        this.fileData = data;
        this.validateData();
        this.preparePreviewData();
        this.successMessage = `Se cargaron ${data.length} registros del archivo Excel.`;
        this.currentStep = 2;
        this.loading = false;

      } catch (error) {
        this.handleFileReadError(error);
      }
    };

    reader.onerror = () => {
      this.errorMessage = 'Error al leer el archivo. Intente nuevamente.';
      this.loading = false;
    };

    reader.readAsBinaryString(this.excelFile);
  }

  private handleFileReadError(error: any): void {
    console.error('Error reading Excel:', error);
    this.errorMessage = 'Error al procesar el archivo Excel. Verifique que el archivo no esté dañado y tenga el formato correcto.';
    this.excelFile = null;
    this.loading = false;
  }

  private validateRequiredColumns(data: any[]): boolean {
    if (data.length === 0) return false;

    // Corrected to use 'UNIT_FOB' as the key from COLUMN_MAPPINGS
    const requiredColumns = ['CODIGO', 'DESCRIPCION_ESPANOL', 'QTY', 'UNIT_FOB']; 
    const firstRow = data[0];
    const headers = Object.keys(firstRow).map(key => this.normalizeColumnName(key));

    return requiredColumns.every(reqCol => {
      const alternatives = this.COLUMN_MAPPINGS[reqCol as keyof typeof this.COLUMN_MAPPINGS];
      return alternatives.some(alt => 
        headers.some(header => header.includes(this.normalizeColumnName(alt)))
      );
    });
  }

  private getMissingColumns(data: any[]): string[] {
    if (data.length === 0) return Object.keys(this.COLUMN_MAPPINGS);

    // Corrected to use 'UNIT_FOB' as the key from COLUMN_MAPPINGS
    const requiredColumns = ['CODIGO', 'DESCRIPCION_ESPANOL', 'QTY', 'UNIT_FOB']; 
    const firstRow = data[0];
    const headers = Object.keys(firstRow).map(key => this.normalizeColumnName(key));
    
    return requiredColumns.filter(reqCol => {
      const alternatives = this.COLUMN_MAPPINGS[reqCol as keyof typeof this.COLUMN_MAPPINGS];
      return !alternatives.some(alt => 
        headers.some(header => header.includes(this.normalizeColumnName(alt)))
      );
    });
  }

  private normalizeColumnName(name: string): string {
    return name.toLowerCase()
               .trim()
               .replace(/[áàäâ]/g, 'a')
               .replace(/[éèëê]/g, 'e')
               .replace(/[íìïî]/g, 'i')
               .replace(/[óòöô]/g, 'o')
               .replace(/[úùüû]/g, 'u')
               .replace(/ñ/g, 'n')
               .replace(/[^a-z0-9]/g, '');
  }

  private findColumnName(data: any[], searchTerms: string[]): string | null {
    if (!data || data.length === 0) return null;

    const firstRow = data[0];
    const colNames = Object.keys(firstRow);

    return colNames.find(key => 
      searchTerms.some(term => 
        this.normalizeColumnName(key).includes(this.normalizeColumnName(term))
      )
    ) || null;
  }

  private validateData(): void {
    this.validationErrors = [];
    this.invalidRows = [];

    // Encontrar nombres de columnas reales
    const columnMappings = this.getColumnMappings();

    this.fileData.forEach((row, index) => {
      if (!this.validateRow(row, index, columnMappings)) {
        this.invalidRows.push(index);
      }
    });
  }

  private getColumnMappings(): any {
    return {
      itemCol: this.findColumnName(this.fileData, this.COLUMN_MAPPINGS.ITEM),
      lineCol: this.findColumnName(this.fileData, this.COLUMN_MAPPINGS.LINE),
      codigoCol: this.findColumnName(this.fileData, this.COLUMN_MAPPINGS.CODIGO),
      descripcionCol: this.findColumnName(this.fileData, this.COLUMN_MAPPINGS.DESCRIPCION_ESPANOL),
      chinoCol: this.findColumnName(this.fileData, this.COLUMN_MAPPINGS.CHINO),
      qtyCol: this.findColumnName(this.fileData, this.COLUMN_MAPPINGS.QTY),
      unitCol: this.findColumnName(this.fileData, this.COLUMN_MAPPINGS.UNIT),
      unitCostCol: this.findColumnName(this.fileData, this.COLUMN_MAPPINGS.UNIT_FOB), // This correctly uses UNIT_FOB
      totalCol: this.findColumnName(this.fileData, this.COLUMN_MAPPINGS.TOTAL),
      etaCol: this.findColumnName(this.fileData, this.COLUMN_MAPPINGS.ORD),
      refCol: this.findColumnName(this.fileData, this.COLUMN_MAPPINGS.REF),
      blCol: this.findColumnName(this.fileData, this.COLUMN_MAPPINGS.BL)
    };
  }

  private validateRow(row: any, index: number, columnMappings: any): boolean {
    let isValid = true;
    const rowNumber = index + 2; // +2 porque index empieza en 0 y la primera fila son headers

    // Validaciones obligatorias
    if (!this.validateRequiredField(row, columnMappings.codigoCol, 'Código', rowNumber)) {
      isValid = false;
    }

    if (!this.validateRequiredField(row, columnMappings.descripcionCol, 'Descripción', rowNumber)) {
      isValid = false;
    }

    if (!this.validateNumericField(row, columnMappings.qtyCol, 'Cantidad', rowNumber, true)) {
      isValid = false;
    }

    if (!this.validateNumericField(row, columnMappings.unitCostCol, 'Costo unitario', rowNumber, false)) {
      isValid = false;
    }

    // Validaciones opcionales pero que si existen deben ser válidas
    if (columnMappings.totalCol && row[columnMappings.totalCol] && 
        !this.isValidNumber(row[columnMappings.totalCol])) {
      this.validationErrors.push(`Fila ${rowNumber}: Total debe ser un número válido`);
      isValid = false;
    }

    return isValid;
  }

  private validateRequiredField(row: any, columnName: string | null, fieldName: string, rowNumber: number): boolean {
    if (!columnName || !row[columnName] || String(row[columnName]).trim() === '') {
      this.validationErrors.push(`Fila ${rowNumber}: ${fieldName} es obligatorio`);
      return false;
    }
    return true;
  }

  private validateNumericField(row: any, columnName: string | null, fieldName: string, rowNumber: number, mustBePositive: boolean = false): boolean {
    if (!columnName || !row[columnName]) {
      this.validationErrors.push(`Fila ${rowNumber}: ${fieldName} es obligatorio`);
      return false;
    }

    const numValue = this.parseNumber(row[columnName]);
    if (isNaN(numValue) || (mustBePositive && numValue <= 0)) {
      this.validationErrors.push(`Fila ${rowNumber}: ${fieldName} debe ser un número ${mustBePositive ? 'positivo' : 'válido'}`);
      return false;
    }

    return true;
  }

  private isValidNumber(value: any): boolean {
    if (value === undefined || value === null || value === '') return false;
    const numValue = this.parseNumber(value);
    return !isNaN(numValue) && numValue >= 0;
  }

  private preparePreviewData(): void {
    const columnMappings = this.getColumnMappings();

    this.previewData = this.fileData.map(row => {
      const detalle: DetalleBlExcel = {
        codigo: this.getStringValue(row, columnMappings.codigoCol),
        descripcion_espanol: this.getStringValue(row, columnMappings.descripcionCol),
        qty: this.getNumericValue(row, columnMappings.qtyCol),
        unit_cost: this.getNumericValue(row, columnMappings.unitCostCol),
        total: this.getNumericValue(row, columnMappings.totalCol)
      };

      // Campos opcionales
      if (columnMappings.itemCol && row[columnMappings.itemCol]) {
        detalle.item = Number(row[columnMappings.itemCol]);
      }
      if (columnMappings.lineCol && row[columnMappings.lineCol]) {
        detalle.line = String(row[columnMappings.lineCol]);
      }
      if (columnMappings.chinoCol && row[columnMappings.chinoCol]) {
        detalle.chino = String(row[columnMappings.chinoCol]);
      }
      if (columnMappings.unitCol && row[columnMappings.unitCol]) {
        detalle.unit = String(row[columnMappings.unitCol]);
      }
      if (columnMappings.etaCol && row[columnMappings.etaCol]) {
        detalle.eta = String(row[columnMappings.etaCol]);
      }
      if (columnMappings.refCol && row[columnMappings.refCol]) {
        detalle.ref = String(row[columnMappings.refCol]);
      }
      if (columnMappings.blCol && row[columnMappings.blCol]) {
        detalle.bl = String(row[columnMappings.blCol]);
      }

      return detalle;
    });
  }

  private getStringValue(row: any, columnName: string | null): string {
    return columnName && row[columnName] ? String(row[columnName]).trim() : '';
  }

  private getNumericValue(row: any, columnName: string | null): number {
    return columnName && row[columnName] ? this.parseNumber(row[columnName]) : 0;
  }

  private parseNumber(value: any): number {
    if (value === undefined || value === null || value === '') return 0;
    // Remover símbolos de moneda y caracteres especiales, mantener solo números, punto y coma
    const strValue = String(value).replace(/[^\d.,-]/g, '').replace(',', '.');
    return isNaN(Number(strValue)) ? 0 : Number(strValue);
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  nextStep(): void {
    if (this.currentStep === 1 && (!this.excelFile || this.loading)) {
      this.errorMessage = 'Debe seleccionar un archivo Excel válido.';
      return;
    }
    if (this.currentStep === 2 && this.invalidRows.length > 0) {
      this.errorMessage = 'Existen errores de validación que deben corregirse antes de continuar.';
      return;
    }
    if (this.currentStep < 3) {
      this.currentStep++;
      this.errorMessage = '';
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.errorMessage = '';
    }
  }

  async startImport(): Promise<void> {
    if (!this.validateImportConditions()) {
      return;
    }

    this.initializeImportState();

    try {
      const response = await this.performImport();
      this.handleImportSuccess(response);
    } catch (error) {
      this.handleImportError(error);
    }
  }

  private validateImportConditions(): boolean {
    if (!this.usuario) {
      this.errorMessage = 'No hay usuario autenticado. Inicie sesión para importar.';
      return false;
    }

    if (!this.excelFile) {
      this.errorMessage = 'No hay archivo Excel seleccionado para importar.';
      return false;
    }

    if (this.invalidRows.length > 0) {
      this.errorMessage = 'Existen errores de validación. Corríjalos antes de importar.';
      return false;
    }

    return true;
  }

  private initializeImportState(): void {
    this.importInProgress = true;
    this.importProgress = 0;
    this.processedRows = 0;
    this.successRows = 0;
    this.failedRows = 0;
    this.errorMessage = '';
    this.successMessage = '';
  }

  private performImport(): Promise<any> {
    const progressInterval = setInterval(() => {
      if (this.importProgress < 90) {
        this.importProgress += 2;
      }
    }, 200);

    return new Promise((resolve, reject) => {
      this.blService.uploadExcelForInvoiceBl(this.excelFile)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            clearInterval(progressInterval);
            this.importProgress = 100;
            resolve(response);
          },
          error: (error) => {
            clearInterval(progressInterval);
            this.importProgress = 100;
            reject(error);
          }
        });
    });
  }

  private handleImportSuccess(response: any): void {
    if (response && response.success) {
      this.successRows = response.totalProcessed || this.fileData.length;
      this.processedRows = this.successRows;
      this.importComplete = true;
      this.successMessage = `Importación completada exitosamente. ${this.successRows} registros procesados.`;
      this.reloadService.triggerReload();
    } else {
      this.handleImportError(response);
    }
  }

  private handleImportError(error: any): void {
    this.importInProgress = false;
    this.importFailed = true;
    this.failedRows = this.fileData?.length || 0;
    
    console.error('Error durante la importación:', error);
    
    if (error.status === 413) {
      this.errorMessage = 'El archivo es demasiado grande para procesar.';
    } else if (error.status === 415) {
      this.errorMessage = 'Formato de archivo no soportado.';
    } else if (error.status === 400) {
      this.errorMessage = error.error?.message || 'Error en los datos del archivo.';
    } else {
      this.errorMessage = error.error?.message || 'Error al procesar el archivo. Intente nuevamente.';
    }
  }

  resetForm(): void {
    this.cleanupFileData();
    this.resetValidationState();
    this.resetImportState();
    this.showPreview = false;
    this.isTemplateDownloaded = false;
  }

  private cleanupFileData(): void {
    this.excelFile = null;
    this.fileData = [];
    this.previewData = [];
  }

  private resetImportState(): void {
    this.importInProgress = false;
    this.importComplete = false;
    this.importFailed = false;
    this.importProgress = 0;
    this.processedRows = 0;
    this.successRows = 0;
    this.failedRows = 0;
  }

  downloadTemplate(): void {
    const template = [
      {
        ITEM: 1,
        LINE: 'SINOTRUC',
        CODIGO: 'WG9325550800',
        'DESCRIPCION ESPAÑOL': 'TANQUE DE COMBUSTIBLE NUEVO C7H',
        CHINO: '800L铝合金油箱(700x700)',
        QTY: 2,
        UNIT: 'PCS',
        'UNIT_COST': 463.42,
        TOTAL: 926.84,
        ETA: '20240906',
        REF: '240906',
        BL: 'SHE25031407'
      },
      {
        ITEM: 2,
        LINE: 'SINOTRUC',
        CODIGO: 'WG9725550730',
        'DESCRIPCION ESPAÑOL': 'TANQUE DE COMBUSTIBLE',
        CHINO: '300L铝合金油箱(700X700)',
        QTY: 3,
        UNIT: 'PCS',
        'UNIT_COST': 267.95,
        TOTAL: 803.85,
        ETA: '20240906',
        REF: '240906',
        BL: 'SHE25031407'
      }
    ];

    const instructionsData = [
      ['INSTRUCCIONES PARA CARGAR DETALLES DE INVOICE BL'],
      [''],
      ['1. Complete la información en la hoja "Detalle Invoice BL" según el formato indicado.'],
      ['2. Las columnas OBLIGATORIAS son:'],
      ['   • CODIGO: Código del producto'],
      ['   • DESCRIPCION ESPAÑOL: Descripción del producto en español'],
      ['   • QTY: Cantidad (número positivo)'],
      ['   • UNIT_COST: Costo unitario'],
      [''],
      ['3. Las columnas OPCIONALES son:'],
      ['   • ITEM: Número de ítem'],
      ['   • LINE: Línea o tipo de producto'],
      ['   • CHINO: Descripción en chino'],
      ['   • UNIT: Unidad de medida'],
      ['   • TOTAL: Total calculado'],
      ['   • ETA: Fecha estimada de llegada'],
      ['   • REF: Referencia'],
      ['   • BL: Número de conocimiento de embarque'],
      [''],
      ['4. NO modifique los nombres de las columnas.'],
      ['5. Asegúrese de que los datos numéricos estén en formato correcto.'],
      ['6. Guarde el archivo en formato Excel (.xlsx) antes de cargarlo.']
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    const ws = XLSX.utils.json_to_sheet(template);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle Invoice BL');

    // Configurar ancho de columnas
    const instructionsColWidth = [{ wch: 80 }];
    wsInstructions['!cols'] = instructionsColWidth;

    const colWidth = [
      { wch: 8 },   // ITEM
      { wch: 12 },  // LINE
      { wch: 18 },  // CODIGO
      { wch: 45 },  // DESCRIPCION ESPAÑOL
      { wch: 30 },  // CHINO
      { wch: 8 },   // QTY
      { wch: 8 },   // UNIT
      { wch: 12 },  // UNIT_COST
      { wch: 12 },  // TOTAL
      { wch: 12 },  // ETA
      { wch: 10 },  // REF
      { wch: 15 }   // BL
    ];
    ws['!cols'] = colWidth;

    XLSX.writeFile(wb, 'plantilla_invoice_bl.xlsx');
    this.isTemplateDownloaded = true;
  }

  goToList(): void {
    this.router.navigate(['/blpro']);
  }

  // Getters para el template
  get canProceedToStep2(): boolean {
    return this.excelFile !== null && !this.loading && this.fileData.length > 0;
  }

  get canProceedToStep3(): boolean {
    return this.validationErrors.length === 0 && this.invalidRows.length === 0;
  }

  get hasValidationErrors(): boolean {
    return this.validationErrors.length > 0;
  }

  get validRowsCount(): number {
    return this.fileData.length - this.invalidRows.length;
  }
}