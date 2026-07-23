import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { OracleService, TransferenciaConMovimientos } from '../../services/oracle.service';
import {
  TransferenciaArmadoService,
  DetalleCompleto,
  AsignarArmadoRequest,
  EstadoArmadoRequest,
  EstadoRevisionRequest
} from '../../services/transferencia-armado.service';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';



@Component({ 
  selector: 'app-transferencias',
  templateUrl: './transferencias.component.html',
  styleUrls: ['./transferencias.component.css']
})
export class TransferenciasComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  loading: boolean = false;
  private subscription: Subscription = new Subscription();

  transferencias: TransferenciaConMovimientos[] = [];
  allData: TransferenciaConMovimientos[] = [];

  expandedTransferencias: Set<number> = new Set();
  showAllMovimientos: boolean = false;

  // Modal flags
  showModalDetalle = false;
  showModalAsignar = false;

  modalDetalleData: DetalleCompleto | null = null;
  modalAsignarData = {
  numero: 0,
  usuarios: [] as string[]
};

  transferenciasUnicas: TransferenciaConMovimientos[] = [];

  showModalArticulos = false;
articulosModal: TransferenciaConMovimientos[] = [];
numeroArticulosModal: number | null = null;
usuariosBodegaImpor1: any[] = [];

  id: number = 0;
  usuario: Usuario | null = null;
  
  usrol: string = '';
  estadosMap: Map<string, string> = new Map(); // numero → estadoGeneral

  constructor(
    private oracleService: OracleService,
     private authService: AuthService,
    private armadoService: TransferenciaArmadoService
  ) {}

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        this.id = this.usuario.id;
        this.usrol = this.usuario.rol;
         this.loadTransferencias();
         this.loadEstadosGenerales();
      }
    });
   
    this.armadoService.getUsuariosBodegaImpor1().subscribe(res => {
    console.log('Usuarios bodegaimpor1:', res.data);
    this.usuariosBodegaImpor1 = res.data;
  });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadTransferencias(): void {
    this.loading = true;
    this.subscription.add(
      this.oracleService.getTransferenciasSolicitadasConMovimientos().subscribe({
        next: (transferencias) => {
          this.allData = transferencias;
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar las transferencias:', error);
          this.allData = [];
          this.transferencias = [];
          this.loading = false;
        }
      })
    );
  }

  loadEstadosGenerales(): void {
  this.armadoService.getAllEstadosGenerales().subscribe({
    next: (estados) => {
      this.estadosMap.clear();
      estados.forEach(e => this.estadosMap.set(e.numeroTransferencia, e.estadoGeneral));
      this.applyFilters(); // ← para que se actualice la tabla
    },
    error: (err) => console.warn('No se pudieron cargar estados generales', err)
  });
}

  applyFilters(): void {
    let tempFilteredData = this.allData;
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase();

    if (lowerCaseSearchTerm) {
      tempFilteredData = tempFilteredData.filter(item =>
        (item.numero?.toString().includes(lowerCaseSearchTerm)) ||
        (item.fecha?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.estado?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.tipoDocumento?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.usuarioCreacion?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.oficinaOrigenCodigo?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.oficinaOrigenNombre?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.oficinaDestinoCodigo?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.oficinaDestinoNombre?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.articulo?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.nombreArticulo?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.ubicacion?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (item.movimientosDetalle?.some(mov =>
          mov.tipo?.toLowerCase().includes(lowerCaseSearchTerm) ||
          mov.usuario?.toLowerCase().includes(lowerCaseSearchTerm)
        ))
      );
    }

    this.transferencias = tempFilteredData;

    // Agrupar por número de transferencia y quedarse solo con una por cada una
      const uniqueMap = new Map<number, TransferenciaConMovimientos>();
      this.transferencias.forEach(t => {
        if (!uniqueMap.has(t.numero)) {
          uniqueMap.set(t.numero, t);
        }
      });
      this.transferenciasUnicas = Array.from(uniqueMap.values());
  }

  toggleMovimientos(numeroTransferencia: number): void {
    if (this.expandedTransferencias.has(numeroTransferencia)) {
      this.expandedTransferencias.delete(numeroTransferencia);
    } else {
      this.expandedTransferencias.add(numeroTransferencia);
    }
  }

  isTransferenciaExpanded(numeroTransferencia: number): boolean {
    return this.expandedTransferencias.has(numeroTransferencia);
  }

  toggleAllMovimientos(): void {
    if (this.showAllMovimientos) {
      this.expandedTransferencias.clear();
    } else {
      this.transferencias.forEach(transferencia => {
        if (transferencia.totalMovimientos > 0) {
          this.expandedTransferencias.add(transferencia.numero);
        }
      });
    }
    this.showAllMovimientos = !this.showAllMovimientos;
  }

  getOficinaText(nombre: string, codigo: string): string {
    return nombre ? `${nombre} (${codigo})` : codigo;
  }

  getStockStatus(transferencia: TransferenciaConMovimientos): string {
    if (transferencia.stockDisponible >= transferencia.cantidadSolicitada) {
      return 'suficiente';
    } else if (transferencia.stockDisponible > 0) {
      return 'insuficiente';
    } else {
      return 'sin-stock';
    }
  }

  getResumenMovimientos(transferencia: TransferenciaConMovimientos): string {
    if (transferencia.totalMovimientos === 0) {
      return 'Sin movimientos';
    }
    const ultimoMovimiento = this.oracleService.getUltimoMovimiento(transferencia.movimientosDetalle);
    return `${transferencia.totalMovimientos} mov. | Último: ${ultimoMovimiento?.tipo || 'N/A'}`;
  }

  formatearFechaMovimiento(fecha: string): string {
    if (!fecha) return 'N/A';
    if (fecha.includes('/')) return fecha;
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-ES') + ' ' + fechaObj.toLocaleTimeString('es-ES');
  }

  getEstadoClass(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'SO': return 'pendiente';
      case 'AP': return 'aprobada';
      case 'AN': return 'anulada';
      case 'EN': return 'entregada';
      case 'RE': return 'revision';
      default: return 'pendiente';
    }
  }

  getEstadisticasMovimientos(): any {
    return {
      totalTransferencias: this.transferencias.length,
      conMovimientos: this.transferencias.filter(t => t.totalMovimientos > 0).length,
      sinMovimientos: this.transferencias.filter(t => t.totalMovimientos === 0).length,
      stockSuficiente: this.transferencias.filter(t => t.stockDisponible >= t.cantidadSolicitada).length,
      stockInsuficiente: this.transferencias.filter(t => t.stockDisponible < t.cantidadSolicitada && t.stockDisponible > 0).length,
      sinStock: this.transferencias.filter(t => t.stockDisponible <= 0).length
    };
  }

  // MODALES
  abrirModalDetalle(numero: any): void {
    this.armadoService.getDetalleCompleto(numero).subscribe(data => {
      this.modalDetalleData = data;
      this.showModalDetalle = true;
    });
  }

  cerrarModalDetalle(): void {
    this.showModalDetalle = false;
    this.modalDetalleData = null;
  }

 abrirModalAsignar(numero: any): void {
  this.modalAsignarData = {
    numero,
    usuarios: []
  };
  this.showModalAsignar = true;
}

  cerrarModalAsignar(): void {
    this.showModalAsignar = false;
    this.modalAsignarData = { numero: 0 , usuarios: []};
  }

 guardarAsignacion(): void {
  if (!this.modalAsignarData.usuarios.length) {
    alert('Debe seleccionar al menos un usuario');
    return;
  }
  let usu = this.usuario?.nombreUsuario;

  const body = {
    numero: this.modalAsignarData.numero,
    usuarios: this.modalAsignarData.usuarios,
    usuarioQueAsigna: usu
  };

  this.armadoService.asignarArmadoresATransferencia(body).subscribe(() => {
    this.cerrarModalAsignar();
    this.loadTransferencias();
  });
}

