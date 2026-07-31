import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Usuario } from '../../models/usuario';
import { FormBuilder, FormGroup,  Validators } from '@angular/forms';
import { Proveedor, ProveedorService } from 'src/app/services/proveedor.service';
import { SearchDashboardComponent } from 'src/app/search-dashboard/search-dashboard.component';
import { ObservacionesComponent } from 'src/app/observaciones/observaciones.component';
import { ObservacionespedComponent } from 'src/app/observacionesped/observacionesped.component';

export interface Pedido {
    id_pedido?: number;
    codigo: string;
    descripcion: string;
    cantidad: number;
    observaciones?: string;
    estado?: string;
    idUsuarioCreacion?: number;
    idUsuarioModificacion?: number;
    modelo?: string;
    cliente?: string;
    ot?: string;
    nombre?: string;
    apellido?: string;
    fecha_creacion?: Date;
    imagenes?: string[];
    compra_local?: boolean;
}

@Component({
  selector: 'app-clocal',
  templateUrl: './clocal.component.html',
  styleUrls: ['./clocal.component.css']
})
export class ClocalComponent implements OnInit, OnDestroy {
    pedidos: Pedido[] = [];
    filteredData: Pedido[] = [];
    searchTerm: string = '';
    private subscriptions: Subscription = new Subscription();
    id: number = 0;
    private idSubscription: Subscription = new Subscription();

    // Variables para paginación
    currentPage: number = 1;
    itemsPerPage: number = 10;
    totalPages: number = 0;

    // Variables para el modal de imágenes
    isModalOpen: boolean = false;
    selectedImageUrl: string = '';

    // Variables para el modal de detalles
    showObservacionesModal1: boolean = false;
    selectedPedidoId: number | null = null;
    usrol: string = ''; 
    usuario: Usuario | null = null;
    selectedPedido: Pedido | null = null;
    observacionesModalVisible: boolean = false;
    showSearchModal: boolean = false;
    showExportMenu: boolean = false;
    paginaActual: string = '';

    // Variables de filtro
    startDate: string = '';
    endDate: string = '';
    allData1: Pedido[] = []; 
    lista: any[] = [];

      proveedores: Proveedor[] = [];
      proveedorForm: FormGroup;
      showProveedorModal: boolean = false;
      selectedPedidoForProveedor: Pedido | null = null;
      selectedFile: File | null = null;

    constructor(
        private pedidobodegaService: PedidobodegaService,
        private authService: AuthService,
        private reloadService: ReloadService,
         private fb: FormBuilder,
        private router: Router,
        private proveedorService: ProveedorService
    ) {

      this.proveedorForm = this.fb.group({
        id_proveedor: ['', Validators.required],
        fecha_cotizacion: [new Date().toISOString().split('T')[0], Validators.required],
        fecha_entrega: ['', Validators.required],
        numero_factura: ['', Validators.required],
        factura_archivo: [null]
    });
    }

