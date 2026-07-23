import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { CotizacionService, CrearOrdenCompletaDto, DetalleOrdenDto, AgregarDetallesResponse, AlertasImportacion } from 'src/app/services/cotizacion.service';
import { ProveedorService } from 'src/app/services/proveedor.service';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
 
interface Proveedor {
  id: number;
  nombre: string;
  inicial?: string;
}
 
interface OrdenCreada {
  ordenId: number;
  cotizacionId: number;
  invoiceN: string;
  proveedorNombre: string;
  estado: 'pendiente' | 'exito' | 'error';
  errorMsg?: string;
}

// Alertas devueltas por el backend para una orden específica, con el nombre
// de invoice/proveedor adjunto para poder mostrarlas agrupadas por orden.
interface AlertaPorOrden {
  invoiceN: string;
  proveedorNombre: string;
  alertas: AlertasImportacion;
}

@Component({
  selector: 'app-crear-orden-completa',
  templateUrl: './crear-orden-completa.component.html',
  styleUrls: ['./crear-orden-completa.component.css']
})
export class CrearOrdenCompletaComponent implements OnInit {
 
  // ── Estado general ──────────────────────────────────────────────────────────
  currentStep = 1;
  usuario: Usuario | null = null;
  idus = 0;
 
  // ── Paso 1: Crear órdenes ───────────────────────────────────────────────────
  ordenForm!: FormGroup;
  get invoiceBaseControl(): FormControl { return this.ordenForm.get('invoiceBase') as FormControl; }
  allProveedores: Proveedor[] = [];
  proveedoresSeleccionados: Proveedor[] = [];
  loadingProveedores = false;
  isCreating = false;
  ordenesCreadas: OrdenCreada[] = [];
 
  // ── Paso 2: Cargar Excel ────────────────────────────────────────────────────
  excelFile: File | null = null;
  previewData: DetalleOrdenDto[] = [];
  validationErrors: string[] = [];
  invalidRows: number[] = [];
  loadingExcel = false;
  showPreview = false;
  isTemplateDownloaded = false;
  requiredColumns = ['CODIGO', 'NOMBRE', 'CANTIDAD'];
 
  // ── Paso 3: Importar detalles ───────────────────────────────────────────────
  importInProgress = false;
  importComplete = false;
  importFailed = false;
  importProgress = 0;
  ordenesExito = 0;
  ordenesFallidas = 0;
  totalDetalles = 0;
  errorMessage = '';
  successMessage = '';

