import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-invusuarios',
  templateUrl: './invusuarios.component.html',
  styleUrls: ['./invusuarios.component.css']
})
export class InvusuariosComponent implements OnInit {
  
  usuarios: any[] = [];
  usuarioForm: FormGroup;
  modoEdicion: boolean = false;
  usuarioSeleccionado: any = null;
  mostrarModal: boolean = false;
  terminoBusqueda: string = '';

  constructor(private fb: FormBuilder) {
    this.usuarioForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      rol: ['', Validators.required],
      agencia: [''],
      telefono: [''],
      activo: [true]
    });
  }

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    // Simulación de datos - reemplazar con servicio real
    this.usuarios = [
      { id: 1, nombre: 'Juan Pérez', email: 'juan@vehicentro.com', username: 'jperez', rol: 'Administrador', agencia: 'Agencia Norte', activo: true },
      { id: 2, nombre: 'María García', email: 'maria@vehicentro.com', username: 'mgarcia', rol: 'Contador', agencia: 'Agencia Sur', activo: true },
      { id: 3, nombre: 'Carlos López', email: 'carlos@vehicentro.com', username: 'clopez', rol: 'Supervisor', agencia: 'Agencia Centro', activo: false }
    ];
  }

  get usuariosFiltrados() {
    if (!this.terminoBusqueda) return this.usuarios;
    const termino = this.terminoBusqueda.toLowerCase();
    return this.usuarios.filter(u => 
      u.nombre.toLowerCase().includes(termino) ||
      u.email.toLowerCase().includes(termino) ||
      u.username.toLowerCase().includes(termino)
    );
  }

  abrirModalCrear() {
    this.modoEdicion = false;
    this.usuarioSeleccionado = null;
    this.usuarioForm.reset({ activo: true });
    this.mostrarModal = true;
  }

  editarUsuario(usuario: any) {
    this.modoEdicion = true;
    this.usuarioSeleccionado = usuario;
    this.usuarioForm.patchValue(usuario);
    this.mostrarModal = true;
  }

  guardarUsuario() {
    if (this.usuarioForm.invalid) return;
    
    const datos = this.usuarioForm.value;
    
    if (this.modoEdicion) {
      // Actualizar usuario
      const index = this.usuarios.findIndex(u => u.id === this.usuarioSeleccionado.id);
      if (index !== -1) {
        this.usuarios[index] = { ...this.usuarioSeleccionado, ...datos };
      }
    } else {
      // Crear usuario
      const nuevoUsuario = {
        id: this.usuarios.length + 1,
        ...datos
      };
      this.usuarios.push(nuevoUsuario);
    }
    
    this.cerrarModal();
  }

  eliminarUsuario(usuario: any) {
    if (confirm(`¿Está seguro de eliminar al usuario ${usuario.nombre}?`)) {
      this.usuarios = this.usuarios.filter(u => u.id !== usuario.id);
    }
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.usuarioForm.reset();
  }

  getRolBadgeClass(rol: string): string {
    switch(rol) {
      case 'Administrador': return 'badge-danger';
      case 'Supervisor': return 'badge-warning';
      case 'Contador': return 'badge-success';
      default: return 'badge-secondary';
    }
  }
}