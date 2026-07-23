import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RecepcionContenedorModel, TransferenciaArmadoService } from 'src/app/services/transferencia-armado.service';


@Component({
  selector: 'app-inspeccionarrivos',
  templateUrl: './inspeccionarrivos.component.html',
  styleUrls: ['./inspeccionarrivos.component.css']
})
export class InspeccionarrivosComponent {
  recepcion: RecepcionContenedorModel = {
    fechaArribo: new Date().toISOString().split('T')[0],
    respaldoFotografico: true
  } as any;

  recepcionId: number | null = null;

  elementosContenedor = [
    { key: 'baseRemolque', elemento: 'Base del Remolque', estado: '', observacion: '' },
    { key: 'puertas', elemento: 'Puertas exteriores e interiores', estado: '', observacion: '' },
    { key: 'paredDer', elemento: 'Pared lateral derecha', estado: '', observacion: '' },
    { key: 'techo', elemento: 'Techo interno y externo', estado: '', observacion: '' },
    { key: 'paredFrontal', elemento: 'Pared frontal', estado: '', observacion: '' },
    { key: 'paredIzq', elemento: 'Pared lateral izquierda', estado: '', observacion: '' },
    { key: 'piso', elemento: 'Piso Interno', estado: '', observacion: '' }
  ];

  sello = { numero: '' };
  accionesSello = [
    { key: 'mecanismos', texto: 'Ver mecanismos de cerraduras', estado: '' },
    { key: 'tirar', texto: 'Tirar del sello para verificar', estado: '' },
    { key: 'torcer', texto: 'Torcer y girar el sello', estado: '' }
  ];

  tiposFoto = [
    'Frontal (placa)',
    'Posterior (#contenedor)',
    'Seguro (#candado)',
    'Lateral LH',
    'Lateral RH',
    'Inicio descargue',
    'Fin descargue',
    'Compañía transporte (logo)',
    'Licencia/identificación conductor/acompañante'
  ];

  fotos: { [tipo: string]: { file: File; url: string } } = {};

  constructor(private bodegaService: TransferenciaArmadoService) {}

  async guardarRecepcion() {
    this.bodegaService.crearRecepcion(this.recepcion).subscribe(res => {
      this.recepcionId = res.id;
      alert(res.message);
    });
  }

  guardarInspeccionContenedor() {
  if (!this.recepcionId) return;
  const payload = this.elementosContenedor.map(x => ({
    elemento: x.elemento,
    estado: x.estado,
    observacion: x.observacion
  }));
  this.bodegaService.guardarInspeccionContenedor(this.recepcionId, payload)
    .subscribe(r => alert(r.message));
}

guardarSello() {
  if (!this.recepcionId) return;
  const dto = {
    numero: this.sello.numero,
    mecanismos: this.accionesSello.find(a => a.key === 'mecanismos')?.estado || '',
    tirar: this.accionesSello.find(a => a.key === 'tirar')?.estado || '',
    torcer: this.accionesSello.find(a => a.key === 'torcer')?.estado || ''
  };
  this.bodegaService.guardarInspeccionSellos(this.recepcionId, dto)
    .subscribe(r => alert(r.message));
}

guardarResponsables() {
  if (!this.recepcionId) return;
  const dto = {
    entregueConforme: this.recepcion.entregueConforme,
    recibiConforme: this.recepcion.recibiConforme
  };
  this.bodegaService.guardarResponsables(this.recepcionId, dto)
    .subscribe(r => alert(r.message));
}

  onFileChange(evt: any, tipo: string) {
    const file = evt.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => this.fotos[tipo] = { file, url: e.target?.result as string };
      reader.readAsDataURL(file);
    }
  }

  subirFotos() {
    if (!this.recepcionId) return;
    Object.keys(this.fotos).forEach(tipo => {
      const { file } = this.fotos[tipo];
      this.bodegaService.subirFotoRecepcion(this.recepcionId!, tipo, file, 'usuario1')
        .subscribe(r => console.log('Foto subida', r));
    });
    alert('Fotos subidas');
  }
}