import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { VehiceService } from 'src/app/services/vehice.service';


@Component({
  selector: 'app-asignacionvehi',
  templateUrl: './asignacionvehi.component.html',
  styleUrls: ['./asignacionvehi.component.css']
})
export class AsignacionvehiComponent implements OnInit {
  vehiculos: any[] = [];
  lineas: any[] = [];
  modelos: any[] = [];
  chasises: any[] = [];

  mostrarModalVehiculo = false;
  idlinea = '';
  idlineaNum = 0;
  idmodelo = '';
  idchasis = '';

  modeloFilter = '';
  modelosFiltrados: any[] = [];
  mostrarModeloDropdown = false;
  chasisFilter = '';
  chasisesFiltrados: any[] = [];
  mostrarChasisDropdown = false;

  usuariosDisponibles: any[] = [];
  usuariosSeleccionados: number[] = [];

  mostrarModalModelo = false;
  mostrarModalChasis = false;
  nuevoModeloCodigo = '';
  nuevoChasisCodigo = '';
  mostrarModalEditar = false;
  mostrarModalEliminar = false;
  vehiculoEnEdicion: any = {};
  vehiculoAEliminar: any = {};
  mostrarModalVer = false;
  vehiculoSeleccionado: any = {};

  // === Cambio de estado de revisión ===
  mostrarModalEstadoRevision = false;
  revisionVehiculo: any = null;       // vehículo cuya revisión se edita
  nuevoEstadoRevision = '';
  guardandoEstadoRevision = false;

  // Los value deben coincidir EXACTO con los estados válidos del backend / BD
  estadosRevision = [
    { value: 'pendiente',  label: 'Pendiente' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'finalizado', label: 'Finalizado' }
  ];
  
  // Para edición - ahora con listas separadas
  modelosEditar: any[] = [];
  chasisesEditar: any[] = [];
  modelosFiltradosEditar: any[] = [];
  chasisesFiltradosEditar: any[] = [];
  mostrarModeloDropdownEditar = false;
  mostrarChasisDropdownEditar = false;
  modeloFilterEditar = '';
  chasisFilterEditar = '';
  usuariosDisponiblesEditar: any[] = [];

  motores: any[] = [];
  cajas: any[] = [];
  drives: any[] = [];
  frontales: any[] = [];
  diferenciales: any[] = [];

  // ===== MODALES NUEVOS =====
  mostrarModalMotor = false;
  mostrarModalCaja = false;
  mostrarModalDrive = false;
  mostrarModalFrontal = false;
  mostrarModalDiferencial = false;

  nuevoMotorCodigo = '';
  nuevoCajaCodigo = '';
  nuevoDriveCodigo = '';
  nuevoFrontalCodigo = '';
  nuevoDiferencialCodigo = '';

    // === DROPDOWNS DE COMPONENTES EN EDICIÓN ===
  motoresFiltradosEditar: any[] = [];
  cajasFiltradosEditar: any[] = [];
  drivesFiltradosEditar: any[] = [];
  frontalesFiltradosEditar: any[] = [];
  diferencialesFiltradosEditar: any[] = [];

  mostrarMotorDropdownEditar = false;
  mostrarCajaDropdownEditar = false;
  mostrarDriveDropdownEditar = false;
  mostrarFrontalDropdownEditar = false;
  mostrarDiferencialDropdownEditar = false;

  motorFilterEditar = '';
  cajaFilterEditar = '';
  driveFilterEditar = '';
  frontalFilterEditar = '';
  diferencialFilterEditar = '';

  constructor(private vehiceService: VehiceService, private router: Router) {}

  ngOnInit(): void {
    this.cargarVehiculos();
    this.cargarLineas();
    this.cargarChasises();
    this.cargarMotores();
    this.cargarCajas();
    this.cargarDrives();
    this.cargarFrontales();
    this.cargarDiferenciales();
  }

  irAOtraPagina(vehiculo: any): void {
  this.router.navigate(['/laboratoriovehidetail', vehiculo]);
}

 reportesdd(): void {
  this.router.navigate(['/reportevehis']);
}

  abrirModalVer(vehiculo: any) {
    this.vehiculoSeleccionado = vehiculo;
    this.mostrarModalVer = true;
  }

