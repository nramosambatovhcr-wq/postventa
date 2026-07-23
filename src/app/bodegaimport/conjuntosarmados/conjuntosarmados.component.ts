import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ConjuntoArmadoResumen, ConjuntoArmadoDetalle, ComponenteTipo, ConjuntoCreateRequest, ConjuntosArmadosService, CajaCambioRequest, MotorRequest, FrontalRequest, DiferencialRequest, CabinaRequest, ImagenConjunto } from 'src/app/services/conjuntos-armados.service';


// ─────────────────────────────────────────────────────────────
//  Estadísticas calculadas en frontend
// ─────────────────────────────────────────────────────────────
interface EstadisticasConjuntos {
  total:           number;
  completos:       number;
  sinCabina:       number;
  sinMotor:        number;
  sinCajaCambio:   number;
  pctCompletos:    number;
  colores:         { color: string; cantidad: number }[];
  modelosCaja:     { modelo: string; cantidad: number }[];
  modelosMotor:    { modelo: string; cantidad: number }[];
}

type Vista = 'lista' | 'estadisticas' | 'formulario' | 'detalle';
type TabComponente = 'conjunto' | 'caja' | 'motor' | 'frontal' | 'diferencial' | 'cabina' | 'imagenes';

@Component({
  selector: 'app-conjuntosarmados',
  templateUrl: './conjuntosarmados.component.html',
  styleUrls: ['./conjuntosarmados.component.css']
})
export class ConjuntosarmadosComponent implements OnInit {

  @ViewChild('fileInputRef') fileInputRef!: ElementRef<HTMLInputElement>;

  // ── Estado de UI ────────────────────────────────────────────
  vista:         Vista           = 'lista';
  tabActivo:     TabComponente   = 'conjunto';
  cargando:      boolean         = false;
  guardando:     boolean         = false;
  subiendoImg:   boolean         = false;
  errorMsg:      string          = '';
  busquedaTxt:   string          = '';
  modoEdicion:   boolean         = false;

  // ── Datos ───────────────────────────────────────────────────
  conjuntos:     ConjuntoArmadoResumen[]  = [];
  filtrados:     ConjuntoArmadoResumen[]  = [];
  detalle:       ConjuntoArmadoDetalle | null = null;
  stats:         EstadisticasConjuntos | null = null;

  // ── Upload de imágenes ──────────────────────────────────────
  tipoImagenSeleccionado: ComponenteTipo = 'conjunto';
  archivosSeleccionados:  File[]         = [];
  previewUrls:            string[]       = [];

  // ── Tipos de componente (usado en galerías y loops) ─────────
  readonly tiposComponente: ComponenteTipo[] = [
    'conjunto', 'caja_cambio', 'motor', 'frontal', 'diferencial', 'cabina'
  ];

  // ── Formulario ──────────────────────────────────────────────
  form: ConjuntoCreateRequest = this.formVacio();
  editId: string = '';

  constructor(private svc: ConjuntosArmadosService) {}

  ngOnInit(): void {
    this.cargarLista();
  }

  // ════════════════════════════════════════════════════════════
  //  CARGA DE DATOS
  // ════════════════════════════════════════════════════════════

  cargarLista(): void {
    this.cargando = true;
    this.errorMsg = '';
    this.svc.getAll().subscribe({
      next: res => {
        this.conjuntos = res.data ?? [];
        this.aplicarFiltro();
        this.calcularStats();
        this.cargando = false;
      },
      error: err => {
        this.errorMsg = 'Error al cargar los conjuntos armados.';
        this.cargando = false;
      }
    });
  }

