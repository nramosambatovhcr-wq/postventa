import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BlService } from 'src/app/services/bl.service';
import * as XLSX from 'xlsx';
import { HttpClient } from '@angular/common/http';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface UploadProgress {
  fileName: string;
  progress: number;       // 0-100
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
}

interface ImageState {
  loaded: boolean;
  error: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-revisionbl',
  templateUrl: './revisionbl.component.html',
  styleUrls: ['./revisionbl.component.css']
})
export class RevisionblComponent implements OnInit {

  apiData: any[] = [];
  filteredData: any[] = [];
  blId: any;
  errorMessage: any;

  // ── Loading / streaming ──
  isLoading: boolean = false;
  loadedCount: number = 0;       // cuántas filas ya se mostraron
  totalCount: number = 0;        // total que llegó del backend
  private chunkTimer: any = null;
  private readonly CHUNK_SIZE = 8;   // filas que se agregan por tick
  private readonly CHUNK_DELAY = 40; // ms entre cada chunk

  currentInvoiceName: string = '';
  isRefreshing: boolean = false;
  editModeEnabled: boolean = false;

  // ── Búsqueda ──
  searchTerm: string = '';
  searchField: string = 'all';
  searchFields = [
    { value: 'all',              label: 'Todos los campos' },
    { value: 'invoiceBlNombre',  label: 'Factura' },
    { value: 'codigoProducto',   label: 'Código' },
    { value: 'descripcionFinal', label: 'Descripción' },
    { value: 'ubicacion',        label: 'Ubicación P.' },
    { value: 'ubicacionf',       label: 'Ubicación F.' },
    { value: 'estado',           label: 'Estado' },
    { value: 'observacion',      label: 'Observación' },
    { value: 'nombreUsuario',    label: 'Usuario' }
  ];

  // ── Filtros por estado ──────────────────────────────────────────────────────
  filterEstado:  string = '';   // '' = todos
  filterEstado2: string = '';   // '' = todos, '__sin__' = sin estado 2
  estadoOptions:  string[] = [];
  estado2Options: string[] = [];

  availableStates2: string[] = [
    'faltante', 'sobrante', 'cruce', 'descomposicion',
    'composicion', 'variacion costo', 'activo fijo', 'otros'
  ];

  estado2BadgeClass: Record<string, string> = {
    'faltante':       'badge-danger',
    'sobrante':       'badge-success',
    'cruce':          'badge-info',
    'descomposicion': 'badge-warning',
    'composicion':    'badge-primary',
    'variacion costo':'badge-purple',
    'activo fijo':    'badge-dark',
    'otros':          'badge-neutral'
  };

  // ── Modal ──
  showImageModal: boolean = false;
  selectedImage: any = null;
  selectedItem: any = null;

  // ── MEJORA 1: Upload progress ──────────────────────────────────────────────
  uploadQueue: UploadProgress[] = [];

  get isUploading(): boolean {
    return this.uploadQueue.some(f => f.status === 'uploading' || f.status === 'pending');
  }

  get totalUploadProgress(): number {
    if (!this.uploadQueue.length) return 0;
    const sum = this.uploadQueue.reduce((acc, f) => acc + f.progress, 0);
    return Math.round(sum / this.uploadQueue.length);
  }

  // ── MEJORA 2: Estado de lazy loading por imagen ───────────────────────────
  imageStates: Map<string, ImageState> = new Map();

  // ── CARDS DE RESUMEN ──────────────────────────────────────────────────────
  get totalCodigos(): number {
    return this.apiData.length;
  }

  get totalCodigosRevisados(): number {
    return this.apiData.filter(
      item => item.cantidadVerificada != null && Number(item.cantidadVerificada) > 0
    ).length;
  }

  get totalCantidadRevisada(): number {
    return this.apiData.reduce((acc, item) => acc + (Number(item.cantidadVerificada) || 0), 0);
  }

  get porcentajeRevisado(): number {
    if (!this.totalCodigos) return 0;
    return Math.round((this.totalCodigosRevisados / this.totalCodigos) * 100);
  }

  // ── Estado de filtros ─────────────────────────────────────────────────────
  get hasActiveFilters(): boolean {
    return !!(this.searchTerm.trim() || this.filterEstado || this.filterEstado2);
  }

  // ── IMÁGENES PROGRESIVAS ──────────────────────────────────────────────────
  // Conjunto de URLs que ya fueron "autorizadas" a mostrarse, una por una
  visibleImages: Set<string> = new Set();
  private imgRevealTimer: any = null;