  cerrarModalVer() {
    this.mostrarModalVer = false;
    this.vehiculoSeleccionado = {};
  }

  // ===== CAMBIO DE ESTADO DE REVISIÓN =====
  abrirModalEstadoRevision(vehiculo: any) {
    if (!vehiculo?.revision?.id) return;   // no hay revisión que editar
    this.revisionVehiculo = vehiculo;
    this.nuevoEstadoRevision = vehiculo.revision.estado || '';
    this.mostrarModalEstadoRevision = true;
  }

  cerrarModalEstadoRevision() {
    this.mostrarModalEstadoRevision = false;
    this.revisionVehiculo = null;
    this.nuevoEstadoRevision = '';
    this.guardandoEstadoRevision = false;
  }

  confirmarEstadoRevision() {
    if (!this.revisionVehiculo?.revision?.id) return;
    if (!this.nuevoEstadoRevision) { alert('Seleccione un estado'); return; }

    const revisionId = this.revisionVehiculo.revision.id;
    this.guardandoEstadoRevision = true;

    this.vehiceService.cambiarEstadoRevision(revisionId, this.nuevoEstadoRevision).subscribe({
      next: (res: any) => {
        if (res.success) {
          // Actualiza en memoria sin recargar toda la grilla
          this.revisionVehiculo.revision.estado   = res.revision.estadoRevision;
          this.revisionVehiculo.revision.fechaFin = res.revision.fechaFin;
          this.cerrarModalEstadoRevision();
        } else {
          this.guardandoEstadoRevision = false;
          alert('Error: ' + res.msg);
        }
      },
      error: (err) => {
        this.guardandoEstadoRevision = false;
        console.error(err);
        alert('Error de conexión');
      }
    });
  }

  // Color del badge según estado (mejora visual)
  badgeEstadoClase(estado: string): string {
    switch ((estado || '').toLowerCase()) {
      case 'completado':  return 'bg-success';
      case 'en proceso':  return 'bg-warning text-dark';
      case 'pendiente':   return 'bg-info';
      default:            return 'bg-secondary';
    }
  }

  mostrarModalVehiculovv() {
    this.cargarUsuariosDisponibles();
    this.mostrarModalVehiculo = true;
  }

  cargarUsuariosDisponibles() {
    this.vehiceService.getUsuariosParaAsignar().subscribe((res: any) => {
      this.usuariosDisponibles = res.map((u: any) => ({ ...u, selected: false }));
    });
  }

  cargarVehiculos() {
    this.vehiceService.getVehiculosCompletos().subscribe((res: any) => {
      const vehiculos = res.data ?? [];

      this.vehiculos = vehiculos.map((v: any) => {
        if (typeof v.asignaciones === 'string') {
          try {
            v.asignaciones = JSON.parse(v.asignaciones);
          } catch {
            v.asignaciones = [];
          }
        }

        if (typeof v.revision === 'string') {
          try {
            v.revision = JSON.parse(v.revision);
          } catch {
            v.revision = null;
          }
        }

        return v;
      });

      console.log('Vehículos procesados:', this.vehiculos);
    });
  }

  cargarLineas() {
    this.vehiceService.linea().subscribe((data: any) => this.lineas = data);
  }

  cargarChasises() {
    this.vehiceService.listchasis().subscribe((data: any) => this.chasises = data);
  }

  cargarMotores() {
    this.vehiceService.getMotores().subscribe((data: any) => {
      this.motores = data || [];
      console.log('Motores cargados:', this.motores);
    });
  }

  cargarCajas() {
    this.vehiceService.getCajas().subscribe((data: any) => {
      this.cajas = data || [];
      console.log('Cajas cargadas:', this.cajas);
    });
  }

  cargarDrives() {
    this.vehiceService.getDrives().subscribe((data: any) => {
      this.drives = data || [];
      console.log('Drives cargados:', this.drives);
    });
  }

  cargarFrontales() {
    this.vehiceService.getFrontales().subscribe((data: any) => {
      this.frontales = data || [];
      console.log('Frontales cargados:', this.frontales);
    });
  }

  cargarDiferenciales() {
    this.vehiceService.getDiferenciales().subscribe((data: any) => {
      this.diferenciales = data || [];
      console.log('Diferenciales cargados:', this.diferenciales);
    });
  }