  // ── Alertas devueltas por el backend (consolidación, equivalentes duplicados, anomalías) ──
  alertasPorOrden: AlertaPorOrden[] = [];
  totalCodigosConsolidados = 0;
  totalEquivalentesDuplicados = 0;
  totalDuplicadosAnomalos = 0;
 
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private proveedorService: ProveedorService,
    private cotizacionService: CotizacionService
  ) {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      this.idus = Number(this.usuario?.id);
    });
  }
 
  ngOnInit(): void {
    this.initForm();
    this.loadProveedores();
  }
 
  // ── Formulario ──────────────────────────────────────────────────────────────
  initForm(): void {
    this.ordenForm = this.fb.group({
      invoiceBase: ['', [Validators.required, Validators.maxLength(50)]]
    });
  }
 
  // ── Proveedores ─────────────────────────────────────────────────────────────
  loadProveedores(): void {
    this.loadingProveedores = true;
    this.proveedorService.getProveedor().subscribe({
      next: (data: any) => {
        this.allProveedores = data.map((p: any) => ({
          ...p,
          inicial: this.obtenerInicial(p.nombre)
        }));
        this.loadingProveedores = false;
      },
      error: () => {
        this.loadingProveedores = false;
        this.mostrarToast('Error al cargar proveedores', 'error');
      }
    });
  }
 
  obtenerInicial(nombre: string): string {
    if (!nombre) return 'X';
    const palabras = nombre.trim().split(/\s+/);
    if (palabras.length === 1) return nombre.substring(0, 2).toUpperCase();
    return palabras.slice(0, 3).map(p => p.charAt(0)).join('').toUpperCase();
  }
 
  toggleProveedor(proveedor: Proveedor, event: any): void {
    if (event.target.checked) {
      this.proveedoresSeleccionados.push(proveedor);
    } else {
      this.proveedoresSeleccionados = this.proveedoresSeleccionados.filter(p => p.id !== proveedor.id);
    }
  }
 
  isProveedorSeleccionado(id: number): boolean {
    return this.proveedoresSeleccionados.some(p => p.id === id);
  }
 
  generarInvoiceN(base: string, proveedor: Proveedor): string {
    const inicial = proveedor.inicial || this.obtenerInicial(proveedor.nombre);
    return `${inicial}-${base}`;
  }
 
  isFieldInvalid(field: string): boolean {
    const c = this.ordenForm.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
 
  // ── PASO 1: Crear órdenes ───────────────────────────────────────────────────
  crearOrdenes(): void {
    if (this.ordenForm.invalid || this.proveedoresSeleccionados.length === 0) {
      this.ordenForm.markAllAsTouched();
      if (this.proveedoresSeleccionados.length === 0)
        this.mostrarToast('Seleccione al menos un proveedor', 'warning');
      return;
    }
 
    const invoiceBase = this.ordenForm.value.invoiceBase;
    this.isCreating = true;
    this.ordenesCreadas = [];
 
    const requests = this.proveedoresSeleccionados.map(proveedor => {
      const dto: CrearOrdenCompletaDto = {
        invoiceN: this.generarInvoiceN(invoiceBase, proveedor),
        proveedorId: proveedor.id,
        idUsuario: this.idus
      };
      return this.cotizacionService.crearOrdenCompleta(dto);
    });
 
    forkJoin(requests)
      .pipe(finalize(() => { this.isCreating = false; }))
      .subscribe({
        next: (responses) => {
          responses.forEach((res, i) => {
            this.ordenesCreadas.push({
              ordenId: res.ordenId,
              cotizacionId: res.cotizacionId,
              invoiceN: res.invoiceN,
              proveedorNombre: this.proveedoresSeleccionados[i].nombre,
              estado: 'exito'
            });
          });
          this.mostrarToast(`${this.ordenesCreadas.length} orden(es) creadas correctamente`, 'success');
          this.currentStep = 2;
        },
        error: (error: any) => {
          const msg = error?.message || 'Error al crear las órdenes';
          this.mostrarToast(msg, 'error');
        }
      });
  }
 
  // ── PASO 2: Leer Excel ──────────────────────────────────────────────────────
  onFileSelect(event: any): void {
    this.errorMessage = '';
    if (event.target.files.length > 0) {
      this.excelFile = event.target.files[0];
      this.readExcel();
    }
  }
 
  readExcel(): void {
    if (!this.excelFile) return;
    this.loadingExcel = true;
    const reader = new FileReader();
 
    reader.onload = (e: any) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
 
        if (!this.validateRequiredColumns(data)) {
          this.errorMessage = 'Columnas requeridas: ' + this.requiredColumns.join(', ');
          this.excelFile = null;
          this.loadingExcel = false;
          return;
        }
 
        this.validateData(data);
        this.preparePreviewData(data);
        this.loadingExcel = false;
      } catch {
        this.errorMessage = 'Error al leer el archivo Excel.';
        this.excelFile = null;
        this.loadingExcel = false;
      }
    };
 
    reader.onerror = () => {
      this.errorMessage = 'Error al leer el archivo.';
      this.excelFile = null;
      this.loadingExcel = false;
    };
 
    reader.readAsBinaryString(this.excelFile);
  }
 
  findColumnName(data: any[], search: string): string | null {
    if (!data || data.length === 0) return null;
    return Object.keys(data[0]).find(k => k.toLowerCase().includes(search.toLowerCase())) || null;
  }
 
  validateRequiredColumns(data: any[]): boolean {
    if (data.length === 0) return false;
    const headers = Object.keys(data[0]).map(k => k.toLowerCase());
    return this.requiredColumns.every(col => headers.some(h => h.includes(col.toLowerCase())));
  }
 
  validateData(data: any[]): void {
    this.validationErrors = [];
    this.invalidRows = [];

    const codigoCol = this.findColumnName(data, 'CODIGO');
    const descCol   = this.findColumnName(data, 'NOMBRE');
    const qtyCol    = this.findColumnName(data, 'CANTIDAD');

    data.forEach((row, i) => {
      let hasError = false;

      if (!codigoCol || !row[codigoCol] || String(row[codigoCol]).trim() === '') {
        this.validationErrors.push(`Fila ${i + 2}: CODIGO es obligatorio`);
        hasError = true;
      }
      if (!descCol || !row[descCol] || String(row[descCol]).trim() === '') {
        this.validationErrors.push(`Fila ${i + 2}: NOMBRE es obligatorio`);
        hasError = true;
      }
      if (!qtyCol || isNaN(Number(row[qtyCol])) || Number(row[qtyCol]) <= 0) {
        this.validationErrors.push(`Fila ${i + 2}: CANTIDAD_IMP debe ser número positivo`);
        hasError = true;
      }

      if (hasError) this.invalidRows.push(i);
    });
  }
 
  preparePreviewData(data: any[]): void {
    const codigoCol      = this.findColumnName(data, 'CODIGO');
    const nuevoCodigoCol = this.findColumnName(data, 'NUEVO_CODIGO') || this.findColumnName(data, 'NUEVO CODIGO');
    const chinoCol       = this.findColumnName(data, 'CHINO');
    const descCol        = this.findColumnName(data, 'NOMBRE');
    const qtyCol         = this.findColumnName(data, 'CANTIDAD');
    const fobCol         = this.findColumnName(data, 'FOB');
    const vhcrCol        = this.findColumnName(data, 'CODIGO_VHCR') || this.findColumnName(data, 'CODIGO VHCR');

    this.previewData = data.map(row => {
      // Parsear FOB respetando decimales:
      // - Si xlsx ya devuelve un número (ej: 18.55), usarlo directo.
      // - Si es string con formato europeo "1.234,56" → quitar puntos de miles y reemplazar coma → punto.
      // - Si es string con formato americano "1,234.56" → quitar comas de miles.
      // NUNCA hacer replace global de "." sobre un valor que ya sea número o tenga decimal en punto.
      let precioUnitario = 0;
      if (fobCol && row[fobCol] !== undefined && row[fobCol] !== null && row[fobCol] !== '') {
        const rawFob = row[fobCol];
        if (typeof rawFob === 'number') {
          // xlsx lo parseó correctamente, usar directo
          precioUnitario = rawFob;
        } else {
          // Es string: detectar formato y limpiar
          const s = String(rawFob).replace('$', '').trim();
          // Formato europeo: tiene coma decimal y puntos de miles → "1.234,56"
          if (/\d+\.\d{3},\d+/.test(s) || (/,/.test(s) && /\./.test(s) && s.indexOf(',') > s.indexOf('.'))) {
            precioUnitario = parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
          }
          // Solo coma (decimal europeo sin miles): "18,55"
          else if (/^\d+,\d+$/.test(s)) {
            precioUnitario = parseFloat(s.replace(',', '.')) || 0;
          }
          // Formato americano con comas de miles: "1,234.56"
          else if (/,/.test(s) && /\./.test(s) && s.indexOf('.') > s.indexOf(',')) {
            precioUnitario = parseFloat(s.replace(/,/g, '')) || 0;
          }
          // Número directo con punto decimal o sin separadores: "18.55", "1855"
          else {
            precioUnitario = parseFloat(s) || 0;
          }
        }
      }

      return {
        codigo:         codigoCol       ? String(row[codigoCol]       || '').trim() : '',
        descripcion:    descCol         ? String(row[descCol]         || '').trim() : '',
        cantidad:       qtyCol          ? Number(row[qtyCol]          || 0)         : 0,
        chino:          chinoCol && row[chinoCol] ? String(row[chinoCol]).trim() : undefined,
        precioUnitario,
        equivalentCode: nuevoCodigoCol && row[nuevoCodigoCol] ? String(row[nuevoCodigoCol]).trim() : undefined,
        codigoVhcr:     vhcrCol && row[vhcrCol]   ? String(row[vhcrCol]).trim()   : undefined
      };
    });
  }
 
  // ── PASO 3: Importar detalles ───────────────────────────────────────────────
  startImport(): void {
    if (this.previewData.length === 0) {
      this.errorMessage = 'No hay datos para importar.';
      return;
    }
 
    if (this.validationErrors.length > 0) {
      this.mostrarToast('Corrija los errores de validación antes de importar', 'warning');
      return;
    }
 
    const ordenesExitosas = this.ordenesCreadas.filter(o => o.estado === 'exito');
 
    this.importInProgress  = true;
    this.importProgress    = 0;
    this.ordenesExito      = 0;
    this.ordenesFallidas   = 0;
    this.totalDetalles     = 0;
    this.errorMessage      = '';
    this.alertasPorOrden   = [];
    this.totalCodigosConsolidados   = 0;
    this.totalEquivalentesDuplicados = 0;
    this.totalDuplicadosAnomalos     = 0;
 
    const requests = ordenesExitosas.map(orden =>
      this.cotizacionService.agregarDetallesOrden(orden.ordenId, this.previewData)
    );
 
    let completed = 0;
 
    forkJoin(requests)
      .pipe(finalize(() => { this.importInProgress = false; }))
      .subscribe({
        next: (responses) => {
          responses.forEach((res, i) => {
            this.ordenesCreadas[i].estado = 'exito';
            this.ordenesExito++;
            this.totalDetalles += this.previewData.length;
            completed++;
            this.importProgress = Math.round((completed / responses.length) * 100);

            // Log de coincidencias Oracle para diagnóstico
            if (res.oracle_matches) {
              const m = res.oracle_matches;
              console.log(`[Oracle] Orden ${res.ordenId}: ${m.encontrados}/${m.total} encontrados, ${m.no_encontrados} sin match`);
              if (m.no_encontrados > 0) {
                const sinMatch = m.detalles.filter((d: any) => !d.encontrado).map((d: any) => d.codigo);
                console.warn(`[Oracle] Sin match en orden ${res.ordenId}:`, sinMatch);
              }
            }

            // Acumular alertas de consolidación / equivalentes duplicados / anomalías
            if (res.alertas) {
              const tieneAlertas =
                res.alertas.codigos_consolidados?.total > 0 ||
                res.alertas.equivalentes_duplicados?.total > 0 ||
                res.alertas.duplicados_anomalos?.total > 0;

              if (tieneAlertas) {
                this.alertasPorOrden.push({
                  invoiceN: this.ordenesCreadas[i].invoiceN,
                  proveedorNombre: this.ordenesCreadas[i].proveedorNombre,
                  alertas: res.alertas
                });
              }

              this.totalCodigosConsolidados    += res.alertas.codigos_consolidados?.total ?? 0;
              this.totalEquivalentesDuplicados += res.alertas.equivalentes_duplicados?.total ?? 0;
              this.totalDuplicadosAnomalos      += res.alertas.duplicados_anomalos?.total ?? 0;

              if (res.alertas.duplicados_anomalos?.total > 0) {
                console.warn(`[Anomalías] Orden ${res.ordenId}: ${res.alertas.duplicados_anomalos.total} fila(s) en conflicto sin guardar`, res.alertas.duplicados_anomalos.detalles);
              }
            }
          });
          this.importComplete = true;

          // Calcular totales Oracle globales para el mensaje
          const totalEncontrados  = responses.reduce((acc, r) => acc + (r.oracle_matches?.encontrados    ?? 0), 0);
          const totalNoEncontrados = responses.reduce((acc, r) => acc + (r.oracle_matches?.no_encontrados ?? 0), 0);
          const oracleInfo = totalNoEncontrados > 0
            ? ` | Oracle: ${totalEncontrados} con código VHCR, ${totalNoEncontrados} sin match.`
            : ` | Oracle: todos los códigos encontrados.`;

          const alertasInfo = (this.totalCodigosConsolidados + this.totalEquivalentesDuplicados + this.totalDuplicadosAnomalos) > 0
            ? ` | Revisar alertas abajo.`
            : '';

          this.successMessage = `${this.ordenesExito} orden(es) procesadas con ${this.totalDetalles} detalles cargados.${oracleInfo}${alertasInfo}`;

          if (this.totalDuplicadosAnomalos > 0) {
            this.mostrarToast(`Importación completada con ${this.totalDuplicadosAnomalos} fila(s) en conflicto sin guardar. Revise las alertas.`, 'warning');
          } else {
            this.mostrarToast(`${this.ordenesExito} orden(es) importadas correctamente`, 'success');
          }
        },
        error: (error: HttpErrorResponse) => {
          this.importFailed = true;
          this.errorMessage = error?.message || 'Error al importar los detalles.';
          this.mostrarToast(this.errorMessage, 'error');
        }
      });
  }
 
  // ── Plantilla Excel ─────────────────────────────────────────────────────────
  downloadTemplate(): void {
    const template = [
      {
        CODIGO: '202V09100-7830',
        CODIGO_VHCR: '202V09100-7830',
        NUEVO_CODIGO: '202V09100-7806',
        NOMBRE: 'TURBO CARGADOR 5329222 HOLSET MC13.54',
        CHINO: '涡轮增压器',       
        CANTIDAD_IMP: 40,
        FOB: 443.11,
        TOTAL: 17724.40
      },
      {
        CODIGO: 'EQ153-3202010T',
        CODIGO_VHCR: '',  
        NUEVO_CODIGO: '',
        NOMBRE: 'ZAPATA DE FRENO LH',          // puede ir vacío si no se conoce
        CHINO: '',        
        CANTIDAD_IMP: 10,
        FOB: 25.50,
        TOTAL: 255.00
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [
      { wch: 22 }, // CODIGO
      { wch: 22 }, // NUEVO_CODIGO
      { wch: 22 }, // CODIGO_VHCR
      { wch: 18 }, // CHINO
      { wch: 45 }, // NOMBRE
      { wch: 14 }, // CANTIDAD_IMP
      { wch: 12 }, // FOB
      { wch: 14 }  // TOTAL
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalles');
    XLSX.writeFile(wb, 'plantilla_detalles_orden.xlsx');
    this.isTemplateDownloaded = true;
  }
 
  // ── Navegación ──────────────────────────────────────────────────────────────
  nextStep(): void {
    if (this.currentStep < 3) this.currentStep++;
    this.errorMessage = '';
  }
 
  previousStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }
 
  resetForm(): void {
    this.currentStep       = 1;
    this.ordenesCreadas    = [];
    this.proveedoresSeleccionados = [];
    this.excelFile         = null;
    this.previewData       = [];
    this.validationErrors  = [];
    this.invalidRows       = [];
    this.showPreview       = false;
    this.importInProgress  = false;
    this.importComplete    = false;
    this.importFailed      = false;
    this.importProgress    = 0;
    this.ordenesExito      = 0;
    this.ordenesFallidas   = 0;
    this.totalDetalles     = 0;
    this.errorMessage      = '';
    this.successMessage    = '';
    this.alertasPorOrden   = [];
    this.totalCodigosConsolidados    = 0;
    this.totalEquivalentesDuplicados = 0;
    this.totalDuplicadosAnomalos     = 0;
    this.ordenForm.reset();
  }
 
  goToDashboard(): void {
    this.router.navigate(['/dashboardinvoi']);
  }
 
  // ── Toast ───────────────────────────────────────────────────────────────────
  mostrarToast(mensaje: string, tipo: 'success' | 'error' | 'warning'): void {
    const colores = { success: '#4CAF50', error: '#e62c17', warning: '#ffc107' };
    const textColor = tipo === 'warning' ? '#343a40' : 'white';
    const duracion  = tipo === 'error' ? 7000 : tipo === 'warning' ? 5000 : 3000;
 
    const toast = document.createElement('div');
    toast.innerText = mensaje;
    Object.assign(toast.style, {
      position: 'fixed', top: '20px', right: '20px',
      backgroundColor: colores[tipo], color: textColor,
      padding: '15px 20px', borderRadius: '4px', zIndex: '9999',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)', fontFamily: 'Arial, sans-serif',
      transition: 'opacity 0.5s ease', opacity: '1', maxWidth: '400px'
    });
 
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 500);
    }, duracion);
  }
}