  cargarDetalle(id: string): void {
    this.cargando = true;
    this.svc.getById(id).subscribe({
      next: res => {
        this.detalle = res.data;
        this.vista   = 'detalle';
        this.cargando = false;
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar el detalle.';
        this.cargando = false;
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  //  FILTRO Y ESTADÍSTICAS
  // ════════════════════════════════════════════════════════════

  aplicarFiltro(): void {
    const t = this.busquedaTxt.trim().toLowerCase();
    this.filtrados = t
      ? this.conjuntos.filter(c =>
          [c.codigo, c.descripcion, c.cajaSerial, c.motorSerial,
           c.cajaVhcr, c.motorVhcr, c.cabinaColor]
            .some(v => v?.toLowerCase().includes(t)))
      : [...this.conjuntos];
  }

  calcularStats(): void {
    const total        = this.conjuntos.length;
    const completos    = this.conjuntos.filter(c => this.tieneComponentes(c)).length;
    const sinCabina    = this.conjuntos.filter(c => !c.cabinaId).length;
    const sinMotor     = this.conjuntos.filter(c => !c.motorId).length;
    const sinCajaCambio= this.conjuntos.filter(c => !c.cajaId).length;

    // colores
    const mapaColores: Record<string, number> = {};
    this.conjuntos.forEach(c => {
      const color = c.cabinaColor ?? 'Sin color';
      mapaColores[color] = (mapaColores[color] ?? 0) + 1;
    });
    const colores = Object.entries(mapaColores)
      .map(([color, cantidad]) => ({ color, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6);

    // modelos caja
    const mapaCaja: Record<string, number> = {};
    this.conjuntos.forEach(c => {
      const m = c.cajaModel ?? 'Sin modelo';
      mapaCaja[m] = (mapaCaja[m] ?? 0) + 1;
    });
    const modelosCaja = Object.entries(mapaCaja)
      .map(([modelo, cantidad]) => ({ modelo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // modelos motor
    const mapaMotor: Record<string, number> = {};
    this.conjuntos.forEach(c => {
      const m = c.motorModel ?? 'Sin modelo';
      mapaMotor[m] = (mapaMotor[m] ?? 0) + 1;
    });
    const modelosMotor = Object.entries(mapaMotor)
      .map(([modelo, cantidad]) => ({ modelo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    this.stats = {
      total, completos, sinCabina, sinMotor, sinCajaCambio,
      pctCompletos: total > 0 ? Math.round((completos / total) * 100) : 0,
      colores, modelosCaja, modelosMotor
    };
  }

  tieneComponentes(c: ConjuntoArmadoResumen): boolean {
    return !!(c.cajaId && c.motorId && c.frontalId && c.diferencialId && c.cabinaId);
  }

  barWidth(val: number, max: number): string {
    return max > 0 ? `${Math.round((val / max) * 100)}%` : '0%';
  }

  // ════════════════════════════════════════════════════════════
  //  FORMULARIO
  // ════════════════════════════════════════════════════════════

  abrirFormNuevo(): void {
    this.form       = this.formVacio();
    this.modoEdicion = false;
    this.editId     = '';
    this.tabActivo  = 'conjunto';
    this.vista      = 'formulario';
    this.errorMsg   = '';
  }

  abrirFormEdicion(c: ConjuntoArmadoResumen): void {
    this.cargando = true;
    this.svc.getById(c.id).subscribe({
      next: res => {
        const d = res.data;
        this.editId      = d.id;
        this.modoEdicion = true;
        this.tabActivo   = 'conjunto';
        this.form = {
          codigo:      d.codigo,
          descripcion: d.descripcion ?? '',
          observacion: d.observacion ?? '',
          cajaCambio:  d.cajaCambio  ? { ...this.mapCaja(d.cajaCambio)  } : undefined,
          motor:       d.motor       ? { ...this.mapMotor(d.motor)      } : undefined,
          frontal:     d.frontal     ? { ...this.mapFrontal(d.frontal)  } : undefined,
          diferencial: d.diferencial ? { ...this.mapDif(d.diferencial)  } : undefined,
          cabina:      d.cabina      ? { ...this.mapCabina(d.cabina)    } : undefined,
        };
        this.vista    = 'formulario';
        this.cargando = false;
      },
      error: () => { this.errorMsg = 'No se pudo cargar el registro.'; this.cargando = false; }
    });
  }

  guardar(): void {
    if (!this.form.codigo?.trim()) {
      this.errorMsg = 'El código del conjunto es obligatorio.';
      return;
    }
    this.guardando = true;
    this.errorMsg  = '';

    if (this.modoEdicion) {
      // Actualizar datos base + cada componente por separado
      this.svc.update(this.editId, {
        codigo:      this.form.codigo,
        descripcion: this.form.descripcion,
        observacion: this.form.observacion
      }).subscribe({
        next: () => {
          const calls = [];
          if (this.form.cajaCambio)  calls.push(this.svc.updateCajaCambio(this.editId,  this.form.cajaCambio));
          if (this.form.motor)       calls.push(this.svc.updateMotor(this.editId,       this.form.motor));
          if (this.form.frontal)     calls.push(this.svc.updateFrontal(this.editId,     this.form.frontal));
          if (this.form.diferencial) calls.push(this.svc.updateDiferencial(this.editId, this.form.diferencial));
          if (this.form.cabina)      calls.push(this.svc.updateCabina(this.editId,      this.form.cabina));

          let pending = calls.length || 1;
          if (!calls.length) { this.postGuardado(); return; }

          calls.forEach(obs => obs.subscribe({
            next: () => { pending--; if (pending === 0) this.postGuardado(); },
            error: () => { this.errorMsg = 'Error al actualizar componentes.'; this.guardando = false; }
          }));
        },
        error: () => { this.errorMsg = 'Error al actualizar.'; this.guardando = false; }
      });
    } else {
      this.svc.create(this.form).subscribe({
        next: () => this.postGuardado(),
        error: () => { this.errorMsg = 'Error al crear el conjunto.'; this.guardando = false; }
      });
    }
  }

  postGuardado(): void {
    this.guardando = false;
    this.vista     = 'lista';
    this.cargarLista();
  }

  /** Abre el formulario de edición desde la vista de detalle */
  editarDesdeDetalle(): void {
    if (this.detalle) {
      this.abrirFormEdicion(this.detalle as unknown as ConjuntoArmadoResumen);
    }
  }

  /** Label del botón Subir — evita paréntesis literales en template */
  get labelSubir(): string {
    return this.subiendoImg
      ? 'Subiendo...'
      : `Subir (${this.archivosSeleccionados.length})`;
  }

  /** True si el detalle tiene al menos una imagen en cualquier componente */
  get hayImagenes(): boolean {
    if (!this.detalle?.imagenes) return false;
    return this.tiposComponente.some(t => (this.detalle!.imagenes![t] ?? []).length > 0);
  }

  cancelarForm(): void {
    this.vista    = 'lista';
    this.errorMsg = '';
  }

  formVacio(): ConjuntoCreateRequest {
    return {
      codigo: '', descripcion: '', observacion: '',
      cajaCambio:  { origen:'', destino:'', codigoVhcr:'', descripcion:'', model:'', serialNo:'', customerNo:'', inputTorque:'', oilCapacity:'', retardadorPartsListNo:'', retardadorSerialNo:'', medidaVolumen:'', medidaPeso:'', observacion:'' },
      motor:       { origen:'', destino:'', codigoVhcr:'', descripcion:'', model:'', serialNo:'', medidaVolumen:'', medidaPeso:'', observacion:'' },
      frontal:     { origen:'', destino:'', codigoVhcr:'', descripcion:'', type:'', assyNo:'', jourNo:'', medidaVolumen:'', medidaPeso:'', observacion:'' },
      diferencial: { origen:'', destino:'', codigoVhcr:'', descripcion:'', typeFunda:'', assyNoFunda:'', jourNoFunda:'', typeHuevo:'', assyNoHuevo:'', jourNoHuevo:'', medidaVolumen:'', medidaPeso:'', observacion:'' },
      cabina:      { origen:'', destino:'', codigoVhcr:'', descripcion:'', color:'', numeroSerie:'', partsListNo:'', configuracionEspecial:'', observacion:'' },
    };
  }

  // Mappers detalle → request
  private mapCaja(c: any): CajaCambioRequest  { return { origen: c.origen, destino: c.destino, codigoVhcr: c.codigoVhcr, descripcion: c.descripcion, model: c.model, serialNo: c.serialNo, customerNo: c.customerNo, inputTorque: c.inputTorque, oilCapacity: c.oilCapacity, retardadorPartsListNo: c.retardadorPartsListNo, retardadorSerialNo: c.retardadorSerialNo, medidaVolumen: c.medidaVolumen, medidaPeso: c.medidaPeso, observacion: c.observacion }; }
  private mapMotor(c: any): MotorRequest       { return { origen: c.origen, destino: c.destino, codigoVhcr: c.codigoVhcr, descripcion: c.descripcion, model: c.model, serialNo: c.serialNo, medidaVolumen: c.medidaVolumen, medidaPeso: c.medidaPeso, observacion: c.observacion }; }
  private mapFrontal(c: any): FrontalRequest   { return { origen: c.origen, destino: c.destino, codigoVhcr: c.codigoVhcr, descripcion: c.descripcion, type: c.type, assyNo: c.assyNo, jourNo: c.jourNo, medidaVolumen: c.medidaVolumen, medidaPeso: c.medidaPeso, observacion: c.observacion }; }
  private mapDif(c: any): DiferencialRequest   { return { origen: c.origen, destino: c.destino, codigoVhcr: c.codigoVhcr, descripcion: c.descripcion, typeFunda: c.typeFunda, assyNoFunda: c.assyNoFunda, jourNoFunda: c.jourNoFunda, typeHuevo: c.typeHuevo, assyNoHuevo: c.assyNoHuevo, jourNoHuevo: c.jourNoHuevo, medidaVolumen: c.medidaVolumen, medidaPeso: c.medidaPeso, observacion: c.observacion }; }
  private mapCabina(c: any): CabinaRequest     { return { origen: c.origen, destino: c.destino, codigoVhcr: c.codigoVhcr, descripcion: c.descripcion, color: c.color, numeroSerie: c.numeroSerie, partsListNo: c.partsListNo, configuracionEspecial: c.configuracionEspecial, observacion: c.observacion }; }

  // ════════════════════════════════════════════════════════════
  //  IMÁGENES
  // ════════════════════════════════════════════════════════════

  onArchivosSeleccionados(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.archivosSeleccionados = Array.from(input.files);
    this.previewUrls = [];
    this.archivosSeleccionados.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => this.previewUrls.push(e.target?.result as string);
      reader.readAsDataURL(f);
    });
  }

  subirImagenes(): void {
    if (!this.detalle || !this.archivosSeleccionados.length) return;
    this.subiendoImg = true;
    this.svc.uploadImagenes(
      this.detalle.id,
      this.tipoImagenSeleccionado,
      this.archivosSeleccionados
    ).subscribe({
      next: () => {
        this.archivosSeleccionados = [];
        this.previewUrls           = [];
        this.subiendoImg           = false;
        this.cargarDetalle(this.detalle!.id);
      },
      error: () => { this.errorMsg = 'Error al subir las imágenes.'; this.subiendoImg = false; }
    });
  }

  setPrincipal(idImagen: number): void {
    this.svc.setImagenPrincipal(idImagen).subscribe({
      next: () => this.cargarDetalle(this.detalle!.id)
    });
  }

  eliminarImagen(idImagen: number): void {
    if (!confirm('¿Eliminar esta imagen?')) return;
    this.svc.deleteImagen(idImagen).subscribe({
      next: () => this.cargarDetalle(this.detalle!.id)
    });
  }

  getImagenesDeComponente(tipo: string): ImagenConjunto[] {
    if (!this.detalle?.imagenes) return [];
    return (this.detalle.imagenes as Record<string, ImagenConjunto[]>)[tipo] ?? [];
  }

  getImagenPrincipalUrl(c: ConjuntoArmadoResumen): string {
    return c.imagenPrincipal
      ? this.svc.getUrlImagen(c.imagenPrincipal.split('/').pop() ?? '')
      : 'assets/img/no-image.png';
  }

  getImagenUrl(img: ImagenConjunto): string {
    return this.svc.getUrlImagen(img.nombreArchivo);
  }

  // ════════════════════════════════════════════════════════════
  //  UTILIDADES
  // ════════════════════════════════════════════════════════════

  setVista(v: Vista): void {
    this.vista    = v;
    this.errorMsg = '';
    if (v === 'lista' || v === 'estadisticas') this.detalle = null;
  }

  verDetalle(c: ConjuntoArmadoResumen): void {
    this.tabActivo = 'conjunto';
    this.cargarDetalle(c.id);
  }

  eliminarConjunto(id: string): void {
    if (!confirm('¿Eliminar este conjunto armado? Esta acción no se puede deshacer.')) return;
    this.svc.delete(id).subscribe({
      next: () => { this.vista = 'lista'; this.cargarLista(); }
    });
  }

  colorBadge(color: string): string {
    const mapa: Record<string, string> = {
      'tomate': '#E8450A', 'rojo': '#DC2626', 'azul': '#2563EB',
      'blanco': '#E5E7EB', 'negro': '#111827', 'gris': '#6B7280',
      'amarillo': '#EAB308', 'naranja': '#F97316', 'verde': '#16A34A'
    };
    return mapa[color?.toLowerCase()] ?? '#9CA3AF';
  }

  badgeEstado(c: ConjuntoArmadoResumen): string {
    if (this.tieneComponentes(c)) return 'completo';
    const faltantes = [c.cajaId, c.motorId, c.frontalId, c.diferencialId, c.cabinaId]
      .filter(x => !x).length;
    return faltantes >= 3 ? 'critico' : 'parcial';
  }

  trackById(_: number, item: any): string { return item.id ?? item.idImagen; }
}