  onLineaChange() {
    const linea = this.lineas.find(l => l.codigo === this.idlinea);
    this.idlineaNum = linea ? linea.id : 0;
    this.vehiceService.modelolinea(this.idlinea).subscribe((data: any) => {
      this.modelos = data.result ?? [];
      this.modelosFiltrados = [...this.modelos];
    });
  }

  toggleModeloDropdown() {
    this.mostrarModeloDropdown = !this.mostrarModeloDropdown;
    if (this.mostrarModeloDropdown) { 
      this.modeloFilter = ''; 
      this.filtrarModelos(); 
    }
  }

  filtrarModelos() {
    const f = this.modeloFilter.toLowerCase();
    this.modelosFiltrados = this.modelos.filter(m => m.codigo.toLowerCase().includes(f));
  }

  seleccionarModelo(m: any) { 
    this.idmodelo = m.id; 
    this.mostrarModeloDropdown = false; 
  }

  get modeloTexto() { 
    return this.modelos.find(m => m.id === this.idmodelo)?.codigo ?? 'Seleccione modelo'; 
  }

  toggleChasisDropdown() {
    this.mostrarChasisDropdown = !this.mostrarChasisDropdown;
    if (this.mostrarChasisDropdown) { 
      this.chasisFilter = ''; 
      this.filtrarChasis(); 
    }
  }

  filtrarChasis() {
    const f = this.chasisFilter.toLowerCase();
    this.chasisesFiltrados = this.chasises.filter(c => c.codigo.toLowerCase().includes(f));
  }

  seleccionarChasis(c: any) { 
    this.idchasis = c.id; 
    this.mostrarChasisDropdown = false; 
  }

  get chasisTexto() { 
    return this.chasises.find(c => c.id === this.idchasis)?.codigo ?? 'Seleccione chasis'; 
  }

  getUsuariosAsignados(asignaciones: any): string {
    if (!asignaciones) return '';
    if (typeof asignaciones === 'string') {
      try {
        asignaciones = JSON.parse(asignaciones);
      } catch {
        return '';
      }
    }
    if (!Array.isArray(asignaciones)) return '';

    return asignaciones.map((a: any) => a.nombre || a.usuarioId || '').join(', ');
  }

  guardarVehiculoModal() {
    if (!this.idlinea || !this.idmodelo || !this.idchasis) {
      alert('Complete línea, modelo y chasis');
      return;
    }

    const usuariosSeleccionados = this.usuariosDisponibles
      .filter(u => u.selected)
      .map(u => u.id);

    const body = {
      idlinea: this.idlinea,
      idmodelo: this.idmodelo,
      idchasis: this.idchasis,
      usuariosAsignar: usuariosSeleccionados
    };

    this.vehiceService.registerVehicleBasico(body).subscribe((res: any) => {
      if (res.success) {
        alert('Vehículo creado y usuarios asignados');
        this.cerrarModalVehiculo();
        this.cargarVehiculos();
      } else {
        alert('Error: ' + res.msg);
      }
    });
  }

  cerrarModalVehiculo() {
    this.mostrarModalVehiculo = false;
    this.idlinea = '';
    this.idlineaNum = 0;
    this.idmodelo = '';
    this.idchasis = '';
    this.modelos = [];
    this.modelosFiltrados = [];
    this.chasisesFiltrados = [];
    this.usuariosDisponibles = [];
    this.usuariosSeleccionados = [];
  }

  abrirModalModelo() {
    this.mostrarModalModelo = true;
    this.nuevoModeloCodigo = '';
  }

  abrirModalChasis() {
    this.mostrarModalChasis = true;
    this.nuevoChasisCodigo = '';
  }

  cerrarModalModelo() {
    this.mostrarModalModelo = false;
  }

  cerrarModalChasis() {
    this.mostrarModalChasis = false;
  }

  crearModelo() {
    if (!this.nuevoModeloCodigo || !this.idlineaNum) {
      alert('Debe ingresar código y tener una línea seleccionada');
      return;
    }
    this.vehiceService.crearModelo(this.nuevoModeloCodigo, this.idlineaNum.toString()).subscribe(
      (res: any) => {
        if (res.success) {
          alert('Modelo creado con éxito');
          this.cargarModelosPorLinea(this.idlinea);
          this.idmodelo = res.id[0].id.toString();
          this.cerrarModalModelo();
        } else {
          alert('Error: ' + res.msg);
        }
      },
      err => { console.error(err); alert('Error de conexión'); }
    );
  }

