// conteo.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize, catchError } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';

import { BlService, CreateLiquidacionBlResponse, LiquidacionBlModel } from '../../services/bl.service';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';
import * as XLSX from 'xlsx';

export interface Photo {
  filepath: string;
  file?: File;          // presente solo si es una foto pendiente de subir
}

export interface BlDetailItemForConteo {
  id: number;
  codigo: string;
  chino: string;
  descripcionEspanol: string;
  cantidad: number;

  cantidadContada: number;
  conteo: number;
  unidad: string;
  unidadSeleccionada: string;
  estado: string;
  estado2: string;
  comentarios: string;
  photos: Photo[];
  liquidacionId?: number;
  isSaving?: boolean;

  precioUnitario: number;
  invoiceN: string;
  invoiceBl: string;
  blNombre: string;
  ubicacion: string;
  dactualizada: string;
  caracteristica: string;
  foto: string | null;

  // ── Campos de códigos desde backend ──────────────────────
  codeNew:           string | null;
  codigoVhcr?:       string | null;   // nuevo campo del endpoint bl-excel-liqui
  codigoVhcrInvoice: string | null;
  equivalentCode:    string | null;
  codigoVhcrOrden:   string | null;
  // ─────────────────────────────────────────────────────────

  // ── FOB unitario por fuente ───────────────────────────────
  unitFobInvoice:    number;
  unitFobOrden:      number | null;
  // ─────────────────────────────────────────────────────────

  // ── Liquidación ───────────────────────────────────────────
  cantidadLiquidada: number;
  cantidadPendiente: number;
  estaLiquidado:     boolean;
  // ─────────────────────────────────────────────────────────

  // Campos de edición inline (directamente en la fila)
  _codvhcr: string;
  _dactualizada: string;
  _caracteristica: string;
  _ubicacion: string;
  // Archivos pendientes de subir para esta fila
  _pendingFiles: File[];

  noPerteneceOrden?: boolean;
  cantidadOrden?: number | null;
  cantidadRecibidaTotal?: number;
  excedeLoSolicitado?: boolean;
}

@Component({
  selector: 'app-conteo',
  templateUrl: './conteo.component.html',
  styleUrls: ['./conteo.component.css']
})
export class ConteoComponent implements OnInit {
  blId: number | undefined;
  blnombre: any;

  currentBlDetails: BlDetailItemForConteo[] = [];
  filteredBlDetails: BlDetailItemForConteo[] = [];
  isLoadingDetails = false;
  errorMessage: string | null = null;
  searchTerm = '';

  availableUnits:   string[] = ['unidad', 'kit', 'conjunto'];
  availableStates:  string[] = ['bueno', 'averiado'];
  availableStates2: string[] = [
    'faltante', 'sobrante', 'cruce', 'descomposicion',
    'composicion', 'variacion costo', 'activo fijo', 'otros'
  ];

  id = 0;
  usuario: Usuario | null = null;
  usrol = '';

  // ── Visor de imágenes (lightbox) ─────────────────────────────────────
  isViewerOpen = false;
  viewerPhotos: Photo[] = [];
  viewerIndex = 0;
  viewerCodigo = '';

