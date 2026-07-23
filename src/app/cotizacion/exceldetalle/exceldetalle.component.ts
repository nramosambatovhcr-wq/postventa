// sugeridoexcel.component.ts (versión actualizada)
// exceldetalle.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/usuario';
import * as XLSX from 'xlsx';
import { CotizacionService } from 'src/app/services/cotizacion.service';

interface PedidoExcel {
  item?: number;
  linea?: string;
  codigo: string;
  newcodigo?: string;
  chino?: string;
  descripcion: string;
  cantidad: number;
  unidad?: string;
  precioUnitario?: number;
  precioTotal?: number;
  observaciones?: string;
  tipo?: string;
  cot:number;
}


@Component({
  selector: 'app-exceldetalle',
  templateUrl: './exceldetalle.component.html',
  styleUrls: ['./exceldetalle.component.css']
})
export class ExceldetalleComponent implements OnInit {
  usuario: Usuario | null = null;
  loading = false;
  uploading = false;
  excelFile: File | null = null;
  fileData: any[] = [];
  previewData: PedidoExcel[] = [];
  errorMessage = '';
  successMessage = '';
  currentStep = 1;
  requiredColumns = ['ITEM', 'CODIGO','NEW CODIGO', 'DESCRIPCION ESPAÑOL', 'QTY', 'COT'];
  showPreview = false;
  isTemplateDownloaded = false;
  validationErrors: string[] = [];
  invalidRows: number[] = [];
  
  // Variables para el paso 3
  importInProgress = false;
  importComplete = false;
  importFailed = false;
  importProgress = 0;
  processedRows = 0;
  successRows = 0;
  failedRows = 0;
  idcot=0;