  crearChasis() {
    if (!this.nuevoChasisCodigo) {
      alert('Debe ingresar código de chasis');
      return;
    }
    this.vehiceService.crearChasis(this.nuevoChasisCodigo).subscribe(
      (res: any) => {
        if (res.success) {
          alert('Chasis creado con éxito');
          this.cargarChasises();
          this.idchasis = res.id[0].id.toString();
          this.cerrarModalChasis();
        } else {
          alert('Error: ' + res.msg);
        }
      },
      err => { console.error(err); alert('Error de conexión'); }
    );
  }

  cargarModelosPorLinea(idlinea: string) {
    this.vehiceService.modelolinea(idlinea).subscribe((data: any) => {
      this.modelos = data.result ?? [];
      this.modelosFiltrados = [...this.modelos];
    });
  }

  get lineaEditarTexto() {
    // Mostrar directamente el texto de la línea que viene del vehículo
    return this.vehiculoEnEdicion.linea || 'Sin línea';
  }

  abrirModalEditar(vehiculo: any) {
    // Clonar el vehículo para edición
    this.vehiculoEnEdicion = { ...vehiculo };
    
    console.log('Vehículo completo a editar:', this.vehiculoEnEdicion);

    // Buscar el ID de la línea basándose en el código/texto
    const lineaEncontrada = this.lineas.find(l => l.codigo === this.vehiculoEnEdicion.linea);
    if (lineaEncontrada) {
      this.vehiculoEnEdicion.idlinea = lineaEncontrada.codigo;
    }

    // Buscar IDs de los componentes del vehículo
    this.buscarIdsComponentes();

    // Cargar chasis para el dropdown de edición
    this.chasisesEditar = [...this.chasises];
    this.chasisesFiltradosEditar = [...this.chasises];
    
    // Buscar el ID del chasis actual
    const chasisEncontrado = this.chasisesEditar.find(c => c.codigo === this.vehiculoEnEdicion.chasis);
    if (chasisEncontrado) {
      this.vehiculoEnEdicion.idchasis = chasisEncontrado.id;
    }
    console.log('Chasis actual:', this.vehiculoEnEdicion.chasis, 'ID:', this.vehiculoEnEdicion.idchasis);

    // Cargar modelos de la línea actual y buscar el ID correspondiente
    if (this.vehiculoEnEdicion.idlinea) {
      this.vehiceService.modelolinea(this.vehiculoEnEdicion.idlinea).subscribe((data: any) => {
        this.modelosEditar = data.result ?? [];
        this.modelosFiltradosEditar = [...this.modelosEditar];
        
        // Buscar el ID del modelo actual
        const modeloEncontrado = this.modelosEditar.find(m => m.codigo === this.vehiculoEnEdicion.modelo);
        if (modeloEncontrado) {
          this.vehiculoEnEdicion.idmodelo = modeloEncontrado.id;
        }
        console.log('Modelo actual:', this.vehiculoEnEdicion.modelo, 'ID:', this.vehiculoEnEdicion.idmodelo);
      }, error => {
        console.error('Error cargando modelos:', error);
      });
    }

    // Cargar usuarios y marcar los que YA están asignados
    this.vehiceService.getUsuariosParaAsignar().subscribe((res: any) => {
      this.usuariosDisponiblesEditar = res.map((u: any) => ({
        ...u,
        selected: this.vehiculoEnEdicion.asignaciones?.some((a: any) => a.usuarioId === u.id) || false
      }));
    });

    this.mostrarModalEditar = true;
  }

