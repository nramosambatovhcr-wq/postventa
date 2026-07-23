// revision.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BlLiquidadoConEstadisticas, BlService } from 'src/app/services/bl.service';
import { BuscarcodComponent } from '../buscarcod/buscarcod.component';
import * as XLSX from 'xlsx';
  // Adjust the path as needed

@Component({
  selector: 'app-revision',
  templateUrl: './revision.component.html',
  styleUrls: ['./revision.component.css']
})
export class RevisionComponent implements OnInit {

  blsLiquidados: BlLiquidadoConEstadisticas[] = [];
  filteredBlsLiquidados: BlLiquidadoConEstadisticas[] = []; // Nueva propiedad para la lista filtrada
  errorMessage: string = '';
  searchTerm: string = ''; // Nueva propiedad para el término de búsqueda
  showSearchModal: boolean = false; 

  constructor(private blService: BlService,   private router: Router,) { }

  ngOnInit(): void {
    this.getBlsLiquidados();
  }

  getBlsLiquidados(): void {
    this.blService.getBlLiquidados().subscribe({
      next: (data) => {
        this.blsLiquidados = data;
        this.filteredBlsLiquidados = [...this.blsLiquidados]; // Inicializa la lista filtrada con todos los datos
      },
      error: (error) => {
        console.error('Error fetching reviewed BLs:', error);
        this.errorMessage = 'Failed to load reviewed BLs. Please try again later.';
      }
    });
  }

   bl(): void {
    this.router.navigate(['/dashboardblbod']);
  }

  revision(): void {
    this.router.navigate(['/blrevision']);
  }

  asignar(): void {
    this.router.navigate(['/asignar']);
  }

  usuarios(): void {
    this.router.navigate(['/usuariosbi']);
  }

  reportes(): void {
    this.router.navigate(['/reportes']);
  }
    revisionbl(id:any): void {
     this.router.navigate(['/dashboardblrevision', id]);
  }

  openSearchModal(): void {
    this.showSearchModal = true;
    document.body.classList.add('modal-open');
  }

  closeSearchModal(): void {
    this.showSearchModal = false;
    document.body.classList.remove('modal-open');
  }

  // Nuevo método para filtrar los BLs
  filterBls(): void {
    if (!this.searchTerm) {
      this.filteredBlsLiquidados = [...this.blsLiquidados];
    } else {
      this.filteredBlsLiquidados = this.blsLiquidados.filter(bl =>
        bl.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  // ─── Descarga Excel de la tabla de BLs ─────────────────────────────────────
  downloadData(): void {
    const data = this.filteredBlsLiquidados;
    if (!data?.length) return;

    const rows = data.map((bl: any) => ({
      'BL':                       bl.nombre                   || 'N/A',
      'Proveedor':                bl.proveedor                || 'N/A',
      'Estado':                   bl.estado                   || 'N/A',
      'Total Liquidaciones':      bl.total_liquidaciones      ?? 0,
      'Cantidad Total Liquidada': bl.cantidad_total_liquidada ?? 0
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows, {
      header: ['BL', 'Proveedor', 'Estado', 'Total Liquidaciones', 'Cantidad Total Liquidada']
    });
    ws['!cols'] = [
      { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 24 }
    ];

    const wb: XLSX.WorkBook = { Sheets: { 'BLs Revisados': ws }, SheetNames: ['BLs Revisados'] };

    // Sufijo con la búsqueda activa para identificar el informe
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const sfx = this.searchTerm.trim()
      ? `_busqueda-${this.searchTerm.trim().replace(/[^a-zA-Z0-9]/g, '_')}`
      : '';

    XLSX.writeFile(wb, `bls_revisados${sfx}_${ts}.xlsx`);
  }
}