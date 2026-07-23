import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { BlService, PedidosBlModel, CreatePedidoResponse } from '../../services/bl.service';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';

export interface BlDetailItemForRequest {
  id: number;
  codigo: string;
  descripcionEspanol: string;
  cantidad: number;
  unidad: string;
  comentarios: string;
  isSaving?: boolean;
  cantidadAPartar: number;
  invoiceN: string;
  invoiceBl: string;
  blNombre: string;
  idInvoiceBl?: number; // Agregar este campo para el pedido
}

@Component({
  selector: 'app-blpedus',
  templateUrl: './blpedus.component.html',
  styleUrls: ['./blpedus.component.css']
})
export class BlpedusComponent implements OnInit {
  blId: number | undefined;
  blnombre: string | undefined;
  currentBlDetails: BlDetailItemForRequest[] = [];
  filteredBlDetails: BlDetailItemForRequest[] = [];
  isLoadingDetails: boolean = false;
  errorMessage: string | null = null;
  searchTerm: string = '';
  selectedDetail: BlDetailItemForRequest | any;
  requestModalVisible: boolean = false;

  idusuario: number = 0;
  usuario: Usuario | null = null;
  usrol: string = '';

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
        this.idusuario = this.usuario.id;
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

  loadBl(blId: number): void {
    this.blService.getBlById(blId).subscribe((response: any) => {
      this.blnombre = response.nombre;
    });
  }

  loadBlDetails(blId: number): void {
    this.isLoadingDetails = true;
    this.errorMessage = null;

    this.blService.getAllDetailsA(blId)
      .pipe(
        finalize(() => this.isLoadingDetails = false),
        catchError(error => {
          console.error('Error al obtener los detalles del BL:', error);
          this.errorMessage = 'Error al cargar los detalles del BL. Intente nuevamente más tarde.';
          return of([]);
        })
      )
      .subscribe((details: any[]) => {
        console.log(details);
        
        this.currentBlDetails = details.map((d) => ({
          ...d,
          cantidadAPartar: d.cantidadAPartar || 1, // Default to 1
          comentarios: d.comentarios || '',
          isSaving: false,
        }));
        this.applyFilter();
      });
  }

  applyFilter(): void {
    if (!this.searchTerm) {
      this.filteredBlDetails = [...this.currentBlDetails];
    } else {
      const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
      this.filteredBlDetails = this.currentBlDetails.filter(detail =>
        detail.codigo.toLowerCase().includes(lowerCaseSearchTerm) ||
        detail.descripcionEspanol.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
  }

  openRequestModal(detail: BlDetailItemForRequest): void {
    this.selectedDetail = { ...detail, isSaving: false };
    this.requestModalVisible = true;
  }

  closeRequestModal(): void {
    this.requestModalVisible = false;
    this.selectedDetail = null;
  }

  private handleSaveSuccess(response: CreatePedidoResponse): void {
    alert('¡Pedido guardado exitosamente!');
    console.log('Pedido creado:', response);
    this.closeRequestModal();
    this.loadBlDetails(Number(this.blId));
  }

  private handleSaveError(error: any): void {
    let errorMessage = 'Error desconocido al guardar el pedido.';
    
    // Manejar diferentes tipos de errores
    if (error.error) {
      if (typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.error.message) {
        errorMessage = error.error.message;
      } else if (error.error.errors) {
        // Manejar errores de validación del modelo
        const validationErrors = Object.values(error.error.errors).flat();
        errorMessage = validationErrors.join(', ');
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    alert(`Error: ${errorMessage}`);
    console.error('Error saving request:', error);
  }

  saveRequest(): void {
    console.log(this.selectedDetail);
    
    if (!this.blId || !this.selectedDetail) {
      alert('Error: Datos del BL o del detalle no disponibles.');
      return;
    }

    if (!this.idusuario) {
      alert('Error: ID de usuario no disponible. Por favor, recargue la página o inicie sesión.');
      return;
    }

    if (this.selectedDetail.cantidadAPartar <= 0) {
      alert('Por favor, ingresa una cantidad a pedir válida (mayor que 0).');
      return;
    }

    // Validar que tenemos el ID del InvoiceBL
    if (!this.selectedDetail.idibl) {
      alert('Error: No se pudo obtener el ID del Invoice BL. Verifique los datos.');
      return;
    }

    this.selectedDetail.isSaving = true;

    // Crear el objeto con la estructura correcta para PedidosBlModel
    const pedidoData: PedidosBlModel = {
      idBl: this.blId,
      idInvoiceBl: this.selectedDetail.idibl, // ID del InvoiceBL
      idDetalle: this.selectedDetail.id, // ID del detalle
      cantidad: this.selectedDetail.cantidadAPartar, // Cantidad pedida
      observacion: this.selectedDetail.comentarios || '', // Comentario opcional
      idUsuario: this.idusuario // ID del usuario que hace el pedido
    };

    console.log('Enviando pedido:', pedidoData);

    // Usar la función correcta para crear pedidos
    this.blService.createPedido(pedidoData)
      .pipe(
        finalize(() => this.selectedDetail.isSaving = false),
        catchError(error => {
          this.handleSaveError(error);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.handleSaveSuccess(response);
        }
      });
  }
}