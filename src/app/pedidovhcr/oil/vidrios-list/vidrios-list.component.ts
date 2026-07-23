import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import { OilService, PedidoVidrioDetail } from 'src/app/services/oil.service'; // ← modelo vidrio
import { ReloadService } from 'src/app/services/reload.service';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';
 
/* =====  MISMAS INTERFACES  ===== */
export interface GroupedPedido {
  key: string;
  fechaPedido?: Date;
  nombreProveedor?: string;
  estadoPedido?: string;
  nombreUsuarioSolicitante?: string;
  nombreAgencia?: string;
  items: PedidoVidrioDetail[];
  idPedido?: number;
  totalItems?: number;
}

@Component({ 
  selector: 'app-vidrios-list',   
  templateUrl: './vidrios-list.component.html',
  styleUrls: ['./vidrios-list.component.css']
})
export class VidriosListComponent implements OnInit, OnDestroy {
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  lista: GroupedPedido[] = [];
  allData: PedidoVidrioDetail[] = [];
  groupedData: GroupedPedido[] = [];
  filteredData: GroupedPedido[] = [];
  loading = false;
  private subscription = new Subscription();

  startDate = '';
  endDate = '';
  totalItems = 0;
  paginaActual = '';
  errorMessage = '';

  showDetailsModal = false;
  selectedGroupedPedidoForDetails: GroupedPedido | null = null;

  showExportMenu = false;
  id = 0;
  usuario: Usuario | null = null;
  usrol = '';

  selectedPedido: any = null;
  observacionesModalVisible = false;

