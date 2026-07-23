import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/usuario';

@Component({
  selector: 'app-pedido-individual',
  templateUrl: './pedido-individual.component.html',
  styleUrls: ['./pedido-individual.component.css']
})
export class PedidoIndividualComponent implements OnInit {
  pedidoForm: FormGroup;
  usuario: Usuario | null = null;
  loading = false;
  submitted = false;
  submitSuccess = false;
  errorMessage = '';
  selectedFiles: File[] = [];
  previewImages: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private pedidoService: PedidobodegaService,
    private reloadService: ReloadService,
    private authService: AuthService
  ) {
    this.pedidoForm = this.formBuilder.group({
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required],
      cantidad: ['', [Validators.required, Validators.min(1)]],
      modelo: ['', Validators.required],
      cliente: [''],
      ot: [''],
      observaciones: [''],
      tipo: ['pedido']
    });
  }

  ngOnInit(): void {
    console.log(this.selectedFiles);
    
    this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
    });
  }

  get f() { 
    return this.pedidoForm.controls; 
  }

  onFileSelect(event: any): void {
    if (event.target.files.length > 0) {
      const files = event.target.files;
      this.selectedFiles = Array.from(files);
      
      // Create preview images
      this.previewImages = [];
      for (const file of this.selectedFiles) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewImages.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previewImages.splice(index, 1);
  }

  onSubmit(): void {
    console.log(this.selectedFiles.length);
    
    this.submitted = true;
    this.submitSuccess = false;
    this.errorMessage = '';

    if (this.pedidoForm.invalid) {
      return;
    }
    this.loading = true;
    if(Number(this.selectedFiles.length)<=0){
      this.errorMessage = 'No hay imagen';
      this.loading = false;
      return;
    }

    this.loading = true;

    if (!this.usuario) {
      this.errorMessage = 'No hay usuario autenticado';
      this.loading = false;
      return;
    }

    const pedidoData = {
      ...this.pedidoForm.value,
      IdUsuarioCreacion: this.usuario.id,
      IdUsuarioModificacion: this.usuario.id
    };

    this.pedidoService.createPedido(pedidoData).subscribe({
      next: (response: any) => {
        const pedidoId = response.id_pedido;
        
        // If there are files, upload them
        if (this.selectedFiles.length > 0) {
          this.uploadFiles(pedidoId);
        } else {
          this.handleSuccess();
        }
      },
      error: (error) => {
        this.errorMessage = `Error al crear pedido: ${error.message || 'Error desconocido'}`;
        this.loading = false;
      }
    });
  }

  uploadFiles(pedidoId: number): void {
    const formData = new FormData();
    
    this.selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    this.pedidoService.uploadImages(pedidoId, formData).subscribe({
      next: () => {
        this.handleSuccess();
      },
      error: (error) => {
        this.errorMessage = `Error al subir imágenes: ${error.message || 'Error desconocido'}`;
        this.loading = false;
      }
    });
  }

  handleSuccess(): void {
    this.loading = false;
    this.submitSuccess = true;
    this.reloadService.triggerReload();
    
    // Reset form and files
    this.pedidoForm.reset({
      tipo: 'pedido' // Reset with default value
    });
    this.submitted = false;
    this.selectedFiles = [];
    this.previewImages = [];

    // Show success message
    const toast = document.createElement('div');
    toast.innerText = "Pedido creado exitosamente";
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = '#4CAF50';
    toast.style.color = 'white';
    toast.style.padding = '15px 20px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  }

  cancelar(): void {
    this.router.navigate(['/pedidosbod']);
  }
}