import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Usuario } from 'src/app/models/usuario';
import { AuthService } from 'src/app/services/auth.service';
 
import { CotizacionService } from 'src/app/services/cotizacion.service';
import { ProveedorService } from 'src/app/services/proveedor.service';

@Component({
  selector: 'app-crear',
  templateUrl: './crear.component.html',
  styleUrls: ['./crear.component.css']
})
export class CrearComponent implements OnInit {
  cotizacionForm!: FormGroup;
  isLoading: boolean = false;
  estadoCotizacion = 'PENDIENTE';
  usuario: Usuario | null = null;
  idus=0;
   allData: any[] = [];
   loading = false;
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
     private authService: AuthService,
     private proveedorService: ProveedorService, 
    private cotizacionService: CotizacionService // Reemplazar 'any' con el tipo real del servicio
  ) { 
  this.authService.usuarioActual$.subscribe(usuario => {
      this.usuario = usuario;
      console.log(this.usuario);
      this.idus=Number(this.usuario?.id);
      console.log(this.idus);
      
    /*  if (!usuario) {
        this.router.navigate(['/login']);
      }*/
    });

  }

  ngOnInit(): void {
    this.loadproveedor();
    this.initForm();
  }

  loadproveedor(){
    this.proveedorService.getProveedor().subscribe({
      next: (data: any) => {
        console.log(data.length);
        
        this.allData = data;
      
        console.log('Todos los datos:', this.allData);
      
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  initForm(): void {
    this.cotizacionForm = this.fb.group({
     // cotizacionId: ['', Validators.required],
      proveedorId: ['', Validators.required],
      fechaSolicitud: ['', Validators.required],
   
     // validezCotizacion: ['', Validators.required],
      estadoCotizacion: ['Solicitada', Validators.required], // Valor por defecto
      referenciaSolicitud: ['', Validators.maxLength(50)],
     // referenciaProveedor: ['', Validators.maxLength(50)],
        //observacionesSolicitud: [''],
   //   observacionesRespuesta: [''],
     // codigoCot: ['', [Validators.required, Validators.maxLength(20)]],
      usuario:this.idus,
      Cotigeneral: ['', [Validators.required, Validators.maxLength(20)]],
    });
  }

  // Helper para simplificar la validación en la plantilla
  isFieldInvalid(fieldName: string): boolean {
    const control = this.cotizacionForm.get(fieldName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }


   guardarCotizacion(): void {
    // Ensure form is valid before attempting to save
    if (this.cotizacionForm.valid) {
      // Get form values
      const cotizacionData = { ...this.cotizacionForm.value }; // Create a copy to avoid modifying the form value directly

      // Convert dates to ISO format if they exist and are not null/undefined
      if (cotizacionData.fechaSolicitud) {
        // Ensure cotizacionData.fechaSolicitud is a valid Date object or string parseable by Date
        try {
           cotizacionData.fechaSolicitud = new Date(cotizacionData.fechaSolicitud).toISOString();
        } catch (e) {
           console.error("Error converting fechaSolicitud to ISO string:", e);
           // Handle invalid date input if necessary, maybe show a user message
           // return; // Stop the save process if date is invalid
        }
      }
      // Assuming this.idus is correctly assigned elsewhere
      cotizacionData.usuario = this.idus; // <--- Ensure this.idus is populated before calling this function

      // Show loading indicator
      this.isLoading = true;

      // Call the service to save the quotation
      this.cotizacionService.createCotizacion(cotizacionData)
        .pipe(
          // Ensure loading indicator is hidden regardless of success or error
          finalize(() => {
            this.isLoading = false;
          })
        )
        .subscribe({
          next: (response) => {
            // --- Success Handling ---
            // Display success message using the toast
            const toast = document.createElement('div');
            toast.innerText = 'GUARDADO EXITOSAMENTE';
            toast.style.position = 'fixed';
            toast.style.top = '20px';
            toast.style.right = '20px';
            toast.style.backgroundColor = '#4CAF50'; // Green color for success
            toast.style.color = 'white';
            toast.style.padding = '15px 20px';
            toast.style.borderRadius = '4px';
            toast.style.zIndex = '9999';
            toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            toast.style.fontFamily = 'Arial, sans-serif'; // Use a standard font
            toast.style.transition = 'opacity 0.5s ease';
            toast.style.opacity = '1';

            document.body.appendChild(toast);

            // Fade out and remove the toast after a delay
            setTimeout(() => {
              toast.style.opacity = '0';
              setTimeout(() => {
                toast.remove(); // Use .remove() which is a standard method
              }, 500); // Wait for the fade-out transition to finish
            }, 3000); // Display for 3 seconds

            // Assuming the API response includes the created cotizacionId
            // Make sure your backend API successfully returns the ID of the newly created cotizacion in the response body
            const cotizacionId = response.cotizacionId; // <--- Access the ID from the response

            if (cotizacionId) {
               // Redirect to the detail view using the received ID
               this.router.navigate(['/detallexcelcot', cotizacionId]);
            } else {
               // Handle the case where the API did not return the ID
               console.warn('API call was successful but did not return cotizacionId in the response.', response);
               // You might want to redirect to a list page or show a generic success page
               // this.router.navigate(['/cotizaciones-list']);
            }

          },
          error: (error: any) => { // Use 'any' or define a specific error interface if known
            // --- Error Handling ---
            // isLoading is already set to false in finalize

            let errorMsg = 'Ocurrió un error al guardar la cotización.'; // Default generic error message

            // Attempt to get a specific error message from the API response body (error.error)
            if (error.error) {
              // Check common patterns for backend error messages in the response body object
              if (error.error.error) {
                // Matches the structure {"error": "..."} seen in your network tab screenshot
                errorMsg = error.error.error;
              } else if (error.error.message) {
                // Another common pattern {"message": "..."}
                errorMsg = error.error.message;
              } else if (typeof error.error === 'string') {
                 // Sometimes the error body is just a plain string
                 errorMsg = error.error;
              } else {
                // If error.error exists but is an object with an unexpected structure,
                // log it for debugging and provide a more general message to the user.
                console.error('Unexpected server error response body structure:', error.error);
                errorMsg = 'Ocurrió un error inesperado en el servidor. Por favor, intente de nuevo.';
              }
            } else if (error.message) {
              // Fallback for client-side or network errors (e.g., API is unreachable, timeout)
              // This is the message from the browser's Error object.
              errorMsg = `Error de la solicitud: ${error.message}`;
            } else {
              // Handle cases where the error object structure is entirely unexpected
              // Display HTTP status code if available
              errorMsg = `Error HTTP ${error.status || 'desconocido'}: ${error.statusText || 'Mensaje desconocido'}`;
            }


            // Display error message using the toast
            const toast = document.createElement('div');
            toast.innerText = errorMsg; // <= Use the determined error message here
            toast.style.position = 'fixed';
            toast.style.top = '20px';
            toast.style.right = '20px';
            toast.style.backgroundColor = '#e62c17'; // Red color for error
            toast.style.color = 'white';
            toast.style.padding = '15px 20px';
            toast.style.borderRadius = '4px';
            toast.style.zIndex = '9999';
            toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            toast.style.fontFamily = 'Arial, sans-serif'; // Use a standard font
            toast.style.transition = 'opacity 0.5s ease';
            toast.style.opacity = '1';

            document.body.appendChild(toast);

            // Set timeout to fade out and remove the toast
            setTimeout(() => {
              toast.style.opacity = '0';
              setTimeout(() => {
                toast.remove(); // Use .remove()
              }, 500); // Duration of the fade-out transition
            }, 7000); // Display duration (increased to 7 seconds for errors)

            // Log the full error object to the console for detailed debugging
            console.error('Error completo al guardar cotización:', error);
          }
        });
    } else {
      // --- Form Validation Error Handling (Form is invalid) ---
      // Mark all form fields as touched to display validation errors to the user
      Object.keys(this.cotizacionForm.controls).forEach(key => {
        const control = this.cotizacionForm.get(key);
        if (control) { // Null check for safety
          control.markAsTouched();
          // Optionally also mark as dirty if needed for your validation styling
          // control.markAsDirty();
        }
      });

      // Display a validation message toast
      const toast = document.createElement('div');
      toast.innerText = 'Por favor complete todos los campos requeridos.'; // Message for validation errors
      toast.style.position = 'fixed';
      toast.style.top = '20px';
      toast.style.right = '20px';
      // Adjusted styling for a warning toast for validation issues
      toast.style.backgroundColor = '#ffc107'; // Yellow/Orange color for warning
      toast.style.color = '#343a40'; // Dark text color for contrast on yellow/orange background
      toast.style.padding = '15px 20px';
      toast.style.borderRadius = '4px';
      toast.style.zIndex = '9999';
      toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      toast.style.fontFamily = 'Arial, sans-serif'; // Use a standard font
      toast.style.transition = 'opacity 0.5s ease';
      toast.style.opacity = '1';

      document.body.appendChild(toast);

      // Set timeout to fade out and remove the toast
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          toast.remove(); // Use .remove()
        }, 500); // Duration of the fade-out transition
      }, 5000); // Display duration for validation message (set to 5 seconds)
    }
  }
  cancelar(): void {
    this.router.navigate(['/dashboardcot']);
  }
  
  individual(): void {
    this.router.navigate(['/crearcot']);
  }
  
  excel(): void {
    this.router.navigate(['/detallexcelcot']);
  }
}