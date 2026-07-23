import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RepuestosvhcrService } from 'src/app/services/repuestosvhcr.service';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';

@Component({
  selector: 'app-revisionrepuestos',
  templateUrl: './revisionrepuestos.component.html',
  styleUrls: ['./revisionrepuestos.component.css']
})
export class RevisionrepuestosComponent implements OnInit {

  oficinaId: string = '';
  oficinaNombre: string = '';
  repuestos: any[] = [];
  repuestosFiltrados: any[] = [];
  cargando: boolean = false;
  error: string | null = null;

  // Filtros
  filtroTexto: string = '';
  filtroEstado: string = 'todos';

  // Modal detalle
  repuestoSeleccionado: any = null;

  // Exportación Excel
  isDownloading: boolean = false;
  private imageCache = new Map<string, string>();
  private progressToast: HTMLDivElement | null = null;
  showExportMenu: boolean = false;

  // URL base del endpoint de imágenes
  private readonly imagenesBaseUrl = 'https://bodega.vehicentro.com:1830/api/api/Repuestos/imagen';

  constructor(
    private route: ActivatedRoute,
    private repuestosService: RepuestosvhcrService
  ) {}

  ngOnInit(): void {
    this.oficinaId = this.route.snapshot.paramMap.get('id') || '';
    if (this.oficinaId) {
      this.cargarRepuestosDeOficina();
    } else {
      this.error = 'No se especificó una oficina';
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // CARGA PRINCIPAL
  // ─────────────────────────────────────────────────────────────────

  cargarRepuestosDeOficina(): void {
    this.cargando = true;
    this.error = null;

    this.repuestosService.getRepuestosPorOficina(this.oficinaId).subscribe({
      next: (response) => {
        this.repuestos = (response.data || []).map((item: any) => ({
          ...item,
          diferencia: this.calcularDiferencia(item)
        }));

        this.repuestosFiltrados = [...this.repuestos];

        if (this.repuestos.length > 0) {
          this.oficinaNombre = this.repuestos[0].oficina || this.oficinaId;
        }

        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar repuestos:', err);
        this.error = 'Error al cargar los repuestos de la oficina';
        this.cargando = false;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // IMÁGENES
  // ─────────────────────────────────────────────────────────────────

  /**
   * Construye la URL completa para el endpoint GET imagen/{filename}
   * El campo imagen_nombre viene directo en cada repuesto desde con-inventario
   */
  getUrlImagen(nombreArchivo: string | null): string | null {
    if (!nombreArchivo) return null;
    return `${this.imagenesBaseUrl}/${encodeURIComponent(nombreArchivo)}`;
  }

  onImgError(event: any): void {
    event.target.style.display = 'none';
  }

  // ─────────────────────────────────────────────────────────────────
  // MODAL DETALLE
  // ─────────────────────────────────────────────────────────────────

  abrirDetalle(repuesto: any): void {
    this.repuestoSeleccionado = repuesto;
    document.body.style.overflow = 'hidden';
  }

  cerrarDetalle(): void {
    this.repuestoSeleccionado = null;
    document.body.style.overflow = '';
  }

  // ─────────────────────────────────────────────────────────────────
  // CÁLCULOS Y UTILIDADES
  // ─────────────────────────────────────────────────────────────────

  calcularDiferencia(item: any): number {
    const stockFisico = item.stock || 0;
    const cantidadSistema = item.cantidad_sistema || 0;
    return stockFisico - cantidadSistema;
  }

  aplicarFiltros(): void {
    this.repuestosFiltrados = this.repuestos.filter(repuesto => {
      const coincideTexto =
        !this.filtroTexto ||
        repuesto.codigo?.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        repuesto.descripcion?.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        repuesto.marca_nombre?.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        repuesto.modelo?.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        repuesto.linea?.toLowerCase().includes(this.filtroTexto.toLowerCase());

      let coincideEstado = true;
      if (this.filtroEstado === 'ok') {
        coincideEstado = repuesto.diferencia === 0;
      } else if (this.filtroEstado === 'diferencia') {
        coincideEstado = repuesto.diferencia !== 0;
      } else if (this.filtroEstado === 'sin_stock') {
        coincideEstado = repuesto.stock === 0 || repuesto.stock === null;
      }

      return coincideTexto && coincideEstado;
    });
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroEstado = 'todos';
    this.repuestosFiltrados = [...this.repuestos];
  }

  getDiferenciaClass(diferencia: number): string {
    if (diferencia === 0) return 'diferencia-ok';
    if (diferencia > 0) return 'diferencia-sobrante';
    return 'diferencia-faltante';
  }

  getStockClass(stock: number): string {
    if (stock === 0 || stock === null) return 'stock-cero';
    return 'stock-ok';
  }

  formatearNumero(valor: number): string {
    if (valor === null || valor === undefined) return '0.00';
    return valor.toFixed(2);
  }

  getRepuestosOK(): number {
    return this.repuestos.filter(r => r.diferencia === 0).length;
  }

  getRepuestosConDiferencia(): number {
    return this.repuestos.filter(r => r.diferencia !== 0).length;
  }

  getRepuestosSinStock(): number {
    return this.repuestos.filter(r => !r.stock || r.stock === 0).length;
  }

  // ─────────────────────────────────────────────────────────────────
  // EXPORTACIÓN EXCEL
  // ─────────────────────────────────────────────────────────────────

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  /**
   * Excel simple sin imágenes (instantáneo) - usa la librería xlsx
   */
  downloadExcelSinImagenes(): void {
    this.showToast('Generando Excel sin imágenes...', 'info');

    const dataToExport = this.repuestosFiltrados.map(item => ({
      Código: item.codigo || '',
      Descripción: item.descripcion || '',
      Marca: item.marca_nombre || '',
      Modelo: item.modelo || '',
      Línea: item.linea || '',
      Categoría: item.categoria || '',
      Estado: item.estado_nombre || '',
      Bodega: item.bodega || '',
      'Stock Físico': this.formatearNumero(item.stock),
      Disponible: this.formatearNumero(item.stock_disponible),
      Reservado: this.formatearNumero(item.stock_reservado),
      'Cant. Sistema': this.formatearNumero(item.cantidad_sistema),
      Diferencia: this.formatearNumero(item.diferencia),
      'Estado Inv.': item.diferencia === 0 ? 'OK' : item.diferencia > 0 ? 'Sobrante' : 'Faltante'
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 },
      { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }
    ];

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Revision Repuestos');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, `Revision_Repuestos_${this.oficinaId}_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.showToast('Excel generado exitosamente (sin imágenes)', 'success');
    this.showExportMenu = false;
  }

  /**
   * Excel con imágenes reales embebidas (más lento) - usa exceljs
   */
  async downloadExcelConImagenes(limit: number = 99999): Promise<void> {
    if (this.isDownloading) return;
    this.isDownloading = true;
    this.showExportMenu = false;

    const rowsToExport = this.repuestosFiltrados.slice(0, limit);
    this.showProgressToast(`Preparando ${rowsToExport.length} filas con imágenes...`, 0);

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Revision Repuestos');

    ws.columns = [
      { header: 'Código', key: 'codigo', width: 18 },
      { header: 'Descripción', key: 'descripcion', width: 35 },
      { header: 'Marca', key: 'marca', width: 15 },
      { header: 'Modelo', key: 'modelo', width: 15 },
      { header: 'Línea', key: 'linea', width: 18 },
      { header: 'Categoría', key: 'categoria', width: 15 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Bodega', key: 'bodega', width: 12 },
      { header: 'Stock Físico', key: 'stock', width: 12 },
      { header: 'Disponible', key: 'disponible', width: 12 },
      { header: 'Reservado', key: 'reservado', width: 12 },
      { header: 'Cant. Sistema', key: 'sistema', width: 14 },
      { header: 'Diferencia', key: 'diferencia', width: 12 },
      { header: 'Estado Inv.', key: 'estadoInv', width: 12 },
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
        descripcion: item.descripcion || '',
        marca: item.marca_nombre || '',
        modelo: item.modelo || '',
        linea: item.linea || '',
        categoria: item.categoria || '',
        estado: item.estado_nombre || '',
        bodega: item.bodega || '',
        stock: Number(this.formatearNumero(item.stock)),
        disponible: Number(this.formatearNumero(item.stock_disponible)),
        reservado: Number(this.formatearNumero(item.stock_reservado)),
        sistema: Number(this.formatearNumero(item.cantidad_sistema)),
        diferencia: Number(this.formatearNumero(item.diferencia)),
        estadoInv: item.diferencia === 0 ? 'OK' : item.diferencia > 0 ? 'Sobrante' : 'Faltante'
      });

      const row = ws.getRow(idx + 2);
      row.height = 160;
    });

    // Procesar imágenes
    const urls: { row: number; url: string }[] = [];
    rowsToExport.forEach((item, idx) => {
      if (item.imagen_nombre) {
        const url = this.getUrlImagen(item.imagen_nombre);
        if (url) urls.push({ row: idx + 2, url });
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
          tl: { col: 14, row: rowNum - 1 },
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
        ws.getCell(r, 15).value = 'Sin imagen';
        ws.getCell(r, 15).alignment = { vertical: 'middle', horizontal: 'center' };
      }
    }

    this.showProgressToast('Generando archivo...', 95);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, `Revision_Repuestos_ConImagenes_${this.oficinaId}_${rowsToExport.length}_${new Date().toISOString().split('T')[0]}.xlsx`);

    this.showToast(
      `Excel con imágenes: ${rowsToExport.length} filas, ${pasted} fotos insertadas, ${fail} fallidas`,
      'success'
    );

    this.isDownloading = false;
    this.hideProgressToast();
  }

  /**
   * Carga una imagen, la redimensiona y la convierte a base64 (con caché)
   */
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

  clearImageCache(): void {
    this.imageCache.clear();
    this.showToast('Caché de imágenes limpiada correctamente', 'success');
  }

  // ─────────────────────────────────────────────────────────────────
  // TOASTS Y PROGRESO
  // ─────────────────────────────────────────────────────────────────

  private showToast(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    const toast = document.createElement('div');
    toast.className = `toast-custom toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => {
        if (toast.parentNode) document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  private showProgressToast(message: string, progress: number): void {
    if (!this.progressToast) {
      this.progressToast = document.createElement('div');
      this.progressToast.style.cssText = `
        position: fixed;
        bottom: 20px;
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
}