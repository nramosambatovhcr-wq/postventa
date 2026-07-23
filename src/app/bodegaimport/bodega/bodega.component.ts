import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BodegaService,  BodegaSearchParams } from 'src/app/services/bodega.service';
import { ReloadService } from 'src/app/services/reload.service';

// Asegúrate de que este modelo incluya ubicacionProvisional
export interface BodegaItemModel {
  codigo: string;
  descripcion: string;
  ubicacion: string;
  ubicacionprovisional: string;
  cantidad: number;
  reservada: number;
  estado: string;
  fecha: Date;
}

@Component({
  selector: 'app-bodega',
  templateUrl: './bodega.component.html',
  styleUrls: ['./bodega.component.css']
})
export class BodegaComponent implements OnInit, OnDestroy {
  // Propiedades para las estadísticas
  stats = {
    totalItems: 0,
    itemsActivos: 0,
    itemsInactivos: 0,
    totalCantidad: 0,
    totalReservado: 0
  };

  // Propiedades para la búsqueda y paginación
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 0;
  
  // Datos
  allData: BodegaItemModel[] = [];
  filteredData: BodegaItemModel[] = [];
  pagedData: BodegaItemModel[] = [];
  loading = false;
  private subscription = new Subscription();
  
  // Propiedades para el modal de reserva
  isModalReservaOpen: boolean = false;
  selectedItem: BodegaItemModel | null = null;
  cantidadAReservar: number = 0;
  
  // Propiedades para el modal de actualización
  isModalActualizarOpen: boolean = false;
  itemToUpdate: BodegaItemModel | null = null;
  
  constructor(
    private bodegaService: BodegaService,
    private reloadService: ReloadService
  ) { }

  ngOnInit(): void {
    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadBodegaData();
      })
    );
    this.loadBodegaData();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Carga los datos de estadísticas y los items de la bodega.
   */
  loadBodegaData(): void {
    this.loading = true;
    
    // Obtener estadísticas
    this.bodegaService.getBodegaStats().subscribe(stats => {
      this.stats = stats;
    });

    // Obtener todos los items de la bodega
    this.bodegaService.getAllBodegaItems().subscribe((response:any) => {
      if (response.success && response.items) {
        this.allData = response.items;
        this.applyFilters();
      }
      this.loading = false;
    });
  }

  /**
   * Aplica los filtros de búsqueda a los datos.
   */
  applyFilters(): void {
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
    this.filteredData = this.allData.filter(item => 
      (item.codigo && item.codigo.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (item.descripcion && item.descripcion.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (item.ubicacion && item.ubicacion.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (item.ubicacionprovisional && item.ubicacionprovisional.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (item.estado && item.estado.toLowerCase().includes(lowerCaseSearchTerm))
    );
    this.currentPage = 1;
    this.updatePaginationInfo();
  }

  /**
   * Filtra la tabla por un estado específico.
   * @param status El estado por el cual filtrar.
   */
  filterByStatus(status: string): void {
    this.searchTerm = status;
    this.applyFilters();
  }

  /**
   * Actualiza la información de la paginación y los datos a mostrar.
   */
  updatePaginationInfo(): void {
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.pagedData = this.filteredData.slice(startIndex, endIndex);
  }

  /**
   * Cambia la página actual de la tabla.
   * @param page El número de página a navegar.
   */
  changePage(page: any): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginationInfo();
    }
  }

  /**
   * Genera un array de números de página para la paginación.
   * @returns Un array de números de página.
   */
  getPaginationArray(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;
    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage > 2) {
        pages.push(1, '...');
      }
      for (let i = Math.max(1, this.currentPage - 1); i <= Math.min(this.totalPages, this.currentPage + 1); i++) {
        pages.push(i);
      }
      if (this.currentPage < this.totalPages - 1) {
        pages.push('...', this.totalPages);
      }
    }
    return pages;
  }

  /**
   * Abre el modal de reserva.
   * @param item El item de bodega a reservar.
   */
  openModalReserva(item: BodegaItemModel): void {
    this.selectedItem = item;
    this.cantidadAReservar = 0;
    this.isModalReservaOpen = true;
  }

  /**
   * Cierra el modal de reserva.
   */
  closeModalReserva(): void {
    this.isModalReservaOpen = false;
    this.selectedItem = null;
  }

  /**
   * Lógica para reservar un ítem, llamando al servicio.
   */
  reservarItem(): void {
    if (!this.selectedItem || this.cantidadAReservar <= 0) {
      console.error('Cantidad inválida o no se ha seleccionado un ítem.');
      return;
    }

    this.bodegaService.reservarBodegaItem(this.selectedItem.codigo, this.cantidadAReservar).subscribe({
      next: (response) => {
        if (response.success) {
          console.log(response.message);
          this.closeModalReserva();
          this.loadBodegaData();
        } else {
          console.error('Error en la reserva:', response.message);
        }
      },
      error: (error) => {
        console.error('Error al reservar:', error);
      }
    });
  }

  /**
   * Abre el modal para actualizar un ítem.
   * @param item El ítem a actualizar.
   */
  openModalActualizar(item: BodegaItemModel): void {
    // Clonamos el objeto para evitar modificar los datos directamente en la tabla
    this.itemToUpdate = { ...item };
    this.isModalActualizarOpen = true;
  }

  /**
   * Cierra el modal de actualización.
   */
  closeModalActualizar(): void {
    this.isModalActualizarOpen = false;
    this.itemToUpdate = null;
  }

  /**
   * Lógica para actualizar un ítem.
   */
 updateItem(): void {
    if (!this.itemToUpdate) {
      console.error('No se ha seleccionado un ítem para actualizar.');
      return;
    }

    this.loading = true; // Inicia el indicador de carga

    this.bodegaService.updateBodegaItem(this.itemToUpdate).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Ítem actualizado con éxito:', response.message);
          this.closeModalActualizar();
          this.loadBodegaData(); // Recarga los datos para reflejar los cambios
        } else {
          console.error('Error en la actualización:', response.message);
        }
      },
      error: (error) => {
        console.error('Error al actualizar el ítem:', error);
      },
      complete: () => {
        this.loading = false; // Finaliza el indicador de carga
      }
    });
  }

  /**
   * Calcula la cantidad disponible.
   * @param item El ítem de bodega.
   * @returns La cantidad disponible.
   */
  calcularDisponible(item: any): number {
    return item.cantidad - item.reservada;
  }
}