  /**
   * Recopila todas las URLs de imágenes del dataset completo y
   * las va revelando una a una con un delay, simulando carga progresiva
   * en segundo plano una vez que toda la tabla ya está visible.
   */
  private startSequentialImageReveal(data: any[]): void {
    if (this.imgRevealTimer) clearInterval(this.imgRevealTimer);
    this.visibleImages = new Set();

    // Aplanar todas las URLs en orden de fila
    const allUrls: string[] = [];
    data.forEach(item => {
      (item.imagenes || []).forEach((img: any) => {
        const url = this.getImageUrl(img.url);
        if (url) allUrls.push(url);
      });
    });

    if (!allUrls.length) return;

    let idx = 0;
    this.imgRevealTimer = setInterval(() => {
      if (idx >= allUrls.length) {
        clearInterval(this.imgRevealTimer);
        return;
      }
      // Crear nuevo Set para que Angular detecte el cambio
      this.visibleImages = new Set(this.visibleImages).add(allUrls[idx]);
      idx++;
    }, 150); // 150ms entre cada imagen
  }

  isImageVisible(url: string): boolean {
    return this.visibleImages.has(url);
  }

  // ── MEJORA 3: Toast notifications ────────────────────────────────────────
  toasts: { id: number; message: string; type: 'success' | 'error' | 'info' }[] = [];
  private toastCounter = 0;

  private readonly BASE_IMAGE_URL = 'https://bodega.vehicentro.com:1830/api/api/LiquidacionBl/imagen/';