  buscarIdsComponentes() {
    // Buscar ID del motor
    if (this.vehiculoEnEdicion.motor) {
      const motorEncontrado = this.motores.find((m: any) => m.codigo === this.vehiculoEnEdicion.motor);
      if (motorEncontrado) {
        this.vehiculoEnEdicion.idmotor = motorEncontrado.id;
      }
    }
    
    // Buscar ID de la caja
    if (this.vehiculoEnEdicion.caja) {
      const cajaEncontrada = this.cajas.find((c: any) => c.codigo === this.vehiculoEnEdicion.caja);
      if (cajaEncontrada) {
        this.vehiculoEnEdicion.idcaja = cajaEncontrada.id;
      }
    }
    
    // Buscar ID del drive
    if (this.vehiculoEnEdicion.drive) {
      const driveEncontrado = this.drives.find((d: any) => d.codigo === this.vehiculoEnEdicion.drive);
      if (driveEncontrado) {
        this.vehiculoEnEdicion.iddrive = driveEncontrado.id;
      }
    }
    
    // Buscar ID del frontal
    if (this.vehiculoEnEdicion.frontal) {
      const frontalEncontrado = this.frontales.find((f: any) => f.codigo === this.vehiculoEnEdicion.frontal);
      if (frontalEncontrado) {
        this.vehiculoEnEdicion.idfrontal = frontalEncontrado.id;
      }
    }
    
    // Buscar ID del diferencial
    if (this.vehiculoEnEdicion.diferencial) {
      const diferencialEncontrado = this.diferenciales.find((d: any) => d.codigo === this.vehiculoEnEdicion.diferencial);
      if (diferencialEncontrado) {
        this.vehiculoEnEdicion.iddiferencial = diferencialEncontrado.id;
      }
    }
    
    console.log('IDs de componentes encontrados:', {
      idmotor: this.vehiculoEnEdicion.idmotor,
      idcaja: this.vehiculoEnEdicion.idcaja,
      iddrive: this.vehiculoEnEdicion.iddrive,
      idfrontal: this.vehiculoEnEdicion.idfrontal,
      iddiferencial: this.vehiculoEnEdicion.iddiferencial
    });
  }

  cerrarModalEditar() {
    this.mostrarModalEditar = false;
    this.vehiculoEnEdicion = {};
    this.usuariosDisponiblesEditar = [];
    this.modelosEditar = [];
    this.modelosFiltradosEditar = [];
    this.chasisesEditar = [];
    this.chasisesFiltradosEditar = [];
  }

  guardarEdicion() {
    const usuariosSeleccionados = this.usuariosDisponiblesEditar
      .filter(u => u.selected)
      .map(u => u.id);

      const lineaSeleccionada = this.lineas.find(l => l.codigo === this.vehiculoEnEdicion.idlinea);
const idLineaNum = lineaSeleccionada ? lineaSeleccionada.id : 0;

    const body = {
      idlinea: idLineaNum,
      idmodelo: this.vehiculoEnEdicion.idmodelo,
      idchasis: this.vehiculoEnEdicion.idchasis,
      idmotor: this.vehiculoEnEdicion.idmotor,
      idcaja: this.vehiculoEnEdicion.idcaja,
      iddrive: this.vehiculoEnEdicion.iddrive,
      idfrontal: this.vehiculoEnEdicion.idfrontal,
      iddiferencial: this.vehiculoEnEdicion.iddiferencial,
      usuariosAsignar: usuariosSeleccionados
    };

    console.log('Guardando edición:', body);

    this.vehiceService.actualizarVehiculoCompleto(this.vehiculoEnEdicion.id, body).subscribe((res: any) => {
      if (res.success) {
        alert('Vehículo actualizado con éxito');
        this.cerrarModalEditar();
        this.cargarVehiculos();
      } else {
        alert('Error al actualizar: ' + res.msg);
      }
    });
  }

  abrirModalEliminar(vehiculo: any) {
    this.vehiculoAEliminar = vehiculo;
    this.mostrarModalEliminar = true;
  }

  cerrarModalEliminar() {
    this.mostrarModalEliminar = false;
    this.vehiculoAEliminar = {};
  }

  confirmarEliminacion() {
    this.vehiceService.eliminarVehiculo(this.vehiculoAEliminar.id).subscribe((res: any) => {
      if (res.success) {
        alert('Vehículo eliminado con éxito');
        this.cerrarModalEliminar();
        this.cargarVehiculos();
      } else {
        alert('Error al eliminar: ' + res.msg);
      }
    });
  }

  // Métodos para dropdown de MODELO en edición
  toggleModeloDropdownEditar() {
    this.mostrarModeloDropdownEditar = !this.mostrarModeloDropdownEditar;
    if (this.mostrarModeloDropdownEditar) {
      this.modeloFilterEditar = '';
      this.filtrarModelosEditar();
    }
  }

