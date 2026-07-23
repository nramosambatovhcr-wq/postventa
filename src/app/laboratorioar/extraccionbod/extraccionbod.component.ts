import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExtraccionBodService, ExtraccionBod, ExtraccionBodFiltros } from '../../services/extraccion-bod.service';
import { AuthService } from '../../services/auth.service'; // ajusta la ruta si es diferente
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  selector: 'app-extraccionbod',
  templateUrl: './extraccionbod.component.html',
  styleUrls: ['./extraccionbod.component.css']
})
export class ExtraccionbodComponent implements OnInit {
  lista: ExtraccionBod[] = [];
  filtrados: ExtraccionBod[] = [];
  estados: string[] = [];
  agencias: string[] = [];

  filtros: ExtraccionBodFiltros = {};
  form: FormGroup;
  modo: 'crear' | 'editar' = 'crear';
  modalVisible = false;

  // Rol del usuario
  usrol: string = '';

  // ── Paneles interactivos (estilo otgrtfactdetalle) ──────────
  rankingAgencias: RankingAgencia[] = [];
  rankingArticulos: RankingArticulo[] = [];
  agenciaSel: string = '';   // agencia seleccionada (clic en el panel)
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
    anulados: 0,
    cantidadTotal: 0,
    cantidadPendiente: 0,
    cantidadEntregada: 0,
    cantidadDevuelta: 0,
    cantidadAnulada: 0,
    // Conjuntos armados (codigoConjunto distinto)
    conjuntosTotal: 0,
    conjuntosPendientes: 0,
    conjuntosCompletos: 0
  };

  // Estados disponibles para selects
  readonly estadosOpciones: string[] = ['PENDIENTE', 'ENTREGADO', 'DEVUELTO', 'ANULADO'];

  // Modal edición completa (laboratorio1 / laboratorio2)
  modalLabVisible = false;
  formLab: FormGroup;

  // Modal Ver
  modalVerVisible = false;
  registroSeleccionado: ExtraccionBod | null = null;

  constructor(
    private service: ExtraccionBodService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      id: [null],
      codigo: ['', Validators.required],
      articulo: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      conjunto: [''],
      codigoConjunto: [''],
      fechaExtraccion: [''],
      agencia: [''],
      requisicionReversion: [''],
      ajusteJimmy: [''],
      cliente: [''],
      otPrefacturaProforma: [''],
      solicitadoPor: [''],
      fechaDevolucion: [''],
      reservado: [''],
      ajuste: [''],
      codigoEstado: [''],
      estado: ['PENDIENTE'],
      observacion: [''],
      proveedor: [''],
      stock: ['']
    });

    this.formLab = this.fb.group({
      id: [null],
      codigo: ['', Validators.required],
      articulo: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      conjunto: [''],
      codigoConjunto: [''],
      fechaExtraccion: [''],
      agencia: [''],
      requisicionReversion: [''],
      ajusteJimmy: [''],
      cliente: [''],
      otPrefacturaProforma: [''],
      solicitadoPor: [''],
      fechaDevolucion: [''],
      reservado: [''],
      ajuste: [''],
      codigoEstado: [''],
      estado: ['PENDIENTE'],
      observacion: [''],
      proveedor: [''],
      stock: ['']
    });
  }

  // Modal de imágenes
  imagenesVisible = false;
  imagenesRegistroId: number | null = null;

  abrirImagenes(item: ExtraccionBod): void {
    this.imagenesRegistroId = item.id ?? null;
    this.imagenesVisible = true;
  }

  cerrarImagenes(): void {
    this.imagenesVisible = false;
    this.imagenesRegistroId = null;
  }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      if (usuario) {
        this.usrol = usuario.rol;
      }
    });
    this.cargarDatos();
    this.cargarFiltros();
  }

  // ── Helpers de rol ──────────────────────────────────────────
  get esBodegaImpor(): boolean {
    return this.usrol === 'bodegaimpor';
  }

  get esLaboratorio(): boolean {
    return this.usrol === 'laboratorio1' || this.usrol === 'laboratorio2';
  }

  get haySeleccion(): boolean {
    return !!(this.agenciaSel || this.articuloSel);
  }

  // ── Datos ───────────────────────────────────────────────────
  cargarDatos(): void {
    this.service.getAll(this.filtros).subscribe(data => {
      this.lista = data.sort((a, b) => {
        const dateA = new Date(a.fechaExtraccion || 0);
        const dateB = new Date(b.fechaExtraccion || 0);
        return dateB.getTime() - dateA.getTime();
      });
      this.recomputarVista();
    });
  }

  // ── Recalcula rankings, tabla y estadísticas según la selección ──
  recomputarVista(): void {
    // Base según la agencia seleccionada (para el ranking de artículos y la tabla)
    let base = this.lista;
    if (this.agenciaSel) {
      base = this.lista.filter(
        r => (((r.agencia || '').trim().toUpperCase()) || 'SIN AGENCIA') === this.agenciaSel
      );
    }

    // El ranking de agencias siempre se calcula sobre toda la lista (para poder cambiar de agencia)
    this.rankingAgencias = this.calcRankingAgencias(this.lista);

    // El ranking de repuestos respeta la agencia seleccionada
    this.rankingArticulos = this.calcRankingArticulos(base);

    // La tabla respeta también el artículo seleccionado
    this.filtrados = this.articuloSel
      ? base.filter(r => (r.codigo || '').trim() === this.articuloSel)
      : [...base];

    this.calcularEstadisticas();
  }

  private calcRankingAgencias(data: ExtraccionBod[]): RankingAgencia[] {
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

  private calcRankingArticulos(data: ExtraccionBod[]): RankingArticulo[] {
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

  // ── Estadisticas del dashboard ──────────────────────────────
  calcularEstadisticas(): void {
    const e = {
      total: 0,
      pendientes: 0,
      entregados: 0,
      devueltos: 0,
      anulados: 0,
      cantidadTotal: 0,
      cantidadPendiente: 0,
      cantidadEntregada: 0,
      cantidadDevuelta: 0,
      cantidadAnulada: 0,
      conjuntosTotal: 0,
      conjuntosPendientes: 0,
      conjuntosCompletos: 0
    };

    // Conjuntos distintos (por codigoConjunto; si falta, por nombre de conjunto)
    const conjuntosTotal = new Set<string>();
    const conjuntosConPendiente = new Set<string>();

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
        case 'ANULADO':
          e.anulados++;
          e.cantidadAnulada += cant;
          break;
      }

      // Conteo por conjunto armado. Se ignoran registros sin conjunto.
      const key = (r.codigoConjunto || r.conjunto || '').trim().toUpperCase();
      if (key) {
        conjuntosTotal.add(key);
        if (r.estado === 'PENDIENTE') {
          conjuntosConPendiente.add(key);
        }
      }
    }

    e.conjuntosTotal = conjuntosTotal.size;
    e.conjuntosPendientes = conjuntosConPendiente.size;
    e.conjuntosCompletos = conjuntosTotal.size - conjuntosConPendiente.size;

    this.estadisticas = e;
  }

  cargarFiltros(): void {
    this.service.getEstados().subscribe(e => this.estados = e);
    this.service.getAgencias().subscribe(a => this.agencias = a);
  }

  aplicarFiltros(): void {
    this.cargarDatos();
  }

  // ── bodegaimpor: cambiar estado desde la tabla ──────────────
  // Llamado por (ngModelChange) — el valor ya viene actualizado en item.estado
  cambiarEstadoDirecto(item: ExtraccionBod, nuevoEstado: string): void {
    const actualizado: ExtraccionBod = { ...item, estado: nuevoEstado };
    this.service.update(item.id!, actualizado).subscribe({
      next: () => {
        item.estado = nuevoEstado; // confirma visualmente
        this.recomputarVista();    // refresca dashboard y rankings
      },
      error: (err) => {
        console.error('Error al actualizar estado:', err);
        this.cargarDatos(); // revierte recargando desde el backend
      }
    });
  }

  // ── Modal crear ─────────────────────────────────────────────
  abrirModalCrear(): void {
    this.modo = 'crear';
    this.form.reset({
      cantidad: 1,
      estado: 'PENDIENTE',
      fechaExtraccion: new Date().toISOString().split('T')[0]
    });
    this.modalVisible = true;
  }

  cerrarModal(): void {
    this.modalVisible = false;
  }

  guardar(): void {
    if (this.form.invalid) return;
    const bod: ExtraccionBod = this.form.value;

    if (this.modo === 'crear') {
      delete bod.id;
      this.service.create(bod).subscribe({
        next: () => { this.cerrarModal(); this.cargarDatos(); },
        error: (err) => console.error('Error al crear:', err)
      });
    } else {
      this.service.update(bod.id!, bod).subscribe({
        next: (res) => {
          console.log(res.mensaje);
          this.cerrarModal();
          this.cargarDatos();
        },
        error: (err) => console.error('Error al actualizar:', err)
      });
    }
  }

  // ── Modal editar: laboratorio → modal completo, otros → modal simple ──
  abrirModalEditar(item: ExtraccionBod): void {
    if (this.esLaboratorio) {
      this.formLab.patchValue({
        ...item,
        fechaExtraccion: item.fechaExtraccion?.split('T')[0] ?? '',
        fechaDevolucion: item.fechaDevolucion?.split('T')[0] ?? ''
      });
      this.modalLabVisible = true;
    } else {
      this.modo = 'editar';
      this.form.patchValue({
        ...item,
        fechaExtraccion: item.fechaExtraccion?.split('T')[0] ?? '',
        fechaDevolucion: item.fechaDevolucion?.split('T')[0] ?? ''
      });
      this.modalVisible = true;
    }
  }

  cerrarModalLab(): void {
    this.modalLabVisible = false;
    this.formLab.reset();
  }

  guardarLab(): void {
    if (this.formLab.invalid) return;
    const bod: ExtraccionBod = this.formLab.value;

    this.service.update(bod.id!, bod).subscribe({
      next: (res) => {
        console.log(res.mensaje);
        this.cerrarModalLab();
        this.cargarDatos();
      },
      error: (err) => {
        console.error('Error al guardar:', err);
      }
    });
  }

  // ── Modal Ver ────────────────────────────────────────────────
  abrirModalVer(item: ExtraccionBod): void {
    this.registroSeleccionado = item;
    this.modalVerVisible = true;
  }

  cerrarModalVer(): void {
    this.modalVerVisible = false;
    this.registroSeleccionado = null;
  }

  // ── Eliminar ─────────────────────────────────────────────────
  eliminar(id: number): void {
    if (confirm('¿Seguro de eliminar este registro?')) {
      this.service.delete(id).subscribe(() => this.cargarDatos());
    }
  }

  // ── Excel ────────────────────────────────────────────────────
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.service.uploadExcel(file).subscribe(res => {
      alert(`${res.count} registros importados`);
      this.cargarDatos();
    });
  }

  descargarExcel(): void {
    const datos = this.filtrados.map(item => ({
      'Código':                 item.codigo,
      'Artículo':               item.articulo,
      'Cantidad':               item.cantidad,
      'Conjunto':               item.conjunto || '',
      'Código Conjunto':        item.codigoConjunto || '',
      'Agencia':                item.agencia || '',
      'Estado':                 item.estado || '',
      'Código Estado':          item.codigoEstado || '',
      'Fecha Extracción':       item.fechaExtraccion ? item.fechaExtraccion.split('T')[0] : '',
      'Fecha Devolución':       item.fechaDevolucion ? item.fechaDevolucion.split('T')[0] : '',
      'Proveedor':              item.proveedor || '',
      'Stock':                  item.stock || '',
      'Requisición/Reversión':  item.requisicionReversion || '',
      'Ajuste Jimmy':           item.ajusteJimmy || '',
      'Cliente':                item.cliente || '',
      'OT/Prefactura/Proforma': item.otPrefacturaProforma || '',
      'Solicitado Por':         item.solicitadoPor || '',
      'Reservado':              item.reservado || '',
      'Ajuste':                 item.ajuste || '',
      'Observación':            item.observacion || '',
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    ws['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 16 },
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
      { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 20 },
      { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extracción Bodega');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const fecha = new Date().toISOString().split('T')[0];
    saveAs(blob, `extraccion_bod_${fecha}.xlsx`);
  }
}