  constructor(
    private router: Router,
    private oilService: OilService,        // mismo servicio, distintos métodos
    private reloadService: ReloadService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.paginaActual = 'pendiente';
    this.authService.usuarioActual$.subscribe(u => {
      this.usuario = u;
      if (u) {
        this.id = u.id;
        this.usrol = u.rol;
        this.loadVidrios();
      }
    });
    this.subscription.add(
      this.reloadService.reload$.subscribe(() => this.loadVidrios())
    );

    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.startDate = this.formatDateForInput(first);
    this.endDate   = this.formatDateForInput(last);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /* ==========  CARGAS  ========== */
  loadVidrios(): void {
    this.loading = true;
    this.errorMessage = '';
    this.oilService.getAllVidrioPedidos().subscribe({   // ← endpoint vidrio
      next: (data: PedidoVidrioDetail[]) => {
        this.allData = data || [];
        this.groupedData = this.groupPedidosByDateSupplierUserAgency(this.allData);
        this.applyFiltersAndSearch();
        this.loading = false;
      },
      error: err => this.handleLoadError(err)
    });
  }
  loadVidriosA(): void {   // ASIGNADO
    this.loading = true;
    this.oilService.getAllVidrioPedidosA().subscribe({
      next: (data: PedidoVidrioDetail[]) => {
        this.allData = data?.filter(x => x.estadoPedido?.toUpperCase()==='ASIGNADO') || [];
        this.groupedData = this.groupPedidosByDateSupplierUserAgency(this.allData);
        this.applyFiltersAndSearch();
        this.loading = false;
      },
      error: err => this.handleLoadError(err)
    });
  }
  loadVidriosP(): void {   // PENDIENTE
    this.loading = true;
    this.oilService.getAllVidrioPedidosP().subscribe({
      next: (data: PedidoVidrioDetail[]) => {
        this.allData = data?.filter(x => x.estadoPedido?.toUpperCase()==='PENDIENTE') || [];
        this.groupedData = this.groupPedidosByDateSupplierUserAgency(this.allData);
        this.applyFiltersAndSearch();
        this.loading = false;
      },
      error: err => this.handleLoadError(err)
    });
  }
  loadVidriosEn(): void {  // ENVIADO
    this.loading = true;
    this.oilService.getAllVidrioPedidosEn().subscribe({
      next: (data: PedidoVidrioDetail[]) => {
        this.allData = data?.filter(x => x.estadoPedido?.toUpperCase()==='ENVIADO') || [];
        this.groupedData = this.groupPedidosByDateSupplierUserAgency(this.allData);
        this.applyFiltersAndSearch();
        this.loading = false;
      },
      error: err => this.handleLoadError(err)
    });
  }
  loadVidriosError(): void { // CANCELADO / ERROR
    this.loading = true;
    this.oilService.getAllVidrioPedidos().subscribe({
      next: (data: PedidoVidrioDetail[]) => {
        this.allData = data?.filter(x => ['CANCELADO','ERROR','RECHAZADO'].includes(x.estadoPedido?.toUpperCase()||'')) || [];
        this.groupedData = this.groupPedidosByDateSupplierUserAgency(this.allData);
        this.applyFiltersAndSearch();
        this.loading = false;
      },
      error: err => this.handleLoadError(err)
    });
  }
  private handleLoadError(err: any): void {
    console.error(err);
    this.errorMessage = 'Error al cargar pedidos de vidrios.';
    this.allData = this.groupedData = this.filteredData = this.lista = [];
    this.loading = false;
  }
  actualizarEstadoPedido(group: GroupedPedido): void {
  if (!group.items || !Array.isArray(group.items)) {
    console.error('No se encontraron items para actualizar en el grupo:', group);
    return;
  }

  // Actualizar TODOS los items del grupo al nuevo estado
  group.items.forEach((item: PedidoVidrioDetail) => {
    if (item.idPedido) {
      console.log('Actualizando estado para item de vidrio:', item.idPedido, 'Estado:', group.estadoPedido);
      // LLAMADA AL SERVICIO DE VIDRIOS
      this.oilService.updateVidrioRequestStatus(item.idPedido, group.estadoPedido || 'PENDIENTE')
        .subscribe({
          next: (response) => {
            console.log(`Estado actualizado para vidrio ${item.idPedido}:`, response);
          },
          error: (error) => {
            console.error(`Error al actualizar vidrio ${item.idPedido}:`, error);
            this.showToast(`Error al actualizar item ${item.idPedido}: ${error.error || error.message}`, 'error');
          }
        });
    } else {
      console.warn('Item de vidrio sin idPedido, no se puede actualizar:', item);
    }
  });

  // Recargar lista después de procesar todos
  this.loadVidrios();
}
  /* ==========  ESTADOS  ========== */
  pendiente(): void { this.paginaActual='pendiente'; this.loadVidriosP(); }
  asignado(): void { this.paginaActual='asignado'; this.loadVidriosA(); }
  proceso(): void { this.paginaActual='proceso'; this.loadVidrios(); }
  revisado(): void { this.paginaActual='revisados'; this.loadVidriosEn(); }
  error(): void { this.paginaActual='error'; this.loadVidriosError(); }

  /* ==========  AGRUPACIÓN  ========== */
  private groupPedidosByDateSupplierUserAgency(data: PedidoVidrioDetail[]): GroupedPedido[] {
    const map = new Map<string, GroupedPedido>();
    data.forEach(item => {
      const dateK = item.fechaPedido ? new Date(item.fechaPedido).toISOString().split('T')[0] : 'sin-fecha';
      const provK = item.nombreProveedor?.trim() || 'sin-proveedor';
      const userK = item.nombreUsuarioSolicitante?.trim() || 'sin-usuario';
      const agenK = (item as any).agencia?.trim() || 'sin-agencia';
      const key = `${dateK}|${provK}|${userK}|${agenK}`;
      if (!map.has(key)) {
        map.set(key, {
          key, fechaPedido: item.fechaPedido, nombreProveedor: item.nombreProveedor,
          estadoPedido: this.determineGroupStatus([item]), nombreUsuarioSolicitante: item.nombreUsuarioSolicitante,
          nombreAgencia: (item as any).agencia, items: [], idPedido: item.idPedido, totalItems: 0
        });
      }
      const g = map.get(key)!;
      g.items.push(item);
      g.totalItems = g.items.length;
      g.estadoPedido = this.determineGroupStatus(g.items);
    });
    return Array.from(map.values()).sort((a,b) => {
      const dA = a.fechaPedido ? new Date(a.fechaPedido).getTime() : 0;
      const dB = b.fechaPedido ? new Date(b.fechaPedido).getTime() : 0;
      return dB - dA || (a.nombreAgencia||'').localeCompare(b.nombreAgencia||'');
    });
  }
  private determineGroupStatus(items: PedidoVidrioDetail[]): string {
    if (!items.length) return 'DESCONOCIDO';
    const sts = items.map(x => x.estadoPedido?.toUpperCase().trim()||'PENDIENTE');
    const uniq = [...new Set(sts)];
    if (uniq.length===1) return uniq[0];
    const prio = ['ERROR','INFORMACION ERRONEA','RECHAZADO','CANCELADO','EN PROCESO','PROCESO','ASIGNADO','REVISADO','APROBADO','FINALIZADO','COMPLETADO','PENDIENTE'];
    for (const p of prio) if (sts.includes(p)) return p;
    return 'ESTADO MIXTO';
  }

  /* ==========  FILTROS / BÚSQUEDA  ========== */
  applyFiltersAndSearch(): void {
    let temp = [...this.groupedData];
    if (this.startDate && this.endDate) {
      const s = new Date(this.startDate); const e = new Date(this.endDate);
      e.setHours(23,59,59,999);
      temp = temp.filter(g => g.fechaPedido && new Date(g.fechaPedido)>=s && new Date(g.fechaPedido)<=e);
    }
    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      temp = temp.filter(g =>
        g.nombreProveedor?.toLowerCase().includes(t) ||
        g.estadoPedido?.toLowerCase().includes(t) ||
        g.nombreUsuarioSolicitante?.toLowerCase().includes(t) ||
        g.nombreAgencia?.toLowerCase().includes(t) ||
        g.items.some((it:any) =>
          it.codigoVidrio?.toLowerCase().includes(t) ||
          it.descripcionVidrio?.toLowerCase().includes(t) ||
          it.presentacionVidrio?.toLowerCase().includes(t) ||
          it.estadoPedido?.toLowerCase().includes(t)
        )
      );
    }
    this.filteredData = temp;
    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems/this.itemsPerPage)||1;
    this.currentPage = 1;
    this.updatePageData();
  }
  resetDateFilter(): void { this.startDate=this.endDate=''; this.applyFiltersAndSearch(); }

  /* ==========  PAGINACIÓN  ========== */
  updatePageData(): void {
    const start = (this.currentPage-1)*this.itemsPerPage;
    this.lista = this.filteredData.slice(start, start+this.itemsPerPage);
  }
  changePage(p: number): void { if (p>=1 && p<=this.totalPages) { this.currentPage=p; this.updatePageData(); } }
  getPaginationArray(): number[] {
    if (this.totalPages<=5) return Array.from({length:this.totalPages},(_,i)=>i+1);
    const pages:number[]=[1];
    if (this.currentPage>3) pages.push(-1);
    for (let i=Math.max(2,this.currentPage-1);i<=Math.min(this.totalPages-1,this.currentPage+1);i++) pages.push(i);
    if (this.currentPage<this.totalPages-2) pages.push(-1);
    pages.push(this.totalPages);
    return pages;
  }

  /* ==========  MODALES  ========== */
  viewPedidoDetails(group: GroupedPedido): void {
    this.selectedGroupedPedidoForDetails = group;
    this.showDetailsModal = true;
  }
  closeDetailsModal(): void { this.showDetailsModal=false; this.selectedGroupedPedidoForDetails=null; }

  openObservacionesModal(group: any): void {
    this.selectedPedido = group;
    this.observacionesModalVisible = true;
  }
  closeObservacionesModal(): void { this.observacionesModalVisible=false; }

  /* ==========  EXPORTABLES  ========== */
  toggleExportMenu(): void { this.showExportMenu=!this.showExportMenu; }
  downloadExcel(): void {
    if (!this.filteredData.length) { this.showToast('No hay datos','error'); return; }
    const flat = this.filteredData.flatMap(g => g.items.map((it:any)=>({
      'ID Pedido':it.idPedido||'',
      'Fecha Pedido':it.fechaPedido?new Date(it.fechaPedido).toLocaleDateString('es-ES'):'-',
      'Código Vidrio':it.codigoVidrio||'',
      'Descripción':it.descripcionVidrio||'',
      'Presentación':it.presentacionVidrio||'-',
      'Cantidad Solicitada':it.cantidadSolicitada||'',
      'Proveedor':it.nombreProveedor||'-',
      'Usuario Solicitante':it.nombreUsuarioSolicitante||'-',
      'Agencia':(it as any).agencia||'-',
      'Estado':it.estadoPedido||'-'
    })));
    const ws:XLSX.WorkSheet=XLSX.utils.json_to_sheet(flat);
    const wb:XLSX.WorkBook=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'PedidosVidrios');
    const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`PedidosVidrios_${new Date().toISOString().split('T')[0]}.xlsx`);
    this.showToast('Excel descargado','success');
  }
  downloadCSV(): void {
    if (!this.filteredData.length) { this.showToast('No hay datos','error'); return; }
    let head='ID Pedido,Código Vidrio,Descripción,Presentación,Cantidad Solicitada,Proveedor,Usuario Solicitante,Agencia,Estado,Fecha Pedido\n';
    const body=this.filteredData.flatMap(g => g.items.map((it:any)=>
      `"${it.idPedido||''}","${it.codigoVidrio||''}","${it.descripcionVidrio||''}","${it.presentacionVidrio||'-'}","${it.cantidadSolicitada||''}","${it.nombreProveedor||'-'}","${it.nombreUsuarioSolicitante||'-'}","${(it as any).agencia||'-'}","${it.estadoPedido||'-'}","${it.fechaPedido?new Date(it.fechaPedido).toLocaleDateString('es-ES'):'-'}"`
    ).join('\n')).join('\n');
    saveAs(new Blob([head+body],{type:'text/csv;charset=utf-8'}),`PedidosVidrios_${new Date().toISOString().split('T')[0]}.csv`);
    this.showToast('CSV descargado','success');
  }
  downloadModalExcel(): void {
    const g=this.selectedGroupedPedidoForDetails;
    if (!g?.items?.length) { this.showToast('No hay ítems','error'); return; }
    const flat=g.items.map((it:any)=>({
      'Código':it.codigoVidrio||'',
      'Descripción':it.descripcionVidrio||'',
      'Presentación':it.presentacionVidrio||'-',
      'Cantidad':it.cantidadSolicitada||'',
      'Estado Ítem':it.estadoPedido||'-'
    }));
    const ws=XLSX.utils.json_to_sheet(flat);
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'DetallesPedidoVidrio');
    const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    const fecha=(g.fechaPedido?new Date(g.fechaPedido).toISOString().split('T')[0]:'sin_fecha');
    saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`DetallesPedidoVidrio_${fecha}_${g.nombreProveedor||'sin_proveedor'}.xlsx`);
    this.showToast('Excel modal descargado','success');
  }
  downloadModalCSV(): void {
    const g=this.selectedGroupedPedidoForDetails;
    if (!g?.items?.length) { this.showToast('No hay ítems','error'); return; }
    let csv='Código,Descripción,Presentación,Cantidad,Estado Ítem\n';
    csv+=g.items.map((it:any)=>`"${it.codigoVidrio||''}","${it.descripcionVidrio||''}","${it.presentacionVidrio||'-'}","${it.cantidadSolicitada||''}","${it.estadoPedido||'-'}"`).join('\n');
    const fecha=(g.fechaPedido?new Date(g.fechaPedido).toISOString().split('T')[0]:'sin_fecha');
    saveAs(new Blob([csv],{type:'text/csv;charset=utf-8'}),`DetallesPedidoVidrio_${fecha}_${g.nombreProveedor||'sin_proveedor'}.csv`);
    this.showToast('CSV modal descargado','success');
  }

  /* ==========  NAVEGACIÓN  ========== */
  goToCreateVidrio(): void { this.router.navigate(['/vidrio']); }
  // si más adelante agregas otras pantallas descomenta:
  // goToCreateInsumo(): void { this.router.navigate(['/insumo']); }

  /* ==========  UTILS  ========== */
  formatDateForInput(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  trackByGroupKey(_: number, g: GroupedPedido): string { return g.key; }
  showToast(msg: string, type: 'success'|'error'|'info'): void {
    const t=document.createElement('div');
    t.innerText=msg; t.className=`toast toast-${type}`;
    t.style.cssText=`position:fixed;top:20px;right:20px;background:${type==='success'?'#4CAF50':type==='error'?'#f44336':'#2196F3'};color:white;padding:12px 24px;border-radius:4px;z-index:1000;opacity:0;transition:opacity .3s`;
    document.body.appendChild(t);
    setTimeout(()=>t.style.opacity='1',100);
    setTimeout(()=>{t.style.opacity='0'; setTimeout(()=>t.remove(),300)},3000);
  }
}