getEstadoArmadoClase(estado: any): string {
  switch (estado?.toLowerCase()) {
    case 'completo': return 'estado-completo';
    case 'parcial': return 'estado-parcial';
    case 'pendiente': return 'estado-pendiente';
     case 'en armado': return 'estado-en-armado';
      case 'en revision': return 'estado-en-revision';
    default: return 'estado-pendiente';
  }
}

  // Colores de estados
  getEstadoGeneralClase(estado: any): string {
    switch (estado) {
      case 'En Proceso': return 'estado-proceso';
      case 'En Revisión': return 'estado-revision';
      case 'Despachada': return 'estado-despachada';
      default: return 'estado-pendientes';
    }
  }

 refrescarDatos(): void {
  this.loadTransferencias();
  this.loadEstadosGenerales();
}

  getEstadoRevisionClase(estado: string): string {
    switch (estado) {
      case 'Incompleto': return 'estado-incompleto';
      case 'Revisado': return 'estado-revisado';
      default: return 'estado-pendiente';
    }
  }

  abrirModalArticulos1(numero: number): void {
  this.oracleService.getTransferenciaPorNumero(numero).subscribe({
    next: (data) => {
      this.articulosModal = data;
      this.numeroArticulosModal = numero;
      this.showModalArticulos = true;
    },
    error: (err) => {
      console.error('Error al cargar artículos de la transferencia', err);
    }
  });
}

abrirModalArticulos(numero: number): void {
  this.oracleService.getTransferenciaPorNumero(numero).subscribe({
    next: (raw:any) => {
      let data = raw.datos;
      // raw es el array plano que llega del endpoint
      this.articulosModal = data.map((r: any) => ({
        articulo: r.articulo,
        nombreArticulo: r.nombreArticulo,
        cantidadSolicitada: r.cantidadSolicitada,
        stockDisponible: r.stockDisponible,
        ubicacion: r.ubicacion
      }));
      this.numeroArticulosModal = numero;
      this.showModalArticulos = true;
    },
    error: (err) => {
      console.error('Error al cargar artículos de la transferencia', err);
    }
  });
}

cerrarModalArticulos(): void {
  this.showModalArticulos = false;
  this.articulosModal = [];
  this.numeroArticulosModal = null;
}

onUsuarioToggle(event: Event, usuario: string): void {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked) {
    if (!this.modalAsignarData.usuarios.includes(usuario)) {
      this.modalAsignarData.usuarios.push(usuario);
    }
  } else {
    this.modalAsignarData.usuarios = this.modalAsignarData.usuarios.filter(u => u !== usuario);
  }
}
}