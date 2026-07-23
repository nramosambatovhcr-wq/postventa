import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { OracleService } from '../../services/oracle.service';
import { EquivalentesService } from '../../services/equivalentes.service';
import { ExtraccionBodService } from '../../services/extraccion-bod.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchDashboardComponent } from 'src/app/search-dashboard/search-dashboard.component';
import { PedidosoracleService } from 'src/app/services/pedidosoracle.service';

@Component({
  selector: 'app-pedidobod-search-modal',
  templateUrl: './pedidobod-search-modal.component.html',
  styleUrls: ['./pedidobod-search-modal.component.css']
})
export class PedidobodSearchModalComponent implements OnInit {

  // Si modoModal = true  → modal (necesita [visible] y botón para abrirlo)
  // Si modoModal = false → página standalone (siempre visible, default)
  @Input() modoModal: boolean = false;

  // Solo relevantes en modo modal
  @Input()  visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  textoBusqueda = '';
  mostrarPestarias = false;
  activeTab: 'stock' | 'buscar' | 'equivalentes' = 'stock';

  // stock
  stockMaster: any = null;
  stockAgencias: any[] = [];
  totalUnidadesDisponibles = 0;
  mensajeSinStock = '';

  // equivalentes
  equivList: any[] = [];
  equivDescriptions: string[] = [];
  equivCodes: string[] = [];
  equivStockMap: { [codigo: string]: number } = {};
  equivAgenciasMap: { [codigo: string]: { oficina: string; stock: number }[] } = {};

  constructor(
    private oracle: OracleService,
    private equivService: EquivalentesService,
    private extraccionService: ExtraccionBodService,
      private pedidosOracle: PedidosoracleService 
  ) {}

  ngOnInit(): void {}

  cerrar(): void {
    // Solo tiene efecto real en modo modal
    this.visible = false;
    this.textoBusqueda = '';
    this.mostrarPestarias = false;
    this.limpiarStock();
    this.limpiarEquivalentes();
    this.visibleChange.emit(false);
  }

  buscar(): void {
    const cod = this.textoBusqueda.trim();
    if (!cod) return;

    this.mostrarPestarias = true;
    this.activeTab = 'stock';

    this.cargarStock(cod);
    this.cargarEquivalentes(cod);
    // cargarBusqueda es manejado por <app-search-dashboard>
  }

  // ---------- STOCK ----------
private cargarStock(codigo: string): void {
  this.pedidosOracle.getStockTodasAgenciasDatos(codigo).subscribe({
    next: ({ articulo, nombre, agencias: todasAgencias }) => {
      this.stockMaster = { articulo, nombre, clase: '', grupo: '', lineaCompetencia: null };
      const agencias = todasAgencias.filter(a => a.stockDisponible > 0);

      const ficoaIndex = agencias.findIndex((a: any) => a.oficina === 'FICO-002');

      if (ficoaIndex !== -1) {
        this.extraccionService.buscarPorCodigo(codigo).subscribe({
          next: (resultados) => {
            if (resultados && resultados.length > 0) {
              const totalComprometido = resultados.reduce((sum, r) => sum + r.cantidad, 0);
              const ficoa = { ...agencias[ficoaIndex] };
              ficoa.stockReservado   = (ficoa.stockReservado  || 0) + totalComprometido;
              ficoa.stockDisponible  = Math.max(0, ficoa.stockDisponible - totalComprometido);
              agencias[ficoaIndex]   = ficoa;
            }
            this.aplicarStock(agencias);
          },
          error: () => this.aplicarStock(agencias)
        });
      } else {
        this.aplicarStock(agencias);
      }
    },
    error: () => this.limpiarStock()
  });
}