  constructor(
    private router: Router,
    private cotizacionService: CotizacionService,
    private reloadService: ReloadService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) { 
    this.route.params.subscribe(params => {
      const id = params['id'];
      this.idcot=id;
      console.log('ID recibido:', id);
    });
  }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
    });
  }

  onFileSelect(event: any): void {
    this.errorMessage = '';
    this.fileData = [];
    
    if (event.target.files.length > 0) {
      this.excelFile = event.target.files[0];
      this.readExcel();
    }
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
        
        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        // Validar columnas requeridas
        if (!this.validateRequiredColumns(data)) {
          this.errorMessage = 'El archivo no contiene las columnas requeridas: ' + this.requiredColumns.join(', ');
          this.excelFile = null;
          this.loading = false;
          return;
        }
        
        this.fileData = data;
        this.validateData();
        this.preparePreviewData();
        this.successMessage = `Se han cargado ${data.length} registros del archivo Excel.`;
        this.currentStep = 2;
        this.loading = false;
      } catch (error) {
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

  validateRequiredColumns(data: any[]): boolean {
    if (data.length === 0) return false;
    
    const firstRow = data[0];
    const headers = Object.keys(firstRow).map(key => key.toLowerCase());
    
    return this.requiredColumns.every(col => 
      headers.some(h => h.includes(col.toLowerCase()))
    );
  }

  findColumnName(data: any, colNameSearch: string): string | null {
    if (!data) return null;
    
    const firstRow = data[0];
    const colNames = Object.keys(firstRow);
    
    return colNames.find(key => 
      key.toLowerCase().includes(colNameSearch.toLowerCase())
    ) || null;
  }

  validateData(): void {
    this.validationErrors = [];
    this.invalidRows = [];
    
    // Encontrar nombres de columnas en el archivo
    const itemCol = this.findColumnName(this.fileData, 'ITEM');
    const codigoCol = this.findColumnName(this.fileData, 'CODIGO');
    const newcodigoCol = this.findColumnName(this.fileData, 'NEW CODIGO');
    const descripcionCol = this.findColumnName(this.fileData, 'DESCRIPCION');
    const qtyCol = this.findColumnName(this.fileData, 'QTY');
    const unitFobCol = this.findColumnName(this.fileData, 'UNIT FOB');
    const totalFobCol = this.findColumnName(this.fileData, 'TOTAL FOB'); // Agregada la columna de precio total

    this.fileData.forEach((row, index) => {
      let rowHasError = false;
      
      // Validar código
      if (!codigoCol || !row[codigoCol] || String(row[codigoCol]).trim() === '') {
        this.validationErrors.push(`Fila ${index + 1}: El código es obligatorio`);
        rowHasError = true;
      }
      
      // Validar descripción
      if (!descripcionCol || !row[descripcionCol] || String(row[descripcionCol]).trim() === '') {
        this.validationErrors.push(`Fila ${index + 1}: La descripción es obligatoria`);
        rowHasError = true;
      }
      
      // Validar cantidad
      if (!qtyCol || !row[qtyCol] || isNaN(Number(row[qtyCol])) || Number(row[qtyCol]) <= 0) {
        this.validationErrors.push(`Fila ${index + 1}: La cantidad debe ser un número positivo`);
        rowHasError = true;
      }
      
      // Validar precio unitario
      if (unitFobCol && row[unitFobCol] !== undefined && row[unitFobCol] !== null) {
        const unitFobStr = String(row[unitFobCol]).replace('$', '').trim();
        const unitFobValue = Number(unitFobStr);
        if (isNaN(unitFobValue) || unitFobValue <= 0) {
          this.validationErrors.push(`Fila ${index + 1}: El precio unitario debe ser un número positivo.`);
          rowHasError = true;
        }
      } else {
        this.validationErrors.push(`Fila ${index + 1}: El precio unitario es obligatorio.`);
        rowHasError = true;
      }

      // Validar precio total
      if (totalFobCol && row[totalFobCol] !== undefined && row[totalFobCol] !== null) {
        const totalFobStr = String(row[totalFobCol]).replace('$', '').trim();
        const totalFobValue = Number(totalFobStr);
        if (isNaN(totalFobValue) || totalFobValue <= 0) {
          this.validationErrors.push(`Fila ${index + 1}: El precio total debe ser un número positivo.`);
          rowHasError = true;
        }
      } else {
        this.validationErrors.push(`Fila ${index + 1}: El precio total es obligatorio.`);
        rowHasError = true;
      }
      
      if (rowHasError) {
        this.invalidRows.push(index);
      }
    });
  }

  preparePreviewData(): void {
    // Encontrar nombres de columnas en el archivo
    const itemCol = this.findColumnName(this.fileData, 'ITEM');
    const lineaCol = this.findColumnName(this.fileData, 'LINE');
    const codigoCol = this.findColumnName(this.fileData, 'CODIGO');
    const newcodigoCol = this.findColumnName(this.fileData, 'NEW CODIGO');
    const chinoCol = this.findColumnName(this.fileData, 'CHINO');
    const descripcionCol = this.findColumnName(this.fileData, 'DESCRIPCION ESPAÑOL');
    const qtyCol = this.findColumnName(this.fileData, 'QTY');
    const unitCol = this.findColumnName(this.fileData, 'UNIT');
    const unitFobCol = this.findColumnName(this.fileData, 'UNIT FOB');
    const totalFobCol = this.findColumnName(this.fileData, 'TOTAL FOB');
    const cotCol = this.findColumnName(this.fileData, 'COT');
    
    this.previewData = this.fileData.map(row => {
      const pedido: PedidoExcel = {
        codigo: codigoCol ? row[codigoCol] || '' : '',
        descripcion: descripcionCol ? row[descripcionCol] || '' : '',
        cantidad: qtyCol ? Number(row[qtyCol] || 0) : 0,
        cot: cotCol ? Number(row[cotCol] || 0) : 0,
      };
      
      // Asignar valores opcionales si existen
      if (itemCol && row[itemCol]) pedido.item = Number(row[itemCol]);
      if (lineaCol && row[lineaCol]) pedido.linea = row[lineaCol];
      if (chinoCol && row[chinoCol]) pedido.chino = row[chinoCol];
      if (unitCol && row[unitCol]) pedido.unidad = row[unitCol];
      
      // Procesar precios (eliminar símbolo $ si existe)
      if (unitFobCol && row[unitFobCol] !== undefined) {
        const unitFobStr = String(row[unitFobCol]).replace('$', '').trim();
        pedido.precioUnitario = isNaN(Number(unitFobStr)) ? 0 : Number(unitFobStr);
      }
      
      if (totalFobCol && row[totalFobCol] !== undefined) {
        const totalFobStr = String(row[totalFobCol]).replace('$', '').trim();
        pedido.precioTotal = isNaN(Number(totalFobStr)) ? 0 : Number(totalFobStr);
      }
      
      return pedido;
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
    
    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append('excelFile', this.excelFile);
    formData.append('idUsuario', this.usuario.id.toString());
    
    // Mostrar un progreso indeterminado mientras se procesa la solicitud
    const progressInterval = setInterval(() => {
      if (this.importProgress < 90) {
        this.importProgress += 2;
      }
    }, 200);
    
    // Llamar al servicio para subir el Excel
    this.cotizacionService.uploadExcel(formData).subscribe({
      next: (response: any) => {
        clearInterval(progressInterval);
        this.importProgress = 100;
        
        if (response && response.details) {
          this.processedRows = response.success + response.failed;
          this.successRows = response.success;
          this.failedRows = response.failed;
          
          // Si hay detalles de filas con error, mostrarlos
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
    this.errorMessage = '';
    this.successMessage = '';
    this.validationErrors = [];
    this.invalidRows = [];
    this.currentStep = 1;
    this.showPreview = false;
    this.importInProgress = false;
    this.importComplete = false;
    this.importFailed = false;
    this.importProgress = 0;
    this.processedRows = 0;
    this.successRows = 0;
    this.failedRows = 0;
  }

  downloadTemplate(): void {
    // Datos para la plantilla con ejemplos basados en la tabla proporcionada
    const template = [
      {
        ITEM: 1,
        LINE: 'SINOTRUK',
        CODIGO: 'EQ153-3202010T',
        'NEW CODIGO': 'N/A',
        CHINO: '前制动蹄铁衬带总成 (一) (油钢父和)',
        'DESCRIPCION ESPAÑOL': 'ZAPATA DE FRENO LH',
        QTY: 10,
        UNIT: 'PCS',
        'UNIT FOB': 3.00,
        'TOTAL FOB': 30.00,
        COT: this.idcot
      },
      {
        ITEM: 2,
        LINE: 'SINOTRUK',
        CODIGO: '812W61150-0113',
        'NEW CODIGO': 'N/A',
        CHINO: '散热器面罩装饰条',
        'DESCRIPCION ESPAÑOL': 'BISEL NIQUELADO DEL CAPOT DELANTERO C7H',
        QTY: 7,
        UNIT: 'PCS',
        'UNIT FOB': 2.00,
        'TOTAL FOB': 14.00,
         COT: this.idcot
      },
      {
        ITEM: 3,
        LINE: 'SINOTRUK',
        CODIGO: '202V10301-6201',
        'NEW CODIGO': 'N/A',
        CHINO: '高压油管组件',
        'DESCRIPCION ESPAÑOL': 'KIT CAÑERIAS MC013',
        QTY: 3,
        UNIT: 'SET',
        'UNIT FOB': 3.00,
        'TOTAL FOB': 9.00,
        COT: this.idcot
      }
    ];
    
    // Crear hoja de instrucciones
    const instructionsData = [
      ['INSTRUCCIONES PARA CARGAR COTIZACIONES'],
      [''],
      ['1. Complete la información en la hoja "Cotizacion" según el formato indicado.'],
      ['2. Las columnas marcadas en ROJO son obligatorias:'],
      ['   • CODIGO: Identificador único del producto'],
      ['   • DESCRIPCION ESPAÑOL: Nombre o descripción del producto'],
      ['   • QTY: Número de unidades (solo valores numéricos)'],
      ['   • UNIT: Unidad de medida'],
      ['   • UNIT FOB: Precio unitario'],
      ['   • TOTAL FOB: Precio total'],
      [''],
      ['3. Las demás columnas son opcionales pero recomendadas:'],
      ['   • ITEM: Número de ítem'],
      ['   • LINE: Línea o marca'],
      ['   • CHINO: Descripción en chino (si aplica)'],
      [''],
      ['4. No modifique los nombres de las columnas ni elimine la primera fila.'],
      ['5. Guarde el archivo y cárguelo en el sistema.'],
      [''],
      ['NOTA: Este formato está optimizado para el sistema de Sugeridos Bodega.']
    ];
    
    // Crear worksheets
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    const ws = XLSX.utils.json_to_sheet(template);
    
    // Crear workbook y añadir las hojas
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');
    XLSX.utils.book_append_sheet(wb, ws, 'Cotizacion');
    
    // Establecer anchos de columnas para la hoja de instrucciones
    const instructionsColWidth = [{ wch: 80 }];
    wsInstructions['!cols'] = instructionsColWidth;
    
    // Establecer ancho de columnas para la hoja de datos
    const colWidth = [
      { wch: 6 },  // ITEM
      { wch: 12 }, // LINE
      { wch: 20 }, // CODIGO
      { wch: 30 }, // CHINO
      { wch: 40 }, // DESCRIPCION ESPAÑOL
      { wch: 6 },  // QTY
      { wch: 8 },  // UNIT
      { wch: 12 }, // UNIT FOB
      { wch: 12 } , // TOTAL FOB
      { wch: 12 }  // COT
    ];
    ws['!cols'] = colWidth;
    
    // Exportar a Excel y descargar
    XLSX.writeFile(wb, 'plantilla_cotizacion.xlsx');
    this.isTemplateDownloaded = true;
  }

  goToList(): void {
    this.router.navigate(['/dashboardcot']);
  }
}