import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TutorialService } from '../../services/tutorial.service';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/usuario';
import { ReloadService } from '../../services/reload.service';
import { Subscription } from 'rxjs';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { ProveedorService } from 'src/app/services/proveedor.service';

interface ImportData {
  proforma: number;
  invoiceNo: string;
  invoiceConBL: string;
  bl: string;
  contenedor?: string;
  liquidacion: string;
  fechaEmbarque?: string;
  fechaSalidaPuerto?: string;
  fechaLlegada?: string;
  fechaSalidaAduana?: string;
  fechaArriboBodega?: string;
  fechaLiquidacion?: string;
  estado: 'PENDIENTE' | 'EN TRÁNSITO' | 'COMPLETADO';
}

interface Usuario1 {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}



@Component({
  selector: 'app-listaproveedor',
  templateUrl: './listaproveedor.component.html',
  styleUrls: ['./listaproveedor.component.css']
})
export class ListaproveedorComponent implements OnInit, OnDestroy  {
  importData: ImportData[] = [
      ];

  stats = {
    totalImportaciones: 7,
    enTransito: 24,
    pendientesLiquidacion: 18,
    tiempoPromedio: 28
  };

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  lista:any;
  usuario: Usuario | null = null;
  loading = false;
  private subscription = new Subscription();

  constructor(private router : Router, private tutorialService: ProveedorService, 
    private reloadService: ReloadService, 
    private authService: AuthService) { }

  ngOnInit(): void {
 
    this.loadimportaciones();
    
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      
    /*  if (!usuario) {
        this.router.navigate(['/login']);
      }*/
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadimportaciones();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
/*
  loadimportaciones() {
      this.tutorialService.importaciones().subscribe({
        next: (data) => {
          this.lista = data;
          console.log(data);
        },
        error: (e) => console.error(e)
      });
  
    }*/


      allData: any[] = []; // Todos los datos sin paginar
      //lista: any[] = []; 
      //   // Los datos paginados actuales
      totalItems:any;
      
      loadimportaciones() {
        this.tutorialService.getProveedor().subscribe({
          next: (data:any) => {
            console.log(data.length);
            
            this.allData = data;
            this.totalItems = data.length;
            console.log(this.totalItems);
            
            this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
            this.calculateStats();
            this.updatePageData();
            console.log('Todos los datos:', this.allData);
          },
          error: (e) => console.error(e)
        });
        console.log(this.allData);
       
        
      }
      
      updatePageData() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        this.lista = this.allData.slice(startIndex, endIndex);
      }
      
      changePage(page: number) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.updatePageData();
      }



  calculateStats(): void {
    // En una aplicación real, esto vendría de un servicio
    console.log(this.totalItems);
    
    this.stats = {
      totalImportaciones: Number(this.totalItems),
      enTransito: this.allData.filter(item => item.estado === 'TRANSITO').length,
      pendientesLiquidacion: this.allData.filter(item => item.liquidacion === 'PENDIENTE').length,
      tiempoPromedio: 28
    };
    console.log(this.stats);
    
  }

  searchImports(): void {
    // Implementar lógica de búsqueda
    console.log('Buscando:', this.searchTerm);
  }

  createNewImport(): void {
    // Implementar lógica para crear nueva importación
    console.log('Crear nueva importación');
  }

  viewDetails(proforma: number): void {
    // Navegar a la vista detallada
    this.router.navigate(['/details', proforma]);
    console.log('Ver detalles de:', proforma);
  }
  ver(view: number): void {
    // Navegar a la vista detallada
    this.router.navigate(['/detalle', view]);
    console.log('Ver detalles de:', view);
  }

/*  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
    console.log(this.currentPage);
    
  }
*/
/*
  exportData(): void {
    // Implementar lógica para exportar datos
    console.log('Exportar datos');
  }*/

  filterData(): void {
    // Implementar lógica para filtrar datos
    console.log('Filtrar datos');
  }


 
 
  showExportMenu: boolean = false;

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  getPaginationArray(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    
    if (totalPages <= 5) {
      // Mostrar todas las páginas si son 5 o menos
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // Lógica para mostrar páginas con elipsis
      const pages: number[] = [];
      
      // Siempre mostrar la primera página
      pages.push(1);
      
      // Añadir elipsis si el inicio está lejos
      if (currentPage > 3) {
        pages.push(-1); // -1 representa elipsis
      }
      
      // Añadir páginas alrededor de la actual
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      
      // Añadir elipsis si el final está lejos
      if (currentPage < totalPages - 2) {
        pages.push(-1); // -1 representa elipsis
      }
      
      // Siempre mostrar la última página
      if (totalPages > 1) {
        pages.push(totalPages);
      }
      
      return pages;
    }
  }


downloadExcel(): void {
  // Create worksheet from data
  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.allData);
  
  // Create workbook and add the worksheet
  const workbook: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveedores');
  
  // Generate Excel file buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Create a Blob from the buffer
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Save the file
  saveAs(blob, `Proveedores${new Date().toISOString().split('T')[0]}.xlsx`);
}

downloadCSV(): void {
  // Convert data to CSV format
  let csvContent = 'Id,Nombre,Email,Direccion,Codigo\n';
  
  this.allData.forEach(item => {
    const row = [
      item.id,
      item.nombre,
      item.email,
      item.direccion || '-',
      item.codigo || '-',
       
    ].join(',');
    csvContent += row + '\n';
  });
  
  // Create a Blob from the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  
  // Save the file
  saveAs(blob, `Proveedorfes${new Date().toISOString().split('T')[0]}.csv`);
}

// Replace your existing exportData method with this one
exportData(): void {
  // Create a dropdown menu for export options
  const exportFormat = window.prompt('Seleccione formato de exportación:\n1. Excel\n2. CSV');
  
  switch(exportFormat) {
    case '1':
      this.downloadExcel();
      break;
    case '2':
      this.downloadCSV();
      break;
    default:
      console.log('Exportación cancelada');
  }
}

}