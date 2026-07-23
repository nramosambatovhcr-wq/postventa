import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Usuario } from '../models/usuario';
import { AuthService } from '../services/auth.service';
import { ReloadService } from '../services/reload.service';
import { TutorialService } from '../services/tutorial.service';

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
  selector: 'app-liquidado',
  templateUrl: './liquidado.component.html',
  styleUrls: ['./liquidado.component.css']
})
export class LiquidadoComponent {
mportData: ImportData[] = [
      ];

  stats = {
    totalImportaciones: 67,
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
  importData: any;

  constructor(private router : Router, private tutorialService: TutorialService, 
    private reloadService: ReloadService, 
    private authService: AuthService) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      
    /*  if (!usuario) {
        this.router.navigate(['/login']);
      }*/
    });

 
    this.loadimportaciones();
    this.calculateStats();
  
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
        this.tutorialService.liquidado().subscribe({
          next: (data:any) => {
            this.allData = data;
            this.totalItems = data.length;
            this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
            this.updatePageData();
            console.log('Todos los datos:', this.allData);
          },
          error: (e) => console.error(e)
        });
      }
      
      updatePageData() {
        console.log(this.allData);
        
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
    this.stats = {
      totalImportaciones: this.lista.length,
      enTransito: this.lista.filter((item:any) => item.estado === 'EN TRÁNSITO').length,
      pendientesLiquidacion: this.importData.filter((item:any) => item.liquidacion === 'PENDIENTE').length,
      tiempoPromedio: 60
    };
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
  exportData(): void {
    // Implementar lógica para exportar datos
    console.log('Exportar datos');
  }

  filterData(): void {
    // Implementar lógica para filtrar datos
    console.log('Filtrar datos');
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

}