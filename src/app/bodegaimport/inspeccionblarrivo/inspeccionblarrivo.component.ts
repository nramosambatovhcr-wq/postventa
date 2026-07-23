import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TransferenciaArmadoService } from 'src/app/services/transferencia-armado.service';

@Component({  
  selector: 'app-inspeccionblarrivo',
  templateUrl: './inspeccionblarrivo.component.html',
  styleUrls: ['./inspeccionblarrivo.component.css']
})
export class InspeccionblarrivoComponent implements OnInit {

  baseUrl = 'https://bodega.vehicentro.com:1830/api/api/transferencias'; // tu API base

// Devuelve la URL segura al endpoint que acabas de crear
imagenSrc(fileName: string): string {
  return `${this.baseUrl}/uploads/${fileName}`;
}

  // Arrays completos que llegan del endpoint
  recepciones: any[] = [];
  fotos: any[] = [];
  sellos: any[] = [];
  inspeccionContenedor: any[] = [];

  // Elemento seleccionado + filtros
  recepcionSel?: any;
  fotosSel: any[] = [];
  sellosSel: any[] = [];
  inspeccionSel: any[] = [];

  // Visibilidad modal
  verModalOpen = false;
  editarModalOpen = false;
  editForm: any = {};

  constructor(private service: TransferenciaArmadoService, private router: Router) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.service.getTodoRecepciones().subscribe((res: any) => {
      this.recepciones = res.recepciones.sort(
        (a: any, b: any) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
      );
      this.fotos = res.fotos;
      this.sellos = res.sellos;
      this.inspeccionContenedor = res.inspeccionContenedor;
    });
  }

  abrirVer(r: any): void {
    this.recepcionSel = r;

    // Filtrar hijos
    this.fotosSel = this.fotos.filter(f => f.recepcion_id === r.id);
    this.sellosSel = this.sellos.filter(s => s.recepcion_id === r.id);
    this.inspeccionSel = this.inspeccionContenedor.filter(i => i.recepcion_id === r.id);

    this.verModalOpen = true;
  }

  cerrarVer(): void {
    this.verModalOpen = false;
    this.recepcionSel = undefined;
    this.fotosSel = [];
    this.sellosSel = [];
    this.inspeccionSel = [];
  }

  abrirEditar(r: any): void {
    this.recepcionSel = r;
    this.editForm = {
      codigo: r.codigo,
      empresaTransporte: r.empresa_transporte,
      conductorNombre: r.conductor_nombre,
      placaUnidad: r.placa_unidad,
      fechaArribo: r.fecha_arribo,
      horaIngreso: r.hora_ingreso
    };
    this.editarModalOpen = true;
  }

  cerrarEditar(): void {
    this.editarModalOpen = false;
  }

  guardarEdicion(): void {
    if (!this.recepcionSel) return;
    const dto = { ...this.recepcionSel, ...this.editForm };
    this.service.actualizarRecepcion(this.recepcionSel.id, dto).subscribe(() => {
      this.cerrarEditar();
      this.cargarTodo();
    });
  }

  confirmarEliminar(r: any): void {
    if (confirm(`¿Eliminar recepción ${r.codigo}?`)) {
      this.service.eliminarRecepcion(r.id).subscribe(() => this.cargarTodo());
    }
  }
}