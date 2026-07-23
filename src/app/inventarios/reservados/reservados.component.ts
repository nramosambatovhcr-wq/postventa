// Define interfaces mínimas necesarias
// Nota: La interfaz RepuestoReservadoDto debe ser importada desde 'inventario.service'
// Se define aquí para claridad, asumiendo la estructura:
export interface RepuestoReservadoDto {
  articulo: string; // Código del repuesto
  nombre: string; // Descripción del repuesto
  stock_reservado: number; // Cantidad reservada (clave)
  stock_disponible: number; // Stock actual disponible
  costo_promedio: number;
}

interface Agencia {
  idSerial: number;
  codigoAgencia: string;
  nombre: string;
  // otras propiedades
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
// Asumiendo que InventarioService está en esta ruta relativa
import { InventarioService } from '../../services/inventario.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario';

@Component({
  selector: 'app-reservados',
  templateUrl: './reservados.component.html',
  styleUrls: ['./reservados.component.css']
})
export class ReservadosComponent implements OnInit {

  blId: string | null = null;
  id: number = 0;
  usuario: Usuario | null = null;
  
  agencias: Agencia[] = [];
  nombreAgencia: string = 'Cargando...';
  codAgencia: string = '';

  // Data para Repuestos Reservados
  public inventarioReservado: RepuestoReservadoDto[] = [];
  public filteredReservados: RepuestoReservadoDto[] = [];

  // Estado de la UI
  searchTerm: string = '';
  isLoading: boolean = true;
  errorMessage: string | null = null;
  public isLoadingInventario: boolean = false;
  public errorInventario: string = '';
  
  // Propiedades para los contadores
  totalreservado: any;
  costoTotalReservado: number = 0; // <-- NUEVA PROPIEDAD AÑADIDA

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private inventarioService: InventarioService
  ) { }

  ngOnInit(): void {
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      if (this.usuario != null) {
        this.id = this.usuario.id;
        if (this.id) {
          this.route.paramMap.subscribe(params => {
            this.blId = params.get('id');
            if (this.blId) {
              this.getAgencias(); // Carga la agencia y luego los reservados
            } else {
              this.isLoading = false;
              this.errorMessage = 'No se proporcionó un ID de Agencia.';
            }
          });
        } else {
          this.router.navigate(['/login']);
        }
      }
    });
  }

// Método para verificar si el usuario tiene el rol necesario
private readonly ROL_REQUERIDO_CLICK: string = 'ROL_GERENTE_BODEGA';

canClickReservados(): boolean {
  // Revisa si el rol del usuario (cargado en 'this.usuario') coincide con el requerido
  return this.usuario?.rol === this.ROL_REQUERIDO_CLICK; 
}

// Método que navega al componente de 'reservados'
goToReservadosDetail(): void {
    const agenciaId = this.blId; 
    this.router.navigate(['reservados', agenciaId]); 
}

  // Carga la lista de agencias para obtener el nombre y código de la agencia actual.
  getAgencias(): void {
    this.inventarioService.getAgencias()
      .pipe(
        catchError(error => {
          console.error('Error al obtener agencias:', error);
          this.errorMessage = 'Error al cargar información de la agencia.';
          this.isLoading = false;
          return of([]);
        })
      )
      .subscribe((data: any) => {
        const arrayAgencias: Agencia[] = Object.values(data);
        this.agencias = arrayAgencias;
        
        const blIdNumber = typeof this.blId === 'string' ? parseInt(this.blId, 10) : this.blId;
        const agenciaEncontrada = arrayAgencias.find((agencia: Agencia) => 
          agencia.idSerial === blIdNumber
        );
        
        if (agenciaEncontrada) {
          this.nombreAgencia = agenciaEncontrada.nombre;
          // Asume que el código real es el substring, como en invbodage.component.ts
          this.codAgencia = agenciaEncontrada.codigoAgencia.substring(1); 
          this.cargarInventarioReservado(this.codAgencia);
        } else {
          this.nombreAgencia = 'Agencia no encontrada';
          this.isLoading = false;
        }
      });
  }

  // Llama al servicio para obtener la lista de repuestos reservados.
  cargarInventarioReservado(oficinaId: string): void {
    this.isLoadingInventario = true;
    this.errorInventario = '';
    this.inventarioReservado = [];
    this.costoTotalReservado = 0; // <-- REINICIAR AL CARGAR

    this.inventarioService.getInventarioReservadoPorOficina(oficinaId)
        .subscribe({
            next: (response: RepuestoReservadoDto[]) => {
                this.inventarioReservado = response;
                this.totalreservado = response.length;
                this.filteredReservados = [...this.inventarioReservado]; // Inicializa la lista filtrada
                
                // CALCULO DEL COSTO TOTAL RESERVADO
                this.costoTotalReservado = response.reduce((total, item) => {
                    return total + (item.stock_reservado * item.costo_promedio);
                }, 0);

                this.isLoadingInventario = false;
                this.isLoading = false; // Finaliza el estado de carga principal
               
                console.log(`Inventario reservado cargado para ${oficinaId}. Total de artículos: ${response.length}`);
            },
            error: (err) => {
                console.error('Error al cargar el inventario reservado:', err);
                this.errorInventario = 'No se pudo cargar el inventario reservado.';
                this.isLoadingInventario = false;
                this.isLoading = false;
            }
        });
  }

  // Filtra la lista de reservados por código o descripción.
  applyFilter(): void {
    const term = this.searchTerm.toLowerCase();
    
    if (!term) {
      this.filteredReservados = [...this.inventarioReservado];
    } else {
      this.filteredReservados = this.inventarioReservado.filter(item =>
        item.articulo.toLowerCase().includes(term) ||
        item.nombre.toLowerCase().includes(term)
      );
    }
  }

  goBack(): void {
    this.router.navigate(['/invbodage', this.blId]);
  }

  conteos(): void {
    this.router.navigate(['/invbodage', this.blId]);
  }
}