  filtrarModelosEditar() {
    const f = this.modeloFilterEditar.toLowerCase();
    this.modelosFiltradosEditar = this.modelosEditar.filter(m => 
      m.codigo.toLowerCase().includes(f)
    );
  }

  seleccionarModeloEditar(m: any) {
    this.vehiculoEnEdicion.idmodelo = m.id;
    this.vehiculoEnEdicion.modelo = m.codigo;
    this.mostrarModeloDropdownEditar = false;
    console.log('Modelo seleccionado:', m);
  }

  get modeloEditarTexto() {
    // Mostrar directamente el texto del modelo que viene del vehículo
    return this.vehiculoEnEdicion.modelo || 'Seleccione modelo';
  }

  // Métodos para dropdown de CHASIS en edición
  toggleChasisDropdownEditar() {
    this.mostrarChasisDropdownEditar = !this.mostrarChasisDropdownEditar;
    if (this.mostrarChasisDropdownEditar) {
      this.chasisFilterEditar = '';
      this.filtrarChasisEditar();
    }
  }

  filtrarChasisEditar() {
    const f = this.chasisFilterEditar.toLowerCase();
    this.chasisesFiltradosEditar = this.chasisesEditar.filter(c => 
      c.codigo.toLowerCase().includes(f)
    );
  }

  seleccionarChasisEditar(c: any) {
    this.vehiculoEnEdicion.idchasis = c.id;
    this.vehiculoEnEdicion.chasis = c.codigo;
    this.mostrarChasisDropdownEditar = false;
    console.log('Chasis seleccionado:', c);
  }

  get chasisEditarTexto() {
    // Mostrar directamente el texto del chasis que viene del vehículo
    return this.vehiculoEnEdicion.chasis || 'Seleccione chasis';
  }

  cargarListasEdicion(): void {
     const sources: Record<string, Observable<any>> = {
    mot: this.vehiceService.getMotores(),
    caj: this.vehiceService.getCajas(),
    dri: this.vehiceService.getDrives(),
    fro: this.vehiceService.getFrontales(),
    dif: this.vehiceService.getDiferenciales()
  };

  // 2. forkJoin ya infiere el tipo del resultado
  forkJoin(sources).subscribe(
    ({ mot, caj, dri, fro, dif }:any) => {   // <-- ya no hay error “implicitly any”
      this.motores       = mot || [];
      this.cajas         = caj || [];
      this.drives        = dri || [];
      this.frontales     = fro || [];
      this.diferenciales = dif || [];
      
      // Buscar IDs basándose en los códigos/textos del vehículo
      if (this.vehiculoEnEdicion.motor) {
        const motorEncontrado = this.motores.find((m: any) => m.codigo === this.vehiculoEnEdicion.motor);
        if (motorEncontrado) {
          this.vehiculoEnEdicion.idmotor = motorEncontrado.id;
        }
      }
      
      if (this.vehiculoEnEdicion.caja) {
        const cajaEncontrada = this.cajas.find((c: any) => c.codigo === this.vehiculoEnEdicion.caja);
        if (cajaEncontrada) {
          this.vehiculoEnEdicion.idcaja = cajaEncontrada.id;
        }
      }
      
      if (this.vehiculoEnEdicion.drive) {
        const driveEncontrado = this.drives.find((d: any) => d.codigo === this.vehiculoEnEdicion.drive);
        if (driveEncontrado) {
          this.vehiculoEnEdicion.iddrive = driveEncontrado.id;
        }
      }
      
      if (this.vehiculoEnEdicion.frontal) {
        const frontalEncontrado = this.frontales.find((f: any) => f.codigo === this.vehiculoEnEdicion.frontal);
        if (frontalEncontrado) {
          this.vehiculoEnEdicion.idfrontal = frontalEncontrado.id;
        }
      }
      
      if (this.vehiculoEnEdicion.diferencial) {
        const diferencialEncontrado = this.diferenciales.find((d: any) => d.codigo === this.vehiculoEnEdicion.diferencial);
        if (diferencialEncontrado) {
          this.vehiculoEnEdicion.iddiferencial = diferencialEncontrado.id;
        }
      }
      
      console.log('Listas de edición cargadas con IDs:', {
        idmotor: this.vehiculoEnEdicion.idmotor,
        idcaja: this.vehiculoEnEdicion.idcaja,
        iddrive: this.vehiculoEnEdicion.iddrive,
        idfrontal: this.vehiculoEnEdicion.idfrontal,
        iddiferencial: this.vehiculoEnEdicion.iddiferencial
      });
    });
  }

  