  constructor(
    private blService: BlService,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.blId = +idParam;
        this.loadLiquidacionesData();
      } else {
        this.errorMessage = 'No se proporcionó un ID de BL.';
      }
    });
  }

  // ─── Datos ─────────────────────────────────────────────────────────────────

  toggleEditMode(): void { this.editModeEnabled = !this.editModeEnabled; }

  toggleVerificacion(item: any): void {
    item.cantidadVerificada = item.verificacionChecked ? item.cantidad : null;
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.isLoading = true;
    this.loadedCount = 0;
    this.totalCount = 0;
    this.filteredData = [];
    this.blService.getAllLiquidacionesDetalladasid(this.blId).subscribe({
      next: (data) => {
        const processed = this.processDataWithFinalDescription(data);
        this.apiData = processed;
        this.currentInvoiceName = this.apiData[0]?.invoiceBlNombre ?? 'Sin nombre';
        this.totalCount = processed.length;
        this.buildFilterOptions();
        this.streamChunks(processed);
        this.isRefreshing = false;
      },
      error: () => {
        this.isRefreshing = false;
        this.isLoading = false;
        this.showToast('Error al actualizar los datos.', 'error');
      }
    });
  }

  private loadLiquidacionesData(): void {
    this.isLoading = true;
    this.loadedCount = 0;
    this.totalCount = 0;
    this.blService.getAllLiquidacionesDetalladasid(this.blId).subscribe({
      next: (data) => {
        const processed = this.processDataWithFinalDescription(data);
        this.apiData = processed;
        this.currentInvoiceName = this.apiData[0]?.invoiceBlNombre ?? 'Sin nombre';
        this.totalCount = processed.length;
        this.filteredData = [];
        this.buildFilterOptions();
        this.streamChunks(processed);
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar los datos de liquidaciones.';
      }
    });
  }

  /** Agrega filas en chunks para efecto de carga progresiva */
  private streamChunks(allData: any[]): void {
    if (this.chunkTimer) clearInterval(this.chunkTimer);
    let offset = 0;
    this.chunkTimer = setInterval(() => {
      const slice = allData.slice(offset, offset + this.CHUNK_SIZE);
      if (slice.length === 0) {
        clearInterval(this.chunkTimer);
        this.isLoading = false;
        this.afterStreamComplete(allData);
        return;
      }
      this.filteredData = [...this.filteredData, ...slice];
      this.loadedCount = this.filteredData.length;
      offset += this.CHUNK_SIZE;
      if (offset >= allData.length) {
        clearInterval(this.chunkTimer);
        this.isLoading = false;
        this.loadedCount = allData.length;
        this.afterStreamComplete(allData);
      }
    }, this.CHUNK_DELAY);
  }

  /** Al terminar el streaming: re-aplicar filtros activos e iniciar revelado de imágenes */
  private afterStreamComplete(allData: any[]): void {
    if (this.hasActiveFilters) this.applyAllFilters();
    this.startSequentialImageReveal(allData);
  }

  private processDataWithFinalDescription(data: any[]): any[] {
    return data.map(item => ({
      ...item,
      descripcionFinal:    this.getDescripcionFinal(item),
      descripcionOriginal: item.descripcionEspanol
    }));
  }

  getDescripcionFinal(item: any): string {
    return item.descripcionActualizada?.trim() || item.descripcionEspanol || 'Sin descripción';
  }

  hasDescripcionActualizada(item: any): boolean {
    return !!(item.descripcionActualizada?.trim());
  }

  // ─── Filtros por estado ─────────────────────────────────────────────────────

  /** Construye las opciones de los combos a partir de los valores reales del dataset */
  private buildFilterOptions(): void {
    const estados = new Set<string>();
    const estados2 = new Set<string>();

    this.apiData.forEach(item => {
      const e1 = (item.estado  || '').toString().trim().toLowerCase();
      const e2 = (item.estado2 || '').toString().trim().toLowerCase();
      if (e1) estados.add(e1);
      if (e2) estados2.add(e2);
    });

    this.estadoOptions = Array.from(estados).sort();

    // Estado2: primero las opciones oficiales presentes en los datos, luego cualquier valor extra
    const oficiales = this.availableStates2.filter(s => estados2.has(s));
    const extras    = Array.from(estados2).filter(s => !this.availableStates2.includes(s)).sort();
    this.estado2Options = [...oficiales, ...extras];
  }

  countByEstado(estado: string): number {
    return this.apiData.filter(i =>
      (i.estado || '').toString().trim().toLowerCase() === estado
    ).length;
  }

  countByEstado2(estado2: string): number {
    if (estado2 === '__sin__') {
      return this.apiData.filter(i => !(i.estado2 || '').toString().trim()).length;
    }
    return this.apiData.filter(i =>
      (i.estado2 || '').toString().trim().toLowerCase() === estado2
    ).length;
  }

  get countSinEstado2(): number {
    return this.countByEstado2('__sin__');
  }

  onFilterChange(): void {
    this.applyAllFilters();
  }

  clearFilters(): void {
    this.filterEstado = '';
    this.filterEstado2 = '';
    this.applyAllFilters();
  }

  /** Aplica en cadena: filtro Estado → filtro Estado2 → búsqueda por texto */
  applyAllFilters(): void {
    if (!this.apiData) return;

    let result = [...this.apiData];

    // 1. Filtro por Estado
    if (this.filterEstado) {
      result = result.filter(i =>
        (i.estado || '').toString().trim().toLowerCase() === this.filterEstado
      );
    }

    // 2. Filtro por Estado 2 ('__sin__' = registros sin estado 2)
    if (this.filterEstado2) {
      if (this.filterEstado2 === '__sin__') {
        result = result.filter(i => !(i.estado2 || '').toString().trim());
      } else {
        result = result.filter(i =>
          (i.estado2 || '').toString().trim().toLowerCase() === this.filterEstado2
        );
      }
    }

    // 3. Búsqueda por texto
    const term = this.searchTerm.toLowerCase().trim();
    if (term) {
      result = result.filter(item =>
        this.searchField === 'all'
          ? this.searchInAllFields(item, term)
          : item[this.searchField]?.toString().toLowerCase().includes(term)
      );
    }

    this.filteredData = result;
  }

  // ─── Búsqueda ──────────────────────────────────────────────────────────────

  onSearch(): void {
    this.applyAllFilters();
  }

  private searchInAllFields(item: any, term: string): boolean {
    const fields = [
      'invoiceBlNombre', 'codigoProducto', 'descripcionFinal',
      'ubicacion', 'ubicacionf', 'cantidad', 'unidad',
      'estado', 'estado2', 'observacion', 'nombreUsuario'
    ];
    return fields.some(f => item[f]?.toString().toLowerCase().includes(term));
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchField = 'all';
    this.filterEstado = '';
    this.filterEstado2 = '';
    this.filteredData = [...this.apiData];
  }

  onSearchFieldChange(): void { if (this.searchTerm.trim()) this.onSearch(); }

  // ─── Actualizar item ────────────────────────────────────────────────────────

  updateItem(item: any): void {
    const payload = {
      descripcionActualizada: item.descripcionFinal,
      ubicacionf:   item.ubicacionf,
      cantverif:    item.cantidadVerificada,
      codigoVhcr:   item.codigoVhcr,
      estado2:      item.estado2,
      observacion:  item.observacion
    };

    this.blService.updateLiquidacion(item.idLiquidacion, payload).subscribe({
      next: () => {
        const idx = this.apiData.findIndex(a => a.idLiquidacion === item.idLiquidacion);
        if (idx !== -1) {
          this.apiData[idx] = {
            ...this.apiData[idx], ...payload,
            descripcionFinal: this.getDescripcionFinal({ ...this.apiData[idx], ...payload })
          };
        }
        this.buildFilterOptions();   // por si cambió un estado2 y afecta los combos
        this.applyAllFilters();
        this.showToast('Item actualizado correctamente ✓', 'success');
      },
      error: () => this.showToast('Error al actualizar el item.', 'error')
    });
  }

  // ─── MEJORA: Subida de imágenes con progreso ───────────────────────────────

  onFileSelected(event: any, item: any): void {
    const files: FileList = event.target.files;
    if (files?.length > 0) this.uploadImages(files, item);
    event.target.value = ''; // Reset para permitir re-subir el mismo archivo
  }

  uploadImages(files: FileList, item: any): void {
    const fileArray = Array.from(files);

    this.uploadQueue = fileArray.map(f => ({
      fileName: f.name,
      progress: 0,
      status: 'pending' as const
    }));

    let completed = 0;

    fileArray.forEach((file, index) => {
      this.uploadQueue[index].status = 'uploading';

      const formData = new FormData();
      formData.append('image', file, file.name);
      formData.append('itemId', item.idDetalleBl.toString());

      // Progreso simulado hasta 90% mientras la petición está en vuelo
      const progressInterval = setInterval(() => {
        if (this.uploadQueue[index]?.progress < 90) {
          this.uploadQueue[index].progress = Math.min(
            this.uploadQueue[index].progress + Math.random() * 15,
            90
          );
        }
      }, 200);

      this.blService.uploadImage(formData).subscribe({
        next: (response: any) => {
          clearInterval(progressInterval);
          this.uploadQueue[index].progress = 100;
          this.uploadQueue[index].status = 'success';

          // Actualizar solo las imágenes del item si el backend devuelve la imagen
          if (response?.imagen) {
            if (!item.imagenes) item.imagenes = [];
            item.imagenes.push(response.imagen);
          }

          this.finishUpload(++completed, fileArray.length, item);
        },
        error: (err) => {
          clearInterval(progressInterval);
          this.uploadQueue[index].progress = 100;
          this.uploadQueue[index].status = 'error';
          this.uploadQueue[index].errorMsg = err?.error?.message || 'Error desconocido';
          this.finishUpload(++completed, fileArray.length, item);
        }
      });
    });
  }

  private finishUpload(completed: number, total: number, item: any): void {
    if (completed < total) return; // Aún quedan archivos

    const successes = this.uploadQueue.filter(f => f.status === 'success').length;
    const errors    = this.uploadQueue.filter(f => f.status === 'error').length;

    if (successes > 0 && errors === 0) {
      this.showToast(`${successes} imagen(es) subida(s) correctamente ✓`, 'success');
    } else if (successes > 0 && errors > 0) {
      this.showToast(`${successes} subida(s) correctamente. ${errors} con error.`, 'info');
    } else {
      this.showToast('Error: no se pudo subir ninguna imagen.', 'error');
    }

    // Solo recargar el item específico si el backend no devolvió la imagen en el response
    const needsRefresh = successes > 0 && !item.imagenes?.length;
    if (needsRefresh) {
      this.refreshSingleItem(item);
    }

    // Limpiar barra de progreso después de 3 segundos
    setTimeout(() => { this.uploadQueue = []; }, 3000);
  }

  /**
   * Recarga solo UN item para no recargar toda la tabla.
   * Si el servicio tiene getLiquidacionById lo usa; si no, hace refresh global como fallback.
   */
  private refreshSingleItem(item: any): void {
    if (typeof (this.blService as any).getLiquidacionById === 'function') {
      (this.blService as any).getLiquidacionById(item.idLiquidacion).subscribe({
        next: (freshItem: any) => {
          const processed = this.processDataWithFinalDescription([freshItem])[0];
          const idx  = this.apiData.findIndex(a => a.idLiquidacion === item.idLiquidacion);
          const fidx = this.filteredData.findIndex(a => a.idLiquidacion === item.idLiquidacion);
          if (idx  !== -1) this.apiData[idx]     = processed;
          if (fidx !== -1) this.filteredData[fidx] = processed;
        },
        error: () => this.loadLiquidacionesData() // Fallback
      });
    } else {
      // Fallback: recarga global si no existe el método individual
      this.loadLiquidacionesData();
    }
  }

  // ─── MEJORA: Lazy loading de imágenes ─────────────────────────────────────

  onImageLoad(url: string): void {
    this.imageStates.set(url, { loaded: true, error: false });
  }

  onImageError(url: string): void {
    this.imageStates.set(url, { loaded: true, error: true });
  }

  isImageLoaded(url: string): boolean {
    return this.imageStates.get(url)?.loaded ?? false;
  }

  isImageError(url: string): boolean {
    return this.imageStates.get(url)?.error ?? false;
  }

  // ─── URLs de imágenes ──────────────────────────────────────────────────────

  getImageUrl(relativePath: string): string {
    if (!relativePath) return 'assets/images/no-image.png';
    let fileName = relativePath.toString().trim();
    if (fileName.includes('\\') || fileName.includes('/')) {
      fileName = fileName.split(/[\\\/]/).pop()!;
    }
    fileName = fileName.replace(/[<>:"|?*]/g, '');
    return fileName ? `${this.BASE_IMAGE_URL}${fileName}` : 'assets/images/no-image.png';
  }

  // ─── Modal ─────────────────────────────────────────────────────────────────

  openImageModal(image: any, item: any): void {
    this.selectedImage  = image;
    this.selectedItem   = item;
    this.showImageModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeImageModal(): void {
    this.showImageModal = false;
    this.selectedImage  = null;
    this.selectedItem   = null;
    document.body.style.overflow = 'auto';
  }

  downloadImage(image: any): void {
    const url      = this.getImageUrl(image.url);
    const fileName = image.nombreArchivo || `imagen_${Date.now()}.jpg`;
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href     = window.URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(a.href);
      })
      .catch(() => this.showToast('Error al descargar la imagen.', 'error'));
  }

  // ─── Toast notifications ──────────────────────────────────────────────────

  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, message, type });
    setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 4000);
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  // ─── Descarga Excel ────────────────────────────────────────────────────────

  downloadData(): void {
    const data = this.hasActiveFilters ? this.filteredData : this.apiData;
    if (!data?.length) {
      this.showToast('No hay registros para exportar con los filtros actuales.', 'info');
      return;
    }

    const headers = [
      'Factura', 'Código Producto', 'Código VHCR', 'Descripción', 'Descripción Original',
      'Ubicación P.', 'Ubicación F.', 'Cantidad', 'Cant. Verificada', 'Unidad',
      'Estado', 'Estado2', 'Observación', 'Fecha', 'Usuario', 'Imágenes'
    ];

    const rows = data.map((item: any) => ({
      'Factura':              item.invoiceBlNombre     || 'N/A',
      'Código Producto':      item.codigoProducto      || 'N/A',
      'Código VHCR':          item.codigoVhcr          || 'N/A',
      'Descripción':          item.descripcionFinal    || 'N/A',
      'Descripción Original': item.descripcionOriginal || 'N/A',
      'Ubicación P.':         item.ubicacion           || 'N/A',
      'Ubicación F.':         item.ubicacionf          || 'N/A',
      'Cantidad':             item.cantidad            || 0,
      'Cant. Verificada':     item.cantidadVerificada  || 0,
      'Unidad':               item.unidad              || 'N/A',
      'Estado':               item.estado              || 'N/A',
      'Estado2':              item.estado2             || 'N/A',
      'Observación':          item.observacion         || 'N/A',
      'Fecha':                item.fecha ? new Date(item.fecha).toLocaleString('es-ES') : 'N/A',
      'Usuario':              item.nombreUsuario       || 'N/A',
      'Imágenes':             item.imagenes?.length
                                ? item.imagenes.map((i: any) => i.nombreArchivo || i.url).join(' | ')
                                : 'Sin imágenes'
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    ws['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 25 },
      { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
      { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 30 }
    ];
    const wb: XLSX.WorkBook = { Sheets: { 'Liquidaciones': ws }, SheetNames: ['Liquidaciones'] };

    // ── Sufijos según filtros activos (para identificar el informe) ──
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
    let sfx = '';
    if (this.filterEstado)        sfx += `_estado-${clean(this.filterEstado)}`;
    if (this.filterEstado2)      sfx += `_estado2-${this.filterEstado2 === '__sin__' ? 'sin-asignar' : clean(this.filterEstado2)}`;
    if (this.searchTerm.trim())  sfx += `_busqueda-${clean(this.searchTerm)}`;

    XLSX.writeFile(wb, `liquidaciones_detalladas_BL${this.blId}${sfx}_${ts}.xlsx`);

    this.showToast(`Excel generado con ${rows.length} registro(s).`, 'success');
  }
}