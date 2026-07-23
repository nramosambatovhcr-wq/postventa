import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExtraccionRepuesto, ExtraccionRepuestosService } from 'src/app/services/extraccion-repuestos.service';

/* ── Rankings para los paneles interactivos ─────────────────── */
interface RankingAgencia {
  agencia: string;
  registros: number;
  piezas: number;
  pendientes: number;
  porcentaje: number;
}
interface RankingArticulo {
  codigo: string;
  articulo: string;
  piezas: number;
  extracciones: number;
  pendientes: number;
  porcentaje: number;
}

@Component({
  selector: 'app-extraccionvehi',
  templateUrl: './extraccionvehi.component.html',
  styleUrls: ['./extraccionvehi.component.css']
})
export class ExtraccionvehiComponent implements OnInit {
  repuestos: ExtraccionRepuesto[] = [];
  filtrados: ExtraccionRepuesto[] = [];
  estados: string[] = [];
  agencias: string[] = [];

  filtros = {
    estado: '',
    agencia: '',
    codigo: ''
  };

  // ── Paneles interactivos (clic para filtrar) ────────────────
  rankingAgencias: RankingAgencia[] = [];
  rankingArticulos: RankingArticulo[] = [];
  agenciaSel: string = '';   // agencia seleccionada
  articuloSel: string = '';  // código de artículo seleccionado
  topN: number = 25;         // cuántos repuestos mostrar en "más pedidos"
  readonly topNOpciones: number[] = [10, 25, 50, 100];

  // Dashboard estadistico
  estadisticas = {
    // Piezas / registros
    total: 0,
    pendientes: 0,
    entregados: 0,
    devueltos: 0,
    cantidadTotal: 0,
    cantidadPendiente: 0,
    cantidadEntregada: 0,
    cantidadDevuelta: 0,
    // Vehiculos (VINs distintos)
    vehiculosTotal: 0,
    vehiculosPendientes: 0,
    vehiculosCompletos: 0
  };

  form: FormGroup;
  modo: 'crear' | 'editar' = 'crear';
  modalVisible = false;

  // Upload
  uploading = false;
  uploadSuccess: string | null = null;
  uploadError: string | null = null;

  modalVerVisible = false;
  sel: ExtraccionRepuesto | null = null; // registro seleccionado para ver