  // ===== MÉTODOS PARA ABRIR/CERRAR MODALES =====
  abrirModalMotor() { this.mostrarModalMotor = true; this.nuevoMotorCodigo = ''; }
  abrirModalCaja() { this.mostrarModalCaja = true; this.nuevoCajaCodigo = ''; }
  abrirModalDrive() { this.mostrarModalDrive = true; this.nuevoDriveCodigo = ''; }
  abrirModalFrontal() { this.mostrarModalFrontal = true; this.nuevoFrontalCodigo = ''; }
  abrirModalDiferencial() { this.mostrarModalDiferencial = true; this.nuevoDiferencialCodigo = ''; }

  cerrarModalMotor() { this.mostrarModalMotor = false; }
  cerrarModalCaja() { this.mostrarModalCaja = false; }
  cerrarModalDrive() { this.mostrarModalDrive = false; }
  cerrarModalFrontal() { this.mostrarModalFrontal = false; }
  cerrarModalDiferencial() { this.mostrarModalDiferencial = false; }

  // ===== MÉTODOS PARA CREAR =====
  crearMotor() {
    if (!this.nuevoMotorCodigo) { alert('Ingrese código de motor'); return; }
    this.vehiceService.inmotor(this.nuevoMotorCodigo).subscribe((res: any) => {
      if (res.success) {
        alert('Motor creado con éxito');
        this.cargarMotores();
        this.vehiculoEnEdicion.idmotor = res.id[0].id;
        this.cerrarModalMotor();
      } else {
        alert('Error: ' + res.msg);
      }
    });
  }

  crearCaja() {
    if (!this.nuevoCajaCodigo) { alert('Ingrese código de caja'); return; }
    this.vehiceService.incajas(this.nuevoCajaCodigo).subscribe((res: any) => {
      if (res.success) {
        alert('Caja creada con éxito');
        this.cargarCajas();
        this.vehiculoEnEdicion.idcaja = res.id[0].id;
        this.cerrarModalCaja();
      } else {
        alert('Error: ' + res.msg);
      }
    });
  }

  crearDrive() {
    if (!this.nuevoDriveCodigo) { alert('Ingrese código de drive'); return; }
    this.vehiceService.driver(this.nuevoDriveCodigo).subscribe((res: any) => {
      if (res.success) {
        alert('Drive creado con éxito');
        this.cargarDrives();
        this.vehiculoEnEdicion.iddrive = res.id[0].id;
        this.cerrarModalDrive();
      } else {
        alert('Error: ' + res.msg);
      }
    });
  }

  crearFrontal() {
    if (!this.nuevoFrontalCodigo) { alert('Ingrese código de frontal'); return; }
    this.vehiceService.frontal(this.nuevoFrontalCodigo).subscribe((res: any) => {
      if (res.success) {
        alert('Frontal creado con éxito');
        this.cargarFrontales();
        this.vehiculoEnEdicion.idfrontal = res.id[0].id;
        this.cerrarModalFrontal();
      } else {
        alert('Error: ' + res.msg);
      }
    });
  }

  crearDiferencial() {
    if (!this.nuevoDiferencialCodigo) { alert('Ingrese código de diferencial'); return; }
    this.vehiceService.diferencial(this.nuevoDiferencialCodigo).subscribe((res: any) => {
      if (res.success) {
        alert('Diferencial creado con éxito');
        this.cargarDiferenciales();
        this.vehiculoEnEdicion.iddiferencial = res.id[0].id;
        this.cerrarModalDiferencial();
      } else {
        alert('Error: ' + res.msg);
      }
    });
  }


    // ===== DROPDOWNS DE COMPONENTES EN EDICIÓN =====

  // --- MOTOR ---
  toggleMotorDropdownEditar() {
    this.mostrarMotorDropdownEditar = !this.mostrarMotorDropdownEditar;
    if (this.mostrarMotorDropdownEditar) {
      this.motorFilterEditar = '';
      this.filtrarMotoresEditar();
    }
  }

