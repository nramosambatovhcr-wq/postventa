import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../models/usuario';
import { AuthService } from '../services/auth.service';
import { ReloadService } from '../services/reload.service';
import { TutorialService } from '../services/tutorial.service';
import * as XLSX from 'xlsx';
import { FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-detalleorden',
  templateUrl: './detalleorden.component.html',
  styleUrls: ['./detalleorden.component.css']
})
export class DetalleordenComponent implements OnInit {

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  lista:any;
  usuario: Usuario | null = null;
  loading = false;
  proformaId:number=0;

  private subscription = new Subscription();

  constructor(private router : Router, private tutorialService: TutorialService, 
    private reloadService: ReloadService, 
    private fb: FormBuilder,
        private route: ActivatedRoute,
        private authService: AuthService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('ordenId');
      if (id) {
        this.proformaId = +id;
        console.log(this.proformaId);
        this.loadImportDetails(this.proformaId);
      }
    });
   
    
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      
    /*  if (!usuario) {
        this.router.navigate(['/login']);
      }*/
    });

    this.subscription.add(
      this.reloadService.reload$.subscribe(() => {
        this.loadImportDetails(this.proformaId);
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
      
      loadImportDetails(num:number) {
        this.tutorialService.detallesimpor(num).subscribe({
          next: (data:any) => {
            console.log(data.length);
            
            this.allData = data;
            this.totalItems = data.length;
            console.log(this.totalItems);
            
            this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          
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
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Importaciones');
  
  // Generate Excel file buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Create a Blob from the buffer
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Save the file
  saveAs(blob, `Importaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
}

downloadCSV(): void {
  // Convert data to CSV format
  let csvContent = 'Proforma,Invoice No,Invoice BL,BL,Contenedor,Fecha Embarque,Fecha Llegada,Estado\n';
  
  this.allData.forEach(item => {
    const row = [
      item.codigocot,
      item.invoicen,
      item.invoicebl,
      item.bl || '-',
      item.contenedor || '-',
      item.embarque ? new Date(item.embarque).toLocaleDateString() : '-',
      item.arrivo ? new Date(item.arrivo).toLocaleDateString() : '-',
      item.estado
    ].join(',');
    csvContent += row + '\n';
  });
  
  // Create a Blob from the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  
  // Save the file
  saveAs(blob, `Importaciones_${new Date().toISOString().split('T')[0]}.csv`);
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