  private cargarStock1(codigo: string): void {
    this.oracle.getInventarioArticuloTotalDatos(codigo).subscribe({
      next: ({ master, inventario }) => {
        this.stockMaster = master;
        const agencias = (inventario || []).filter((l: any) => l.stockDisponible > 0);

        const ficoaIndex = agencias.findIndex((a: any) => a.oficina === 'FICO-002');

        if (ficoaIndex !== -1) {
          this.extraccionService.buscarPorCodigo(codigo).subscribe({
            next: (resultados) => {
              if (resultados && resultados.length > 0) {
                const totalComprometido = resultados.reduce((sum, r) => sum + r.cantidad, 0);
                const ficoa = { ...agencias[ficoaIndex] };
                ficoa.stockReservado = (ficoa.stockReservado || 0) + totalComprometido;
                ficoa.stockDisponible = Math.max(0, ficoa.stockDisponible - totalComprometido);
                agencias[ficoaIndex] = ficoa;
              }
              this.aplicarStock(agencias);
            },
            error: () => this.aplicarStock(agencias)
          });
        } else {
          this.aplicarStock(agencias);
        }
      },
      error: () => this.limpiarStock()
    });
  }

  private aplicarStock(agencias: any[]): void {
    this.stockAgencias = agencias;
    this.totalUnidadesDisponibles = agencias.reduce((s, r) => s + r.stockDisponible, 0);
    this.mensajeSinStock = this.totalUnidadesDisponibles === 0
      ? 'Sin stock disponible en ninguna agencia'
      : '';
  }

  private limpiarStock(): void {
    this.stockMaster = null;
    this.stockAgencias = [];
    this.totalUnidadesDisponibles = 0;
    this.mensajeSinStock = '';
  }

  // ---------- EQUIVALENTES ----------
  private async cargarEquivalentes(codigo: string): Promise<void> {
    const term = codigo.trim().toUpperCase();

    const matches = await this.equivService.getAll().toPromise().then((list: any) =>
      list.filter((eq: any) =>
        eq.codsistema.trim().toUpperCase() === term ||
        eq.codoriginal.trim().toUpperCase() === term ||
        [eq.codigo1, eq.codigo2, eq.codigo3, eq.codigo4, eq.codigo5]
          .some(c => c && c.trim().toUpperCase() === term)
      )
    );

    const descSet = new Set<string>();
    const codeSet = new Set<string>();

    matches.forEach((eq: any) => {
      if (eq.descripcion) descSet.add(eq.descripcion);
      const fields = [eq.codsistema, eq.codoriginal, eq.codigo1, eq.codigo2, eq.codigo3, eq.codigo4, eq.codigo5];
      fields.forEach(c => {
        if (c && c.trim().toUpperCase() !== term) codeSet.add(c.trim());
      });
    });

    const codesArr = Array.from(codeSet);
    await this.verificarStockConAgenciasAsync(codesArr);

    this.equivDescriptions = Array.from(descSet);
    this.equivCodes = codesArr;
  }

  private async verificarStockConAgenciasAsync(codigos: string[]): Promise<void> {
  const checks = codigos.map(code =>
    this.pedidosOracle.getStockConAgencias(code).toPromise().then(res => ({
      code,
      total:    res?.total    ?? 0,
      agencias: res?.agencias ?? []
    }))
  );
  const results = await Promise.all(checks);
  results.forEach(r => {
    this.equivStockMap[r.code]    = r.total;
    this.equivAgenciasMap[r.code] = r.agencias;
  });
}
  

  private async verificarStockConAgenciasAsync1(codigos: string[]): Promise<void> {
    const checks = codigos.map(code =>
      this.oracle.getStockConAgencias(code).toPromise().then(res => ({
        code,
        total: res?.total ?? 0,
        agencias: res?.agencias ?? []
      }))
    );

    const results = await Promise.all(checks);

    results.forEach(r => {
      this.equivStockMap[r.code] = r.total;
      this.equivAgenciasMap[r.code] = r.agencias;
    });
  }

  private limpiarEquivalentes(): void {
    this.equivDescriptions = [];
    this.equivCodes = [];
    this.equivStockMap = {};
    this.equivAgenciasMap = {};
  }

  // helper para <app-search-dashboard>
  get codigoParaBusqueda(): string {
    return this.textoBusqueda.trim();
  }
}