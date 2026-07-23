import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
import { InvioceblService } from 'src/app/services/inviocebl.service';
import { ReloadService } from 'src/app/services/reload.service';
import { Subscription } from 'rxjs';
import { BlService } from 'src/app/services/bl.service';
import * as XLSX from 'xlsx'; // Importa la librería XLSX
import { saveAs } from 'file-saver'; // Importa la librería file-saver

// Interfaz para los ítems de detalle dentro de un InvoiceBL
interface DetalleInvoiceblItem {
  id: number;
  invoiceblId: number;
  producto_Id?: number;
  codigo: string;
  descripcion: string;
  descripcionEspanol?: string;
  cantidad: number;
  precio_Unitario: number;
  subtotal: number;
  impuesto: number;
  total: number;
  invoiceN?: string;
  invoiceBl?: string;
}

// Interfaz para la respuesta detallada de un InvoiceBL
interface InvoiceBlDetailResponse {
  id: number;
  invoiceNumber: string;
  blNumber: string;
  description?: string;
  creationDate: string;
  status: string;
  detalleInvoiceblItems?: DetalleInvoiceblItem[];
}

@Component({
  selector: 'app-blprodetail',
  templateUrl: './blprodetail.component.html',
  styleUrls: ['./blprodetail.component.css']
})
export class BlprodetailComponent   implements OnInit, OnDestroy {

  usuario: Usuario | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';
  lista:any;

  idInvoiceBl: number = 0;
  invoiceBlDetail: any | null = null;
  id:any;
  bl:any;
  estadobl:any;

  // activeAccordion: number | null = null; // No es necesario si no hay un acordeón en la vista de detalle principal

  private subscription = new Subscription();

  constructor(
    private blService: BlService,
    private router: Router,
    private authService: AuthService,
    private reloadService: ReloadService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
    });

    this.subscription.add(
      this.route.params.subscribe(params => {
        const id = params['id'];
        if (id) {
          this.idInvoiceBl = +id;
          console.log('ID de InvoiceBL recibido:', this.idInvoiceBl);
          this.loadInvoiceBlDetails(this.idInvoiceBl);
          this.loadBl(this.idInvoiceBl);
        } else {
          this.errorMessage = 'No se proporcionó un ID de InvoiceBL.';
        }
      })
    );

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        if (this.idInvoiceBl) {
          this.loadInvoiceBlDetails(this.idInvoiceBl);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadInvoiceBlDetails(id: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.subscription.add(
      this.blService.getAllDetails(id).subscribe({
        next: (data: InvoiceBlDetailResponse) => {
          this.invoiceBlDetail = data;
          this.loading = false;
          console.log('Detalles de InvoiceBL cargados:', this.invoiceBlDetail);
        },
        error: (error) => {
          console.error('Error al cargar los detalles de InvoiceBL:', error);
          this.errorMessage = 'Error al cargar los detalles de InvoiceBL. ' + (error.error?.message || error.message);
          this.loading = false;
          this.invoiceBlDetail = null;
        }
      })
    );
  }

  loadBl(id: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.subscription.add(
      this.blService.getBl(id).subscribe({
        next: (data: any) => {
          this.lista = data;
          this.loading = false;
          this.id = this.lista.id;
          this.bl = this.lista.nombre;
          this.estadobl = this.lista.estado;
          console.log('Datos bl:', this.lista);
        },
        error: (error) => {
          console.error('Error al cargar los detalles de bl:', error);
          this.errorMessage = 'Error al cargar los detalles de bl. ' + (error.error?.message || error.message);
          this.loading = false;
          this.lista = null;
        }
      })
    );
  }

  // Se elimina toggleAccordion ya que no hay un acordeón en la vista de detalle de BL.

  goBack(): void {
    this.router.navigate(['/blpro']);
  }

  editDetalle(detalleId: number): void {
    console.log('Editar detalle:', detalleId);
    // Implementa la navegación a un formulario de edición o un modal
    // Ejemplo: this.router.navigate(['/edit-detalle-bl', detalleId]);
  }

  deleteDetalle(detalleId: number): void {
    if (confirm('¿Está seguro de eliminar este detalle? Esta acción es irreversible.')) {
      this.loading = true;
      this.blService.deleteDetalleInvoiceBl(detalleId).subscribe({
        next: () => {
          this.successMessage = 'Detalle eliminado correctamente.';
          this.reloadService.triggerReload();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al eliminar detalle:', error);
          this.errorMessage = 'Error al eliminar el detalle. ' + (error.error?.message || error.message);
          this.loading = false;
        }
      });
    }
  }

  addDetalle(): void {
    console.log('Agregar nuevo detalle a InvoiceBL:', this.idInvoiceBl);
    // Navegar al componente de subida de Excel, pasando el ID del InvoiceBL actual
    // Asegúrate de que la ruta 'dashboardblexcel' (o como la hayas nombrado) acepta un ID.
    this.router.navigate(['/dashboardblexcel', this.idInvoiceBl]);
  }

   exportToExcel(): void {
    if (!this.invoiceBlDetail || !this.invoiceBlDetail) {
      alert('No hay datos para exportar.');
      return;
    }

    const dataToExport = this.invoiceBlDetail.map((item:any) => ({
      'Código': item.codigo,
      'Chino': item.chino,
      'Descripción': item.descripcionEspanol,
      'Cantidad': item.cantidad,
      'Precio Unitario': item.precioUnitario,            
      'Total': item.total,
      'Invoice': item.invoiceN,
      'Invoice Bl': item.invoiceBl,
      'Bl': item.blNombre,
      // Puedes agregar más campos si lo deseas
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook: XLSX.WorkBook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    
    // Genera un nombre de archivo dinámico
    const filename = `Detalle_InvoiceBL_${this.invoiceBlDetail.invoiceNumber}.xlsx`;
    saveAs(data, filename);
  }
}