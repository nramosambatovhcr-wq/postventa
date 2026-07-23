import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CotizacionService } from 'src/app/services/cotizacion.service';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';
import * as XLSX from 'xlsx';
import { HttpErrorResponse } from '@angular/common/http';

interface DetalleExcel {
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
  esDuplicadoConsolidado?: boolean;   // true si esta fila fusionó 2+ filas del Excel
  cantidadOriginalFilas?: number;      // cuántas filas del Excel se fusionaron
}

interface CotizacionSeleccionable {
  cotizacionId: number;
  codigoCot: string;
  ProveedorId: string;
  estadoCotizacion: string;
  fechaSolicitud: string;
  Cotigeneral: string;
  proveedor: { nombre: string };
  selected: boolean;
}

@Component({
  selector: 'app-exceldetalle-multiple',
  templateUrl: './exceldetalle-multiple.component.html',
  styleUrls: ['./exceldetalle-multiple.component.css']
})
export class ExceldetalleMultipleComponent implements OnInit {
  usuario: Usuario | null = null;
  loading = false;
  excelFile: File | null = null;
  previewData: DetalleExcel[] = [];
  errorMessage = '';
  successMessage = '';
  currentStep = 1;
  requiredColumns = ['CODIGO', 'DESCRIPCION ESPAÑOL', 'QTY'];
  showPreview = false;
  isTemplateDownloaded = false;
  validationErrors: string[] = [];
  invalidRows: number[] = [];
  duplicatesInfo: { codigo: string; descripcion: string; filasOriginales: number; cantidadTotal: number }[] = [];

  cotizacionesRecientes: CotizacionSeleccionable[] = [];
  cotizacionesSeleccionadas: CotizacionSeleccionable[] = [];
  loadingCotizaciones = false;
  selectAll = true;

  importInProgress = false;
  importComplete = false;
  importFailed = false;
  importProgress = 0;
  processedCotizaciones = 0;
  successCotizaciones = 0;
  failedCotizaciones = 0;
  totalDetalles = 0;