  filtrarMotoresEditar() {
    const f = this.motorFilterEditar.toLowerCase();
    this.motoresFiltradosEditar = this.motores.filter(m => m.codigo.toLowerCase().includes(f));
  }

  seleccionarMotorEditar(m: any) {
    this.vehiculoEnEdicion.idmotor = m.id;
     this.vehiculoEnEdicion.motor = m.codigo;
    this.mostrarMotorDropdownEditar = false;
  }

  get motorEditarTexto() {
    return this.vehiculoEnEdicion.motor || 'Seleccione motor';
  }

  // --- CAJA ---
  toggleCajaDropdownEditar() {
    this.mostrarCajaDropdownEditar = !this.mostrarCajaDropdownEditar;
    if (this.mostrarCajaDropdownEditar) {
      this.cajaFilterEditar = '';
      this.filtrarCajasEditar();
    }
  }

  filtrarCajasEditar() {
    const f = this.cajaFilterEditar.toLowerCase();
    this.cajasFiltradosEditar = this.cajas.filter(c => c.codigo.toLowerCase().includes(f));
  }

  seleccionarCajaEditar(c: any) {
    this.vehiculoEnEdicion.idcaja = c.id;
      this.vehiculoEnEdicion.caja = c.codigo;
    this.mostrarCajaDropdownEditar = false;
  }

  get cajaEditarTexto() {
    return this.vehiculoEnEdicion.caja || 'Seleccione caja';
  }

  // --- DRIVE ---
  toggleDriveDropdownEditar() {
    this.mostrarDriveDropdownEditar = !this.mostrarDriveDropdownEditar;
    if (this.mostrarDriveDropdownEditar) {
      this.driveFilterEditar = '';
      this.filtrarDrivesEditar();
    }
  }

  filtrarDrivesEditar() {
    const f = this.driveFilterEditar.toLowerCase();
    this.drivesFiltradosEditar = this.drives.filter(d => d.codigo.toLowerCase().includes(f));
  }

  seleccionarDriveEditar(d: any) {
    this.vehiculoEnEdicion.iddrive = d.id;    
  this.vehiculoEnEdicion.drive = d.codigo;
    this.mostrarDriveDropdownEditar = false;
  }

  get driveEditarTexto() {
    return this.vehiculoEnEdicion.drive || 'Seleccione drive';
  }

  // --- FRONTAL ---
  toggleFrontalDropdownEditar() {
    this.mostrarFrontalDropdownEditar = !this.mostrarFrontalDropdownEditar;
    if (this.mostrarFrontalDropdownEditar) {
      this.frontalFilterEditar = '';
      this.filtrarFrontalesEditar();
    }
  }

  filtrarFrontalesEditar() {
    const d = this.frontalFilterEditar.toLowerCase();
    console.log(this.frontales);
    
    this.frontalesFiltradosEditar = this.frontales.filter(f => f.codigo.toLowerCase().includes(d));
    console.log(this.frontalesFiltradosEditar);
    
  }

  seleccionarFrontalEditar(f: any) {
    this.vehiculoEnEdicion.idfrontal = f.id;      
  this.vehiculoEnEdicion.frontal = f.codigo;
    this.mostrarFrontalDropdownEditar = false;
  }

  get frontalEditarTexto() {
    return this.vehiculoEnEdicion.frontal || 'Seleccione frontal';
  }

  // --- DIFERENCIAL ---
  toggleDiferencialDropdownEditar() {
    this.mostrarDiferencialDropdownEditar = !this.mostrarDiferencialDropdownEditar;
    if (this.mostrarDiferencialDropdownEditar) {
      this.diferencialFilterEditar = '';
      this.filtrarDiferencialesEditar();
    }
  }

  filtrarDiferencialesEditar() {
    const f = this.diferencialFilterEditar.toLowerCase();
    this.diferencialesFiltradosEditar = this.diferenciales.filter(d => d.codigo.toLowerCase().includes(f));
  }

  seleccionarDiferencialEditar(d: any) {
    this.vehiculoEnEdicion.iddiferencial = d.id;
     this.vehiculoEnEdicion.diferencial = d.codigo;
    this.mostrarDiferencialDropdownEditar = false;
  }

  get diferencialEditarTexto() {
    return this.vehiculoEnEdicion.diferencial || 'Seleccione diferencial';
  }

}