    ngOnInit(): void {
        this.showProveedorModal = false;
        this.resetDateFilter();
        this.paginaActual='clocal';
        this.authService.usuarioActual$.subscribe(usuario => {
            this.usuario = usuario;
            if(this.usuario != null){
                this.id = this.usuario.id;
                this.usrol = this.usuario.rol;
                this.loadPedidosCompraLocal();
                 this.proveedorService.getProveedores().subscribe(data => {
                      this.proveedores = data;
                  });
            }
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    openProveedorModal(pedido: Pedido): void {
    this.selectedPedidoForProveedor = pedido;
   
    this.showProveedorModal = true;
}

closeProveedorModal(): void {
    this.showProveedorModal = false;
    this.proveedorForm.reset({
        fecha_cotizacion: new Date().toISOString().split('T')[0]
    });
    this.selectedFile = null;
}

onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
        this.selectedFile = file;
        this.proveedorForm.patchValue({
            factura_archivo: file
        });
        // You may want to update the display name here
    }
}

submitProveedorForm(): void {
    if (this.proveedorForm.valid && this.selectedPedidoForProveedor) {
        const formData = new FormData();
        formData.append('id_pedido', this.selectedPedidoForProveedor.id_pedido!.toString());
        formData.append('id_proveedor', this.proveedorForm.get('id_proveedor')?.value);
        formData.append('fecha_cotizacion', this.proveedorForm.get('fecha_cotizacion')?.value);
        formData.append('fecha_entrega', this.proveedorForm.get('fecha_entrega')?.value);
        formData.append('numero_factura', this.proveedorForm.get('numero_factura')?.value);
        if (this.selectedFile) {
            formData.append('factura_archivo', this.selectedFile, this.selectedFile.name);
        }

        // Call a service method to send this data to your backend
        this.pedidobodegaService.asignarProveedor(formData).subscribe({
            next: (response) => {
                this.showToast('Proveedor asignado exitosamente.', 'success');
                this.closeProveedorModal();
                this.loadPedidosCompraLocal(); // Reload data
            },
            error: (error) => {
                console.error('Error al asignar proveedor:', error);
                this.showToast('Error al asignar proveedor.', 'error');
            }
        });
    } else {
        this.showToast('Por favor, complete todos los campos requeridos.', 'error');
    }
}

    
  filterData(): void {
    // Show a more advanced filter modal/dialog
    console.log('Filtrar datos');
  }

    loadPedidosCompraLocal(): void {
        this.pedidobodegaService.clocal().subscribe(
            (data: Pedido[]) => {
                // 1) Solo compra local
                let pedidosCL = data.filter(item => item.compra_local);

                // 2) Filtro por rol (igual que en pedidobod) — cada usuario ve lo que le pertenece
                if (this.usrol === 'repuestoslv') {
                    pedidosCL = pedidosCL.filter(item => item && item.modelo === 'sl');
                } else if (this.usrol === 'repuestoslk') {
                    pedidosCL = pedidosCL.filter(item => item && item.modelo === 'lc');
                } else if (this.usrol === 'repuestoslsc') {
                    pedidosCL = pedidosCL.filter(item => item && item.modelo === 'sc');
                } else if (this.usrol === 'repuestos') {
                    pedidosCL = pedidosCL.filter(item => item && item.modelo === 'sp');
                }
                // else (admin u otros roles): ven todo

                this.pedidos = pedidosCL;
                this.allData1 = [...this.pedidos];
                this.applyFilter();
            },
            (error) => {
                console.error('Error al cargar los pedidos de compra local:', error);
            }
        );
    }

    applyFilter(): void {
        let filtered = this.pedidos;
        if (this.searchTerm) {
            filtered = filtered.filter(item =>
                item.codigo.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                item.descripcion.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (item.observaciones && item.observaciones.toLowerCase().includes(this.searchTerm.toLowerCase()))
            );
        }
        this.filteredData = filtered;
        this.updatePagination();
    }
    
    // Funciones del pedidobod.component.ts
    // Se agregan para manejar las funcionalidades de la interfaz de usuario
    applyDateFilter() {
      if (!this.startDate || !this.endDate) {
        this.filteredData = this.allData1;
      } else {
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        end.setHours(23, 59, 59, 999);

        this.filteredData = this.allData1.filter(item => {
          const itemDate = new Date(item.fecha_creacion as Date);
          return itemDate >= start && itemDate <= end;
        });
      }
      this.updatePagination();
    }

    resetDateFilter() {
        this.startDate = '';
        this.endDate = '';
        this.filteredData = this.allData1;
        this.updatePagination();
    }

    searchImports(): void {
        const searchTermLower = this.searchTerm.toLowerCase();
        
        let tempFilteredData = this.allData1;

        if (this.startDate && this.endDate) {
            const start = new Date(this.startDate);
            const end = new Date(this.endDate);
            end.setHours(23, 59, 59, 999);
            
            tempFilteredData = tempFilteredData.filter(item => {
                const itemDate = new Date(item.fecha_creacion as Date);
                return itemDate >= start && itemDate <= end;
            });
        }
        
        this.filteredData = tempFilteredData.filter(item => 
            (item.codigo && item.codigo.toLowerCase().includes(searchTermLower)) ||
            (item.descripcion && item.descripcion.toLowerCase().includes(searchTermLower)) ||
            (item.observaciones && item.observaciones.toLowerCase().includes(searchTermLower))
        );
        
        this.updatePagination();
    }

    // Funciones de navegación
    pendiente(){
        this.paginaActual = 'pendiente';
        this.router.navigate(['/pedidobod']);
    }

    clocal(){
        this.paginaActual = 'clocal';
        this.router.navigate(['/clocal']);
    }

    proceso(){
        this.paginaActual = 'proceso';
        this.router.navigate(['/pedidobodpro']);
    }

    asignado(){
        this.paginaActual = 'asignado';
        this.router.navigate(['/pedidobodasig']);
    }

    revisado(){
        this.paginaActual = 'revisado';
        this.router.navigate(['/pedidobodrev']);
    }

    error(){
        this.paginaActual = 'error';
        this.router.navigate(['/pedidoboderror']);
    }

    // Modal de búsqueda
    openSearchModal(): void {
        this.showSearchModal = true;
        document.body.classList.add('modal-open');
    }

    closeSearchModal(): void {
        this.showSearchModal = false;
        document.body.classList.remove('modal-open');
    }

    // Funciones de la tabla
    updatePagination(): void {
        this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages > 0 ? this.totalPages : 1;
        }
        this.visibleData();
    }