  constructor(
    private extraservice: ExtraccionRepuestosService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      id: [null],
      codigo: ['', Validators.required],
      articulo: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      conjuntoUnidad: ['', Validators.required],
      vin: [null],
      fechaExtraccion: ['', Validators.required],
      agencia: ['', Validators.required],
      estado: ['PENDIENTE', Validators.required],
      observacion: [null],
      fechaDevolucion: [null],
      ajusteJymmy: [null],
      cliente: [null],
      otPrefacturaProforma: [null],
      solicitadoPor: [null],
      reservado: [null]
    });
  }

  // Modal de imagenes
  imagenesVisible = false;
  imagenesRegistroId: number | null = null;

  abrirImagenes(r: ExtraccionRepuesto): void {
    this.imagenesRegistroId = r.id ?? null;
    this.imagenesVisible = true;
  }

  cerrarImagenes(): void {
    this.imagenesVisible = false;
    this.imagenesRegistroId = null;
  }

  get haySeleccion(): boolean {
    return !!(this.agenciaSel || this.articuloSel);
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarFiltros();
  }

  cargarDatos(): void {
    this.extraservice.getAll(this.filtros).subscribe(data => {
      // Ordenar del mas reciente al mas antiguo por fecha de extraccion
      const ordenados = [...data].sort(
        (a, b) => new Date(b.fechaExtraccion).getTime() - new Date(a.fechaExtraccion).getTime()
      );
      this.repuestos = ordenados;
      this.recomputarVista();
    });
  }

  // ── Recalcula rankings, tabla y estadísticas según la selección ──
  recomputarVista(): void {
    // Base según la agencia seleccionada (para el ranking de artículos y la tabla)
    let base = this.repuestos;
    if (this.agenciaSel) {
      base = this.repuestos.filter(
        r => (((r.agencia || '').trim().toUpperCase()) || 'SIN AGENCIA') === this.agenciaSel
      );
    }

    // El ranking de agencias siempre se calcula sobre toda la lista (para poder cambiar de agencia)
    this.rankingAgencias = this.calcRankingAgencias(this.repuestos);

    // El ranking de repuestos respeta la agencia seleccionada
    this.rankingArticulos = this.calcRankingArticulos(base);

    // La tabla respeta también el artículo seleccionado
    this.filtrados = this.articuloSel
      ? base.filter(r => (r.codigo || '').trim() === this.articuloSel)
      : [...base];

    this.calcularEstadisticas();
  }

  private calcRankingAgencias(data: ExtraccionRepuesto[]): RankingAgencia[] {
    const map = new Map<string, RankingAgencia>();
    for (const r of data) {
      const key = ((r.agencia || '').trim().toUpperCase()) || 'SIN AGENCIA';
      let row = map.get(key);
      if (!row) {
        row = { agencia: key, registros: 0, piezas: 0, pendientes: 0, porcentaje: 0 };
        map.set(key, row);
      }
      row.registros++;
      row.piezas += Number(r.cantidad) || 0;
      if (r.estado === 'PENDIENTE') row.pendientes++;
    }
    const arr = Array.from(map.values())
      .sort((a, b) => (b.piezas - a.piezas) || (b.registros - a.registros));
    const max = arr.length ? Math.max(...arr.map(x => x.piezas)) : 0;
    arr.forEach(x => x.porcentaje = max ? Math.round((x.piezas / max) * 100) : 0);
    return arr;
  }

  private calcRankingArticulos(data: ExtraccionRepuesto[]): RankingArticulo[] {
    const map = new Map<string, RankingArticulo>();
    for (const r of data) {
      const key = (r.codigo || '').trim();
      if (!key) continue;
      let row = map.get(key);
      if (!row) {
        row = { codigo: key, articulo: r.articulo || '', piezas: 0, extracciones: 0, pendientes: 0, porcentaje: 0 };
        map.set(key, row);
      }
      row.piezas += Number(r.cantidad) || 0;
      row.extracciones++;
      if (r.estado === 'PENDIENTE') row.pendientes++;
      if (!row.articulo && r.articulo) row.articulo = r.articulo;
    }
    const arr = Array.from(map.values())
      .sort((a, b) => (b.piezas - a.piezas) || (b.extracciones - a.extracciones));
    const top = arr.slice(0, this.topN);
    const max = top.length ? Math.max(...top.map(x => x.piezas)) : 0;
    top.forEach(x => x.porcentaje = max ? Math.round((x.piezas / max) * 100) : 0);
    return top;
  }

  // ── Clics en los paneles ────────────────────────────────────
  seleccionarAgencia(agencia: string): void {
    const key = ((agencia || '').trim().toUpperCase()) || 'SIN AGENCIA';
    this.agenciaSel = (this.agenciaSel === key) ? '' : key; // toggle
    this.articuloSel = '';                                   // reinicia artículo al cambiar agencia
    this.recomputarVista();
  }

  seleccionarArticulo(codigo: string): void {
    const key = (codigo || '').trim();
    this.articuloSel = (this.articuloSel === key) ? '' : key; // toggle
    this.recomputarVista();
  }

  limpiarSeleccion(): void {
    this.agenciaSel = '';
    this.articuloSel = '';
    this.recomputarVista();
  }

  calcularEstadisticas(): void {
    const e = {
      total: 0,
      pendientes: 0,
      entregados: 0,
      devueltos: 0,
      cantidadTotal: 0,
      cantidadPendiente: 0,
      cantidadEntregada: 0,
      cantidadDevuelta: 0,
      vehiculosTotal: 0,
      vehiculosPendientes: 0,
      vehiculosCompletos: 0
    };

    // Conjuntos para contar VINs distintos
    const vinsTotal = new Set<string>();
    const vinsConPendiente = new Set<string>();

    for (const r of this.filtrados) {
      const cant = Number(r.cantidad) || 0;
      e.total++;
      e.cantidadTotal += cant;

      switch (r.estado) {
        case 'PENDIENTE':
          e.pendientes++;
          e.cantidadPendiente += cant;
          break;
        case 'ENTREGADO':
          e.entregados++;
          e.cantidadEntregada += cant;
          break;
        case 'DEVUELTO':
          e.devueltos++;
          e.cantidadDevuelta += cant;
          break;
      }

      // Conteo por vehiculo (VIN). Se ignoran registros sin VIN.
      const vin = (r.vin || '').trim().toUpperCase();
      if (vin) {
        vinsTotal.add(vin);
        if (r.estado === 'PENDIENTE') {
          vinsConPendiente.add(vin);
        }
      }
    }

    e.vehiculosTotal = vinsTotal.size;
    e.vehiculosPendientes = vinsConPendiente.size;
    e.vehiculosCompletos = vinsTotal.size - vinsConPendiente.size;

    this.estadisticas = e;
  }

  cargarFiltros(): void {
    this.extraservice.getEstados().subscribe(estados => this.estados = estados);
    this.extraservice.getAgencias().subscribe(agencias => this.agencias = agencias);
  }

  aplicarFiltros(): void {
    this.cargarDatos();
  }

  abrirModalCrear(): void {
    this.modo = 'crear';
    this.form.reset({
      cantidad: 1,
      estado: 'PENDIENTE',
      fechaExtraccion: new Date().toISOString().split('T')[0],
      vin: null,
      observacion: null,
      fechaDevolucion: null,
      ajusteJymmy: null,
      cliente: null,
      otPrefacturaProforma: null,
      solicitadoPor: null,
      reservado: null
    });
    this.modalVisible = true;
  }

  abrirModalEditar(repuesto: ExtraccionRepuesto): void {
    this.modo = 'editar';
    this.form.patchValue({
      ...repuesto,
      fechaExtraccion: repuesto.fechaExtraccion.split('T')[0],
      fechaDevolucion: repuesto.fechaDevolucion ? repuesto.fechaDevolucion.split('T')[0] : null
    });
    this.modalVisible = true;
  }

  abrirModalVer(reg: ExtraccionRepuesto): void {
    this.sel = reg;
    this.modalVerVisible = true;
  }

  cerrarModalVer(): void {
    this.modalVerVisible = false;
    this.sel = null;
  }

  guardar(): void {
    if (this.form.invalid) return;

    const raw = this.form.value;

    const repuesto: ExtraccionRepuesto = {
      ...raw,
      vin: raw.vin || null,
      observacion: raw.observacion || null,
      fechaDevolucion: raw.fechaDevolucion || null,
      ajusteJymmy: raw.ajusteJymmy || null,
      cliente: raw.cliente || null,
      otPrefacturaProforma: raw.otPrefacturaProforma || null,
      solicitadoPor: raw.solicitadoPor || null,
      reservado: raw.reservado || null
    };

    if (this.modo === 'crear') {
      delete repuesto.id;
      this.extraservice.create(repuesto).subscribe(() => {
        this.cerrarModal();
        this.cargarDatos();
      });
    } else {
      this.extraservice.update(repuesto.id!, repuesto).subscribe(() => {
        this.cerrarModal();
        this.cargarDatos();
      });
    }
  }

  eliminar(id: number): void {
    if (confirm('¿Seguro de eliminar este registro?')) {
      this.extraservice.delete(id).subscribe(() => this.cargarDatos());
    }
  }

  cerrarModal(): void {
    this.modalVisible = false;
  }

  // Upload Excel
  uploadExcel(file: File): void {
    this.uploading = true;
    this.uploadSuccess = null;
    this.uploadError = null;

    this.extraservice.uploadExcel(file).subscribe({
      next: (res: any) => {
        this.uploading = false;
        this.uploadSuccess = `${res.count} registros importados`;
        this.cargarDatos();
      },
      error: err => {
        this.uploading = false;
        this.uploadError = err.error?.message || 'Error al subir el archivo';
      }
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        this.uploadExcel(file);
      } else {
        this.uploadError = 'Por favor selecciona un archivo Excel (.xlsx)';
      }
    }
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files?.length) {
      const file = files[0];
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        this.uploadExcel(file);
      } else {
        this.uploadError = 'Solo se permiten archivos Excel (.xlsx)';
      }
    }
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('dragging');
  }

  onDragLeave(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('dragging');
  }

  mostrarUpload = false;

  toggleUpload(): void {
    this.mostrarUpload = !this.mostrarUpload;
  }
}