  // ── Métricas de progreso ─────────────────────────────────────────────
  get totalContados(): number {
    return this.currentBlDetails.filter(d => !!d.liquidacionId).length;
  }
  get totalPendientes(): number {
    return this.currentBlDetails.filter(d => !d.liquidacionId).length;
  }
  get porcentajeContado(): number {
    if (!this.currentBlDetails.length) return 0;
    return Math.round((this.totalContados / this.currentBlDetails.length) * 100);
  }
  getMiniPct(detail: BlDetailItemForConteo): number {
    if (!detail.cantidadContada) return 0;
    return Math.min(Math.round((detail.conteo / detail.cantidadContada) * 100), 100);
  }

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private blService: BlService
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuarioActual();
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario) {
        this.id    = this.usuario.id;
        this.usrol = this.usuario.rol;
      }
    });

    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.blId = +idParam;
        this.loadBlDetails(this.blId);
        this.loadBl(this.blId);
      } else {
        this.errorMessage = 'No se proporcionó un ID de BL.';
      }
    });
  }

  // ─── Carga ────────────────────────────────────────────────────────────────

  loadBl(blId: number): void {
    this.blService.getBlById(blId).subscribe((response: any) => {
      this.blnombre = response.nombre;
    });
  }

  loadBlDetails(blId: number): void {
    this.isLoadingDetails = true;
    this.errorMessage = null;

    forkJoin({
      details:       this.blService.getAllDetails(blId),
      liquidaciones: this.blService.getLiquidacionesByBl(blId)
    })
    .pipe(
      finalize(() => { this.isLoadingDetails = false; }),
      catchError(error => {
        console.error('Error al obtener los detalles del BL:', error);
        this.errorMessage = 'Error al cargar los detalles. Intente nuevamente.';
        return of({ details: [], liquidaciones: [] });
      })
    )
    .subscribe(({ details, liquidaciones }: any) => {

      // Indexar liquidaciones por idDetalleBl para cruce eficiente O(1)
      const liqMap = new Map<number, any>();
      for (const liq of liquidaciones) {
        liqMap.set(liq.idDetalleBl, liq);
      }

      this.currentBlDetails = (details as any[]).map((d, index) => {
        const liq = liqMap.get(d.id);

        return {
          ...d,
          cantidadContada:    d.cantidadContada || d.cantidad,
          conteo:             liq?.cantidad          ?? 0,
          unidadSeleccionada: liq?.unidad            || d.unidadSeleccionada || 'unidad',
          estado:             liq?.estado            || d.estado   || 'bueno',
          estado2:            liq?.estado2           || d.estado2  || '',
          comentarios:        liq?.observacion       || d.comentarios || '',
          photos:             liq?.imagenes?.map((img: any) => ({
                                filepath: img.url,
                                file:     undefined
                              })) ?? [],
          liquidacionId:      liq?.idLiquidacion     ?? undefined,
          isSaving:           false,
          id:                 d.id || index + 1,
          foto:               d.foto || null,
          codeNew:            d.codeNew ?? d.code_new ?? null,
          codigoVhcr:         d.codigoVhcr ?? d.codigovhcr ?? null,
          // Prioridad: lo guardado en liquidación > codigovhcr del detalle > vacío
          _codvhcr:           liq?.codVhcr || d.codvhcr || d.codigoVhcr || d.codigovhcr || '',
          _dactualizada:      liq?.dactualizada       || d.dactualizada   || '',
          _caracteristica:    liq?.caracteristica     || d.caracteristica || '',
          _ubicacion:         liq?.ubicacion          || d.ubicacion      || '',
          _pendingFiles:      [],
        };
      });

      this.applyFilter();
    });
  }

  // ─── Filtrado ─────────────────────────────────────────────────────────────

  applyFilter(): void {
    if (!this.searchTerm) {
      this.filteredBlDetails = [...this.currentBlDetails];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredBlDetails = this.currentBlDetails.filter(d =>
        d.codigo.toLowerCase().includes(term) ||
        d.descripcionEspanol.toLowerCase().includes(term) ||
        (d.codeNew  || '').toLowerCase().includes(term) ||
        (d._codvhcr || '').toLowerCase().includes(term)
      );
    }
  }

  // ─── Fotos ────────────────────────────────────────────────────────────────

  /** Selección de una o varias imágenes: quedan PENDIENTES hasta presionar Guardar */
  onFileSelected(event: any, detail: BlDetailItemForConteo): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      detail._pendingFiles.push(file);
      detail.photos.push({ filepath: URL.createObjectURL(file), file });
    }

    // Permitir volver a seleccionar el mismo archivo si se elimina
    event.target.value = '';
  }

  removePhoto(detail: BlDetailItemForConteo, index: number): void {
    const photo = detail.photos[index];

    // Solo se pueden quitar fotos pendientes (aún no subidas al servidor)
    if (!photo?.file) {
      alert('Esta imagen ya está guardada en el servidor y no se puede eliminar desde aquí.');
      return;
    }

    const removed = detail.photos.splice(index, 1)[0];
    const idx = detail._pendingFiles.indexOf(removed.file!);
    if (idx > -1) {
      detail._pendingFiles.splice(idx, 1);
      URL.revokeObjectURL(removed.filepath);
    }
  }

  getPendingCount(detail: BlDetailItemForConteo): number {
    return detail._pendingFiles.length;
  }

  // ─── Visor de imágenes ───────────────────────────────────────────────────

  openViewer(detail: BlDetailItemForConteo, index: number): void {
    if (!detail.photos || detail.photos.length === 0) return;
    this.viewerPhotos = detail.photos;
    this.viewerIndex  = index;
    this.viewerCodigo = detail.codigo;
    this.isViewerOpen = true;
  }

  closeViewer(): void {
    this.isViewerOpen = false;
    this.viewerPhotos = [];
    this.viewerIndex  = 0;
    this.viewerCodigo = '';
  }

  viewerPrev(event: Event): void {
    event.stopPropagation();
    this.viewerIndex = (this.viewerIndex - 1 + this.viewerPhotos.length) % this.viewerPhotos.length;
  }

  viewerNext(event: Event): void {
    event.stopPropagation();
    this.viewerIndex = (this.viewerIndex + 1) % this.viewerPhotos.length;
  }

  // ─── Guardado ─────────────────────────────────────────────────────────────

  guardar(detail: BlDetailItemForConteo): void {
    if (!this.blId) { alert('Error: ID del BL no disponible'); return; }
    if (!this.id)   { alert('Error: ID de usuario no disponible.'); return; }

    detail.isSaving = true;

    const liquidacionData: LiquidacionBlModel = {
      idinvoicebl:    this.blId,
      iddetalle:      detail.id,
      cantidad:       detail.conteo,
      unidad:         detail.unidadSeleccionada || detail.unidad,
      estado:         detail.estado  || 'bueno',
      estado2:        detail.estado2 || '',
      observacion:    detail.comentarios,
      fecha:          new Date().toISOString(),
      extra:          false,
      usuario:        this.id,
      ubicacion:      detail._ubicacion,
      caracteristicas:        detail._caracteristica,
      descripcionactualizada: detail._dactualizada,
      codvhcr:        detail._codvhcr,
    };

    const images = [...detail._pendingFiles];

    if (detail.liquidacionId) {
      // Actualización: enviar también las imágenes pendientes (una o varias)
      this.blService.updateLiquidacionBl(
        detail.liquidacionId,
        liquidacionData,
        images.length > 0 ? images : undefined
      ).subscribe({
        next: (res: any) => {
          this.handleSaveSuccess(detail, res);
          if (images.length > 0) {
            // Recargar para traer las URLs definitivas de las imágenes subidas
            this.loadBlDetails(Number(this.blId));
          }
        },
        error: (error) => this.handleSaveError(detail, error),
      });
    } else {
      this.blService.createLiquidacionBl(
        liquidacionData,
        images.length > 0 ? images : undefined
      ).subscribe({
        next: (res: CreateLiquidacionBlResponse) => {
          if (res?.id) {
            detail.liquidacionId = res.id;
            this.handleSaveSuccess(detail, res);
            this.loadBlDetails(Number(this.blId));
          } else {
            this.handleSaveError(detail, { message: res?.message || 'Error desconocido' });
          }
        },
        error: (error) => this.handleSaveError(detail, error),
      });
    }
  }

  private handleSaveSuccess(detail: BlDetailItemForConteo, response: any): void {
    detail.isSaving = false;
    detail._pendingFiles = [];
    alert('¡Guardado exitosamente!');
    const idx = this.currentBlDetails.findIndex(d => d.id === detail.id);
    if (idx > -1) {
      Object.assign(this.currentBlDetails[idx], {
        cantidadContada:    detail.cantidadContada,
        unidadSeleccionada: detail.unidadSeleccionada,
        estado:             detail.estado,
        comentarios:        detail.comentarios,
        photos:             [...detail.photos],
        liquidacionId:      response?.id || detail.liquidacionId,
      });
      this.applyFilter();
    }
  }

  private handleSaveError(detail: BlDetailItemForConteo, error: any): void {
    detail.isSaving = false;
    alert(`Error: ${error?.message || 'Error desconocido al guardar.'}`);
    console.error('Error saving detail:', error);
  }

  // ─── Excel ────────────────────────────────────────────────────────────────

  exportToExcel(): void {
    if (this.filteredBlDetails.length === 0) { alert('No hay datos para exportar.'); return; }

    const data = this.filteredBlDetails.map(d => ({
      'CÓDIGO':                 d.codigo,
      'COD. VHCR':              d._codvhcr || '',
      'COD. NUEVO':             d.codeNew  || '',
      'DESCRIPCIÓN ESPAÑOL':    d.descripcionEspanol,
      'CANTIDAD BL':            d.cantidad,
      'UNIDAD BL':              d.unidad,
      'CANTIDAD CONTADA':       d.conteo,
      'UNIDAD SELECCIONADA':    d.unidadSeleccionada,
      'ESTADO 1':               d.estado,
      'ESTADO 2':               d.estado2,
      'COMENTARIOS':            d.comentarios,
      'INVOICE':                d.invoiceN,
      'INVOICE BL':             d.invoiceBl,
      'BL':                     d.blNombre,
      'UBICACIÓN':              d._ubicacion,
      'CARACTERÍSTICA':         d._caracteristica,
      'DESCRIPCIÓN ACTUALIZADA': d._dactualizada,
      'PRECIO UNITARIO':        d.precioUnitario,
      'N° FOTOS':               d.photos?.length || 0,
      'ESTADO CONTEO':          d.liquidacionId ? 'CONTADO' : 'PENDIENTE',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalles de Conteo');
    XLSX.writeFile(wb, `Conteo_BL_${this.blnombre || this.blId}_${new Date().toISOString().slice(0,10)}.xlsx`);
  }
}