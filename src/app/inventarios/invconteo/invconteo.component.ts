import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InventarioService } from '../../services/inventario.service';
import { catchError } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';

@Component({
  selector: 'app-invconteo',
  templateUrl: './invconteo.component.html',
  styleUrls: ['./invconteo.component.css']
})
export class InvconteoComponent implements OnInit {

  // Variables para la paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  pagedData: any[] = [];
  
  // Variables para los datos
  agencias: any[] = [];
  filteredData: any[] = [];
  
  // Variables para el filtro y búsqueda
  searchTerm: string = '';
  id: number = 0;
  usuario: Usuario | null = null;
  agen:string='';
  rol:any;

  constructor(
      private authService: AuthService,
    private inventarioService: InventarioService,
    private router: Router // Inyecta el Router aquí
  ) { }

  ngOnInit(): void {
       this.authService.usuarioActual$.subscribe(usuario => {
         this.usuario = usuario;
      console.log(this.usuario);
      if(this.usuario != null){
        this.id =this.usuario.id;
        this.agen = this.usuario.agencia;
         this.rol= this.usuario.rol;
        console.log(this.id);
        if(this.id){
          this.getAgencias();
        }
        else{
        this.router.navigate(['/login']);
        }
       
      }
    });

    
  }

  getAgencias(): void {
    this.inventarioService.getAgencias()
      .pipe(
        catchError(error => {
          console.error('Error al obtener agencias:', error);
          return [];
        })
      )
      .subscribe(data => {
        this.agencias = data;

      /*  this.agencias = data.filter((agencia: any) => {
          const match = 
            agencia.nombre === this.agen?.toUpperCase();
          
          if (match) {
            console.log('Agencia encontrada:', agencia);
          }
          return match;
        });*/
        this.applyFilter();
      });
  }

  // Aplica el filtro de búsqueda
  applyFilter(): void {
    if (this.searchTerm.trim() === '') {
      this.filteredData = this.agencias;
    } else {
      const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
      this.filteredData = this.agencias.filter(agencia =>
        (agencia.nombre && agencia.nombre.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (agencia.codigoAgencia && agencia.codigoAgencia.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (agencia.ciudad && agencia.ciudad.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (agencia.provincia && agencia.provincia.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }
    this.updatePaginationInfo();
  }

  // Actualiza la información de la paginación y la lista mostrada
  updatePaginationInfo(): void {
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.pagedData = this.filteredData.slice(start, end);
  }

  // Cambia la página actual
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginationInfo();
    }
  }

  // Genera un array para los botones de paginación
  getPaginationArray(): number[] {
    const pages = [];
    if (this.totalPages <= 5) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage > 3) {
        pages.push(1);
        pages.push(-1); // Representa los "..."
      }
      for (let i = Math.max(2, this.currentPage - 1); i <= Math.min(this.totalPages - 1, this.currentPage + 1); i++) {
        pages.push(i);
      }
      if (this.currentPage < this.totalPages - 2) {
        pages.push(-1); // Representa los "..."
        pages.push(this.totalPages);
      }
    }
    return pages;
  }
  
  // Función para navegar a la nueva pantalla y pasar el código de la agencia
  goToInvbodage(codigo: string): void {
    if(this.rol=='inventario'){
     this.router.navigate(['/accesoinv', codigo]);
    }
    else{
      this.router.navigate(['/invbodage', codigo]);
    }
    
  }
}