    changePage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.visibleData();
        }
    }

    visibleData(): Pedido[] {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        this.lista = this.filteredData.slice(startIndex, startIndex + this.itemsPerPage);
        return this.lista;
    }
    
    getPaginationArray(): number[] {
      const totalPages = this.totalPages;
      const currentPage = this.currentPage;
      
      if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      } else {
        const pages: number[] = [];
        pages.push(1);
        
        if (currentPage > 3) {
          pages.push(-1); 
        }
        
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
          pages.push(i);
        }
        
        if (currentPage < totalPages - 2) {
          pages.push(-1); 
        }
        
        if (totalPages > 1) {
          pages.push(totalPages);
        }
        
        return pages;
      }
    }

    // Funciones para el modal de imágenes
    openImageModal(imageUrl: string): void {
        this.selectedImageUrl = imageUrl;
        this.isModalOpen = true;
    }

    closeImageModal(): void {
        this.isModalOpen = false;
        this.selectedImageUrl = '';
    }

    getImageUrl(relativePath: string): string {
      const formattedPath = relativePath.replace(/\\/g, '/');
      return `https://bodega.vehicentro.com:1830/api/api/${formattedPath}`;
    }

    // Funciones para el modal de observaciones (ya existentes)
    openObservacionesModal(pedido: Pedido): void {
        this.selectedPedido = pedido;
        this.observacionesModalVisible = true;
    }

    closeObservacionesModal(): void {
        this.observacionesModalVisible = false;
        this.loadPedidosCompraLocal(); 
    }

    // Nueva función para ver detalles
    verObservaciones(id_pedido: number): void {
        this.selectedPedidoId = id_pedido;
        this.showObservacionesModal1 = true;
    }

    closeObservacionesModal1(): void {
        this.showObservacionesModal1 = false;
        this.selectedPedidoId = null;
    }

    // Acciones de exportación
    toggleExportMenu(): void {
      this.showExportMenu = !this.showExportMenu;
    }

    downloadExcel(): void {
        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredData);
        const workbook: XLSX.WorkBook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
        const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `PedidosCompraLocal_${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    downloadCSV(): void {
        let csvContent = 'Codigo,Descripcion,Cantidad,Observacion,Fecha,Estado\n';
        this.filteredData.forEach(item => {
            const row = [
                item.codigo,
                item.descripcion,
                item.cantidad,
                item.observaciones || '-',
                item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString() : '-',
                item.estado || '-'
            ].join(',');
            csvContent += row + '\n';
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, `PedidosCompraLocal_${new Date().toISOString().split('T')[0]}.csv`);
    }

    // Acción de la palomita
    toggleCompraLocal(item: Pedido): void {
      item.observaciones ='',
        item.compra_local = false;
        this.pedidobodegaService.actualizarEstadoPedido2(Number(item.id_pedido), item)
            .subscribe({
                next: () => {
                    this.filteredData = this.filteredData.filter(p => p.id_pedido !== item.id_pedido);
                    this.applyFilter();
                    this.showToast("Compra local actualizada", 'success');
                    this.loadPedidosCompraLocal();
                },
                error: (error) => {
                    console.error('Error al actualizar:', error);
                    item.compra_local = true;
                    this.showToast("Error al actualizar la compra local", 'error');
                }
            });
    }

    // Actualizar estado del pedido
    actualizarEstado(item: any): void {
      const pedidoActualizado = {
        id_pedido: parseInt(item.id_pedido) || 0,
        Cantidad: parseInt(item.cantidad) || 0,
        Codigo: String(item.codigo || ""),
        Descripcion: String(item.descripcion || ""),
        Observaciones: String(item.observaciones || ""),
        Estado: String(item.estado || ""),
        IdUsuarioCreacion: parseInt(item.idUsuarioCreacion) || 0,
        IdUsuarioModificacion: this.id,
        Modelo: String(item.modelo || ""),
        Cliente: String(item.cliente || ""),
        Ot: String(item.ot || "")
      };
      
      this.pedidobodegaService.actualizarEstadoPedido(item.id_pedido, pedidoActualizado).subscribe({
        next: () => {
          this.showToast("Estado actualizado exitosamente", 'success');
          this.loadPedidosCompraLocal();
        },
        error: (err) => {
          this.showToast(`Error al actualizar estado: ${err.error?.message || 'Error desconocido'}`, 'error');
          console.error("Error al actualizar estado", err);
        }
      });
    }

    // Función para notificaciones "toast"
    private showToast(message: string, type: 'success' | 'error'): void {
        const toast = document.createElement('div');
        toast.innerText = message;
        toast.classList.add('notificacion', type);
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('visible');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}