  constructor(
    private router: Router,
    private cotizacionService: CotizacionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario) {
        this.loadCotizacionesRecientes();
      }
    });
  }

  loadCotizacionesRecientes(): void {
    this.loadingCotizaciones = true;
    this.cotizacionService.getCotizacionesSinDetalles().subscribe({
      next: (data: any) => {
        const todasCotizaciones = Array.isArray(data) ? data : [];
        this.cotizacionesRecientes = todasCotizaciones
          .filter((cot: any) =>
            cot.usuario === this.usuario?.id &&
            !['Aprobada', 'Rechazada', 'Asignada'].includes(cot.estadoCotizacion)
          )
          .sort((a: any, b: any) => {
            const dateA = new Date(a.fechaSolicitud || a.created_at).getTime();
            const dateB = new Date(b.fechaSolicitud || b.created_at).getTime();
            return dateB - dateA;
          })
          .slice(0, 10)
          .map((cot: any) => ({
            ...cot,
            selected: true
          }));

        this.selectAll = true;
        this.updateSelectedCotizaciones();
        this.loadingCotizaciones = false;
      },
      error: (error) => {
        console.error('Error al cargar cotizaciones:', error);
        this.loadingCotizaciones = false;
        this.mostrarToast('Error al cargar cotizaciones recientes', 'error');
      }
    });
  }

  toggleSelectAll(): void {
    this.cotizacionesRecientes.forEach(cot => cot.selected = this.selectAll);
    this.updateSelectedCotizaciones();
  }

  updateSelectedCotizaciones(): void {
    this.cotizacionesSeleccionadas = this.cotizacionesRecientes.filter(cot => cot.selected);

    const allSelected = this.cotizacionesRecientes.every(cot => cot.selected);
    const noneSelected = this.cotizacionesRecientes.every(cot => !cot.selected);

    if (allSelected) {
      this.selectAll = true;
    } else if (noneSelected) {
      this.selectAll = false;
    } else {
      this.selectAll = false;
    }

    if (this.cotizacionesSeleccionadas.length > 0) {
      this.errorMessage = '';
    }
  }

  onFileSelect(event: any): void {
    this.errorMessage = '';
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
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (!this.validateRequiredColumns(data)) {
          this.errorMessage = 'El archivo no contiene las columnas requeridas: ' + this.requiredColumns.join(', ');
          this.excelFile = null;
          this.loading = false;
          return;
        }

        this.validateData(data);
        this.preparePreviewData(data);
        this.successMessage = `Se han cargado ${data.length} registros del archivo Excel.`;
        this.currentStep = 2;
        this.loading = false;
      } catch (error) {
        this.errorMessage = 'Error al leer el archivo Excel.';
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
    if (!data || data.length === 0) return null;
    const firstRow = data[0];
    const colNames = Object.keys(firstRow);
    return colNames.find(key =>
      key.toLowerCase().includes(colNameSearch.toLowerCase())
    ) || null;
  }

  validateData(data: any[]): void {
    this.validationErrors = [];
    this.invalidRows = [];

    const codigoCol = this.findColumnName(data, 'CODIGO');
    const descripcionCol = this.findColumnName(data, 'DESCRIPCION');
    const qtyCol = this.findColumnName(data, 'QTY');

    data.forEach((row, index) => {
      let rowHasError = false;

      if (!codigoCol || !row[codigoCol] || String(row[codigoCol]).trim() === '') {
        this.validationErrors.push(`Fila ${index + 2}: El código es obligatorio`);
        rowHasError = true;
      }

      if (!descripcionCol || !row[descripcionCol] || String(row[descripcionCol]).trim() === '') {
        this.validationErrors.push(`Fila ${index + 2}: La descripción es obligatoria`);
        rowHasError = true;
      }

      if (!qtyCol || !row[qtyCol] || isNaN(Number(row[qtyCol])) || Number(row[qtyCol]) <= 0) {
        this.validationErrors.push(`Fila ${index + 2}: La cantidad debe ser un número positivo`);
        rowHasError = true;
      }

      if (rowHasError) {
        this.invalidRows.push(index);
      }
    });
  }

  preparePreviewData(data: any[]): void {
    const itemCol      = this.findColumnName(data, 'ITEM');
    const lineaCol     = this.findColumnName(data, 'LINE');
    const codigoCol    = this.findColumnName(data, 'CODIGO');
    const newcodigoCol = this.findColumnName(data, 'NEW CODIGO');
    const chinoCol     = this.findColumnName(data, 'CHINO');
    const descripcionCol = this.findColumnName(data, 'DESCRIPCION');
    const qtyCol       = this.findColumnName(data, 'QTY');
    const unitCol      = this.findColumnName(data, 'UNIT');
    const unitFobCol   = this.findColumnName(data, 'UNIT FOB');
    const totalFobCol  = this.findColumnName(data, 'TOTAL FOB');

    // Mapear filas crudas
    const rawRows: DetalleExcel[] = data.map(row => {
      const detalle: DetalleExcel = {
        codigo:      codigoCol      ? String(row[codigoCol]      || '').trim() : '',
        descripcion: descripcionCol ? String(row[descripcionCol] || '').trim() : '',
        cantidad:    qtyCol         ? Number(row[qtyCol]         || 0)         : 0
      };

      if (itemCol      && row[itemCol])      detalle.item      = Number(row[itemCol]);
      if (lineaCol     && row[lineaCol])     detalle.linea     = String(row[lineaCol]);
      if (newcodigoCol && row[newcodigoCol]) detalle.newcodigo = String(row[newcodigoCol]);
      if (chinoCol     && row[chinoCol])     detalle.chino     = String(row[chinoCol]);
      if (unitCol      && row[unitCol])      detalle.unidad    = String(row[unitCol]);

      if (unitFobCol && row[unitFobCol] !== undefined) {
        detalle.precioUnitario = this.parseFobValue(row[unitFobCol]);
      }
      if (totalFobCol && row[totalFobCol] !== undefined) {
        detalle.precioTotal = this.parseFobValue(row[totalFobCol]);
      }

      return detalle;
    });

    // ── Consolidar duplicados por código ──────────────────────────────────────
    this.duplicatesInfo = [];
    const seen = new Map<string, DetalleExcel>();

    rawRows.forEach(row => {
      const key = row.codigo.toLowerCase();
      if (seen.has(key)) {
        const existing = seen.get(key)!;
        existing.cantidad += row.cantidad;
        existing.precioTotal = (existing.precioTotal || 0) + (row.precioTotal || 0);
        existing.cantidadOriginalFilas = (existing.cantidadOriginalFilas || 1) + 1;
        existing.esDuplicadoConsolidado = true;
      } else {
        seen.set(key, { ...row, cantidadOriginalFilas: 1, esDuplicadoConsolidado: false });
      }
    });

    this.previewData = Array.from(seen.values());

    // Registrar resumen de los que sí se fusionaron (2+ filas)
    this.duplicatesInfo = this.previewData
      .filter(r => r.esDuplicadoConsolidado)
      .map(r => ({
        codigo:          r.codigo,
        descripcion:     r.descripcion,
        filasOriginales: r.cantidadOriginalFilas || 2,
        cantidadTotal:   r.cantidad
      }));
  }

  /** Parsea un valor FOB respetando decimales (número o string en cualquier formato) */
  private parseFobValue(value: any): number {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    const s = String(value).replace(/[$\s]/g, '').trim();
    if (!s) return 0;
    // Europeo con miles: "1.234,56"
    if (/\d+\.\d{3},\d+/.test(s) || (/,/.test(s) && /\./.test(s) && s.indexOf(',') > s.indexOf('.'))) {
      return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    }
    // Solo coma decimal: "18,55"
    if (/^\d+,\d+$/.test(s)) return parseFloat(s.replace(',', '.')) || 0;
    // Americano con miles: "1,234.56"
    if (/,/.test(s) && /\./.test(s) && s.indexOf('.') > s.indexOf(',')) {
      return parseFloat(s.replace(/,/g, '')) || 0;
    }
    return parseFloat(s) || 0;
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      this.updateSelectedCotizaciones();
      if (this.cotizacionesSeleccionadas.length === 0) {
        this.errorMessage = 'Debe seleccionar al menos una cotización para continuar.';
        return;
      }
    }

    if (this.currentStep < 3) {
      this.currentStep++;
      this.errorMessage = '';
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  startImport(): void {
    if (!this.usuario || !this.excelFile) {
      this.errorMessage = 'No hay usuario autenticado o archivo Excel.';
      return;
    }

    this.updateSelectedCotizaciones();

    if (this.cotizacionesSeleccionadas.length === 0) {
      this.errorMessage = 'No hay cotizaciones seleccionadas para cargar detalles';
      return;
    }

    if (this.previewData.length === 0) {
      this.errorMessage = 'No hay datos para importar';
      return;
    }

    const cotizacionIds = this.cotizacionesSeleccionadas.map(cot => cot.cotizacionId.toString());
    const formData = new FormData();
    formData.append('excelFile', this.excelFile);

    cotizacionIds.forEach(id => {
      formData.append('cotizationIds', id);
    });

    // Enviar códigos consolidados para que el backend los marque con es_consolidado = true
    this.duplicatesInfo.forEach(dup => {
      formData.append('consolidatedCodes', dup.codigo);
    });

    this.importInProgress = true;
    this.importProgress = 1;
    this.processedCotizaciones = 0;
    this.successCotizaciones = 0;
    this.failedCotizaciones = 0;
    this.totalDetalles = this.previewData.length * this.cotizacionesSeleccionadas.length;
    this.errorMessage = '';

    this.cotizacionService.uploadExcelMasivoTra(formData).subscribe({
      next: (response: any) => {
        this.successCotizaciones = response.success || 0;
        this.failedCotizaciones = response.failed || 0;
        this.totalDetalles = response.total || 0;
        this.processedCotizaciones = this.cotizacionesSeleccionadas.length;
        this.importProgress = 100;
        this.completeImport(this.successCotizaciones > 0);
        this.mostrarToast(`Importación masiva completada: ${this.successCotizaciones} detalles cargados de un total de ${this.totalDetalles}.`, 'success');
      },
      error: (error: HttpErrorResponse) => {
        const errorMsg = error.error?.message || error.error || error.message || 'Error al realizar la importación masiva.';
        this.errorMessage = errorMsg;
        this.processedCotizaciones = this.cotizacionesSeleccionadas.length;
        this.importProgress = 100;
        this.completeImport(false);
        this.mostrarToast('Error en la importación masiva. ' + errorMsg, 'error');
      }
    });
  }

  completeImport(success: boolean = true): void {
    this.importInProgress = false;
    this.importProgress = 100;

    if (success) {
      this.importComplete = true;
      this.successMessage = `Importación completada. Detalles exitosos: ${this.successCotizaciones}, Detalles fallidos: ${this.failedCotizaciones}. Total de detalles intentados: ${this.totalDetalles}`;
    } else {
      this.importFailed = true;
      this.successMessage = '';
    }
  }

  resetForm(): void {
    this.excelFile = null;
    this.previewData = [];
    this.errorMessage = '';
    this.successMessage = '';
    this.validationErrors = [];
    this.duplicatesInfo = [];
    this.invalidRows = [];
    this.currentStep = 1;
    this.showPreview = false;
    this.importInProgress = false;
    this.importComplete = false;
    this.importFailed = false;
    this.importProgress = 0;
    this.processedCotizaciones = 0;
    this.successCotizaciones = 0;
    this.failedCotizaciones = 0;
    this.totalDetalles = 0;
    this.loadCotizacionesRecientes();
  }

  downloadTemplate(): void {
    const template = [
      {
        ITEM: 1,
        LINE: 'SINOTRUK',
        CODIGO: 'EQ153-3202010T',
        'DESCRIPCION ESPAÑOL': 'ZAPATA DE FRENO LH',
        QTY: 10
      },
      {
        ITEM: 2,
        LINE: 'SINOTRUK',
        CODIGO: '812W61150-0113',
        'DESCRIPCION ESPAÑOL': 'BISEL NIQUELADO DEL CAPOT DELANTERO C7H',
        QTY: 7
      }
    ];

    const cotizacionesCount = this.cotizacionesRecientes.filter(c => c.selected).length;

    const instructionsData = [
      ['INSTRUCCIONES PARA CARGAR DETALLES MÚLTIPLES'],
      [''],
      ['Este archivo cargará los mismos detalles a SOLO las cotizaciones que SELECCIONE en el sistema.'],
      [''],
      ['1. Complete la información en la hoja "Detalles" según el formato indicado.'],
      ['2. Columnas obligatorias (marcadas en ROJO):'],
      ['   • CODIGO: Identificador único del producto'],
      ['   • DESCRIPCION ESPAÑOL: Nombre o descripción del producto'],
      ['   • QTY: Número de unidades (solo valores numéricos)'],
      [''],
      ['3. Guarde el archivo y cárguelo en el sistema.'],
      [''],
      [`NOTA: Se aplicarán estos detalles a ${cotizacionesCount} cotización(es) seleccionada(s).`]
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();

    //XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');
    XLSX.utils.book_append_sheet(wb, ws, 'Detalles');

    wsInstructions['!cols'] = [{ wch: 80 }];
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 20 }, { wch: 40 },
      { wch: 15 }, { wch: 40 }, { wch: 6 }, { wch: 8 },
      { wch: 12 }, { wch: 12 }
    ];

    XLSX.writeFile(wb, 'plantilla_detalles_cotizacion.xlsx');
    this.isTemplateDownloaded = true;
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'error' | 'warning'): void {
    const colores = {
      success: '#4CAF50',
      error: '#e62c17',
      warning: '#ffc107'
    };

    const textColor = tipo === 'warning' ? '#343a40' : 'white';
    const duracion = tipo === 'error' ? 7000 : tipo === 'warning' ? 5000 : 3000;

    const toast = document.createElement('div');
    toast.innerText = mensaje;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = colores[tipo];
    toast.style.color = textColor;
    toast.style.padding = '15px 20px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    toast.style.fontFamily = 'Arial, sans-serif';
    toast.style.transition = 'opacity 0.5s ease';
    toast.style.opacity = '1';
    toast.style.maxWidth = '400px';

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 500);
    }, duracion);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboardcot']);
  }

  goToCrearMultiple(): void {
    this.router.navigate(['/crearcot-multiple']);
  }
}