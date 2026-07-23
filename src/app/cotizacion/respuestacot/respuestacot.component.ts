import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { PedidobodegaService } from '../../services/pedidobodega.service';
import { ReloadService } from '../../services/reload.service';
import * as XLSX from 'xlsx';
import { CotizacionService } from 'src/app/services/cotizacion.service';

@Component({
  selector: 'app-respuestacot',
  templateUrl: './respuestacot.component.html',
  styleUrls: ['./respuestacot.component.css']
})
export class RespuestacotComponent implements OnInit, OnDestroy {
stats = {
totalImportaciones: 7,
enTransito: 24,
pendientesLiquidacion: 18,
tiempoPromedio: 28
};
searchTerm: string = '';
currentPage: number = 1;
itemsPerPage: number = 20;
totalPages: number = 0;
lista: any[] = [];
allData: any[] = []; // Todos los datos sin paginar
filteredData: any[] = []; // Datos filtrados por fecha
id: number = 0;
usuario: Usuario | null = null;
loading = false;
private subscription = new Subscription();
// Date filter variables
startDate: string = '';
endDate: string = '';
codigoCot: number = 0;
// Variables para el control de cambios
originalData: any[] = []; // Almacena los datos originales para comparación
changedItems: Set<number> = new Set(); // Guarda los índices de los elementos modificados
hasChanges: boolean = false; // Flag para indicar si hay cambios pendientes
// Variables para la confirmación de eliminación
showDeleteConfirmModal: boolean = false;
itemToDelete: any = null;
indexToDelete: number = -1;
// Variables para la importación de Excel
showImportModal: boolean = false;
importProgress: 'uploading' | 'preview' | null = null;
excelRawData: any[] = [];
excelPreviewData: any[] = [];
excelPreviewHeaders: string[] = [];
fieldMapping: { [key: string]: string } = {};
requiredFields = [
{ key: 'code', label: 'Código' },
{ key: 'equivalent_code', label: 'Código Equivalente' },
{ key: 'description', label: 'Descripción' },
{ key: 'qty', label: 'Cantidad' },
{ key: 'price', label: 'Precio FOB' },
{ key: 'observations', label: 'Observaciones' }
];
constructor(
private router: Router,
private tutorialService: CotizacionService,
private reloadService: ReloadService,
private authService: AuthService,
private route: ActivatedRoute
) { }
ngOnInit(): void {
const idString: string | null = this.route.snapshot.paramMap.get('id'); // 'id' must match the route parameter name
if (idString) {
  this.codigoCot = Number(idString); // The '+' operator converts a string to a number
  console.log('Código de Cotización recibido (snapshot):', this.codigoCot);
} else {
  console.warn('El parámetro de código de cotización no fue encontrado en la ruta.');
}

this.authService.usuarioActual$.subscribe(usuario => {
  this.usuario = usuario;
  console.log(this.usuario);
  if(this.usuario != null){
    this.id = this.usuario.id;
    console.log(this.id);
    this.loadimportaciones();
  }
});

this.subscription.add(
  this.reloadService.reload$.subscribe(() => {
    this.loadimportaciones();
  })
);

// Initialize date filters with current month
const now = new Date();
const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

this.startDate = this.formatDateForInput(firstDayOfMonth);
this.endDate = this.formatDateForInput(lastDayOfMonth);
}
selectedImageUrl: string = '';
isModalOpen: boolean = false;
openImageModal(imageUrl: string): void {
this.selectedImageUrl = imageUrl;
this.isModalOpen = true;
}
closeImageModal(): void {
this.isModalOpen = false;
}
ngOnDestroy() {
this.subscription.unsubscribe();
}
totalItems: number = 0;
loadimportaciones() {
this.loading = true;
this.tutorialService.getCotizacionDetailPro(this.codigoCot).subscribe({
next: (data: any) => {
console.log(data.length);
    this.allData = data;
    // Crear una copia profunda para el control de cambios
    this.originalData = JSON.parse(JSON.stringify(data));
    
    this.filteredData = this.allData; // Initialize filtered data with all data
    this.totalItems = this.filteredData.length;
    console.log(this.totalItems);
    
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.updatePageData();
    console.log('Todos los datos:', this.allData);
    
    // Apply date filter if dates are set
    /* if (this.startDate && this.endDate) {
      this.applyDateFilter();
    }*/
    
    this.loading = false;
    // Reiniciar las variables de control de cambios
    this.changedItems.clear();
    this.hasChanges = false;
  },
  error: (e) => {
    console.error(e);
    this.loading = false;
  }
});
}
// Método para verificar si un ítem ha sido modificado
isItemChanged(item: any, field?: string): boolean {
// Buscar el ítem original por su código (o cualquier otro identificador único)
const originalItem = this.originalData.find(orig => orig.code === item.code);
if (!originalItem) return false;

// Si se especifica un campo, verificar solo ese campo
if (field) {
  return item[field] !== originalItem[field];
}

// De lo contrario, verificar todos los campos relevantes
return item.qty !== originalItem.qty || 
       item.price !== originalItem.price || 
       item.equivalent_code !== originalItem.equivalent_code ||
       (item.observations !== originalItem.observations);
}
// Método para registrar un cambio
onItemChanged(item: any, index: number): void {
const isChanged = this.isItemChanged(item);
if (isChanged) {
  this.changedItems.add(index);
} else {
  this.changedItems.delete(index);
}

this.hasChanges = this.changedItems.size > 0;
}
// Método para restablecer los cambios de un ítem específico
resetItemChanges(item: any, index: number): void {
// Encontrar el ítem original
const originalItem = this.originalData.find(orig => orig.code === item.code);
if (originalItem) {
  // Restablecer solo los campos editables
  item.qty = originalItem.qty;
  item.price = originalItem.price;
  item.equivalent_code = originalItem.equivalent_code;
  item.observations = originalItem.observations;
  
  // Eliminar de la lista de cambios
  this.changedItems.delete(index);
  this.hasChanges = this.changedItems.size > 0;
}
}
// Método para iniciar el proceso de eliminación de un ítem
deleteItem(item: any, index: number): void {
this.itemToDelete = item;
this.indexToDelete = index;
this.showDeleteConfirmModal = true;
}
// Método para cancelar la eliminación
cancelDelete(): void {
this.showDeleteConfirmModal = false;
this.itemToDelete = null;
this.indexToDelete = -1;
}
// Método para confirmar y procesar la eliminación
confirmDelete(): void {
if (this.itemToDelete && this.indexToDelete >= 0) {
this.loading = true;
  // Llamar al servicio para eliminar el ítem
  this.tutorialService.deleteCotizacionItem(this.codigoCot, this.itemToDelete.id).subscribe({
    next: (response) => {
      console.log('Ítem eliminado exitosamente', response);
      
      // Eliminar el ítem de los arrays locales
      this.lista.splice(this.indexToDelete, 1);
      
      // Buscar el índice en allData y filteredData para eliminar también
      const allDataIndex = this.allData.findIndex(item => item.id === this.itemToDelete.id);
      if (allDataIndex >= 0) {
        this.allData.splice(allDataIndex, 1);
      }
      
      const filteredDataIndex = this.filteredData.findIndex(item => item.id === this.itemToDelete.id);
      if (filteredDataIndex >= 0) {
        this.filteredData.splice(filteredDataIndex, 1);
      }
      
      // Actualizar la paginación
      this.totalItems = this.filteredData.length;
      this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
      if (this.currentPage > this.totalPages && this.totalPages > 0) {
        this.currentPage = this.totalPages;
      }
      this.updatePageData();
      
      // Cerrar el modal
      this.showDeleteConfirmModal = false;
      this.itemToDelete = null;
      this.indexToDelete = -1;
      this.loading = false;
      
      // Mostrar notificación de éxito
      alert('El ítem ha sido eliminado correctamente');
    },
    error: (error) => {
      console.error('Error al eliminar el ítem', error);
      this.loading = false;
      
      // Cerrar el modal
      this.showDeleteConfirmModal = false;
      this.itemToDelete = null;
      this.indexToDelete = -1;
      
      // Mostrar notificación de error
      alert('Error al eliminar el ítem. Por favor, intente nuevamente.');
    }
  });
}
}
// Método para guardar todos los cambios
saveChanges(): void {
const changedItemsData = Array.from(this.changedItems).map(index => {
const item = this.lista[index];
return {
code: item.code,
qty: item.qty,
price: item.price,
equivalent_code: item.equivalent_code,
observations: item.observations,
// Añadir otros campos necesarios para la actualización
id: item.id // Asegúrate de incluir el id si es necesario para la API
};
});
if (changedItemsData.length > 0) {
  this.loading = true;
  
  // Llamar al servicio para actualizar los datos
  this.tutorialService.updateCotizacionItems1(this.codigoCot, changedItemsData).subscribe({
    next: (response) => {
      console.log('Cambios guardados exitosamente', response);
      // Actualizar los datos originales después de guardar
      this.originalData = JSON.parse(JSON.stringify(this.allData));
      this.changedItems.clear();
      this.hasChanges = false;
      this.loading = false;
      
      // Mostrar notificación de éxito
      alert('Los cambios se han guardado correctamente');
    },
    error: (error) => {
      console.error('Error al guardar los cambios', error);
      this.loading = false;
      
      // Mostrar notificación de error
      alert('Error al guardar los cambios. Por favor, intente nuevamente.');
    }
  });
}
}

updatePageData() {
const startIndex = (this.currentPage - 1) * this.itemsPerPage;
const endIndex = startIndex + this.itemsPerPage;
this.lista = this.filteredData.slice(startIndex, endIndex);
}
changePage(page: number) {
if (page < 1 || page > this.totalPages) return;
this.currentPage = page;
this.updatePageData();
}
// Helper method to format date for input fields
formatDateForInput(date: Date): string {
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
return `${year}-${month}-${day}`;
}
// Date filter methods
applyDateFilter() {
if (!this.startDate || !this.endDate) {
this.filteredData = this.allData;
} else {
const start = new Date(this.startDate);
// Set to end of day for the end date
const end = new Date(this.endDate);
end.setHours(23, 59, 59, 999);
  this.filteredData = this.allData.filter(item => {
    const itemDate = new Date(item.fecha_creacion);
    return itemDate >= start && itemDate <= end;
  });
}

this.totalItems = this.filteredData.length;
this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
this.currentPage = 1; // Reset to first page when filter is applied
this.updatePageData();
}
resetDateFilter() {
this.startDate = '';
this.endDate = '';
this.filteredData = this.allData;
this.totalItems = this.filteredData.length;
this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
this.currentPage = 1;
this.updatePageData();
}
searchImports(): void {
if (this.searchTerm.trim() === '') {
// If search term is empty, apply only date filter
this.applyDateFilter();
} else {
// Apply both search and date filters
const searchTermLower = this.searchTerm.toLowerCase();
  // First, filter by date
  let dateFilteredData = this.allData;
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    end.setHours(23, 59, 59, 999);
    
    dateFilteredData = this.allData.filter(item => {
      const itemDate = new Date(item.fecha_creacion);
      return itemDate >= start && itemDate <= end;
    });
  }
  
  // Then, filter by search term
  this.filteredData = dateFilteredData.filter(item => 
    (item.code && item.code.toLowerCase().includes(searchTermLower)) ||
    (item.description && item.description.toLowerCase().includes(searchTermLower)) ||
    (item.observations && item.observations.toLowerCase().includes(searchTermLower)) ||
    (item.equivalent_code && item.equivalent_code.toLowerCase().includes(searchTermLower))
  );
  
  this.totalItems = this.filteredData.length;
  this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
  this.currentPage = 1;
  this.updatePageData();
}
console.log('Buscando:', this.searchTerm);
}
filterData(): void {
// Show a more advanced filter modal/dialog
console.log('Filtrar datos');
}
// Métodos para la navegación
revisado(){
this.router.navigate(['/pedidobodrev']);
}
error(){
this.router.navigate(['/detallexcelcot']);
}
crear(){
this.router.navigate(['/crearcot']);
}
coti(){
this.router.navigate(['/dashboardcotpro']);
}
aprobada(){
this.router.navigate(['/cotaprobada']);
}
rechazada(){
this.router.navigate(['/cotrechazada']);
}
showExportMenu: boolean = false;
toggleExportMenu(): void {
this.showExportMenu = !this.showExportMenu;
}
getPaginationArray(): number[] {
const totalPages = this.totalPages;
const currentPage = this.currentPage;
if (totalPages <= 5) {
  // Show all pages if there are 5 or fewer
  return Array.from({ length: totalPages }, (_, i) => i + 1);
} else {
  // Logic for showing pages with ellipsis
  const pages: number[] = [];
  
  // Always show the first page
  pages.push(1);
  
  // Add ellipsis if the start is far
  if (currentPage > 3) {
    pages.push(-1); // -1 represents ellipsis
  }
  
  // Add pages around the current one
  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
    pages.push(i);
  }
  
  // Add ellipsis if the end is far
  if (currentPage < totalPages - 2) {
    pages.push(-1); // -1 represents ellipsis
  }
  
  // Always show the last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }
  
  return pages;
}
}
// Métodos para exportar datos
downloadExcel(): void {
// Create worksheet from filtered data
const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredData);
// Create workbook and add the worksheet
const workbook: XLSX.WorkBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Cotizacion');

// Generate Excel file buffer
const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

// Create a Blob from the buffer
const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

// Save the file
saveAs(blob, `Cotizacion_${new Date().toISOString().split('T')[0]}.xlsx`);

// Cerrar el menú desplegable después de exportar
this.showExportMenu = false;
}
downloadCSV(): void {
// Convert data to CSV format
let csvContent = 'Codigo,Codigo_Equivalente,Descripcion,Chino,Cantidad,Precio,Observaciones\n';
this.filteredData.forEach(item => {
  const row = [
    item.code || '',
    item.equivalent_code || '',
    item.description || '',
    item.chinese || '',
    item.qty || '',
    item.price || '',
    (item.observations || '').replace(/,/g, ' ') // Reemplazar comas para evitar problemas con el formato CSV
  ].join(',');
  csvContent += row + '\n';
});

// Create a Blob from the CSV content
const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });

// Save the file
saveAs(blob, `Cotizacion_${new Date().toISOString().split('T')[0]}.csv`);

// Cerrar el menú desplegable después de exportar
this.showExportMenu = false;
}
// Métodos para la importación de Excel
onFileSelected(event: any): void {
  const file = event.target.files[0];
  if (file) {
    // Mostrar el modal y establecer el estado en "cargando"
    this.showImportModal = true;
    this.importProgress = 'uploading';
    
    // Leer el archivo de Excel
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Obtener la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON
        this.excelRawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (this.excelRawData.length < 2) {
          throw new Error('El archivo Excel no contiene datos suficientes');
        }
        
        // Extraer encabezados
        this.excelPreviewHeaders = this.excelRawData[0] as string[];
        
        // Mostrar todas las filas (no solo las primeras 5)
        this.excelPreviewData = this.excelRawData.slice(1);
        
        // Resetear el mapeo de campos
        this.fieldMapping = {};
        
        // Intentar mapear automáticamente por nombres similares
        this.autoMapFields();
        
        // Cambiar el estado a "vista previa"
        this.importProgress = 'preview';
      } catch (error) {
        console.error('Error al procesar el archivo Excel:', error);
        alert('Error al procesar el archivo Excel. Por favor, verifique el formato.');
        this.cancelImport();
      }
    };
    reader.readAsArrayBuffer(file);
  }
}
// Método para intentar mapear automáticamente los campos
autoMapFields(): void {
const normalizeString = (str: string) => str.toLowerCase().replace(/[\s_-]/g, '');
this.requiredFields.forEach(field => {
  const normalizedFieldKey = normalizeString(field.key);
  const normalizedFieldLabel = normalizeString(field.label);
  
  // Buscar coincidencias exactas o similares
  const matchIndex = this.excelPreviewHeaders.findIndex(header => {
    const normalizedHeader = normalizeString(header);
    return normalizedHeader === normalizedFieldKey || 
           normalizedHeader === normalizedFieldLabel ||
           normalizedHeader.includes(normalizedFieldKey) ||
           normalizedHeader.includes(normalizedFieldLabel);
  });
  
  if (matchIndex >= 0) {
    this.fieldMapping[field.key] = this.excelPreviewHeaders[matchIndex];
  }
});
}
// Verificar si el mapeo es válido
isValidMapping(): boolean {
// Verificar que los campos obligatorios estén mapeados
const requiredKeys = ['code', 'qty', 'price']; // Campos obligatorios mínimos
return requiredKeys.every(key => this.fieldMapping[key] && this.fieldMapping[key].trim() !== '');
}
// Cancelar la importación
cancelImport(): void {
this.showImportModal = false;
this.importProgress = null;
this.excelRawData = [];
this.excelPreviewData = [];
this.excelPreviewHeaders = [];
this.fieldMapping = {};
}
// Procesar la importación del Excel
processExcelImport(): void {
if (!this.isValidMapping()) {
alert('Por favor, complete el mapeo de campos obligatorios.');
return;
}
try {
  // Convertir los datos del Excel a objetos según el mapeo
  const importedItems = [];
  
  // Comenzar desde la segunda fila (índice 1) para omitir los encabezados
  for (let i = 1; i < this.excelRawData.length; i++) {
    const row = this.excelRawData[i];
    if (!row || row.length === 0) continue; // Saltar filas vacías
    
    const item: any = {};
    
    // Mapear cada campo según la configuración
    for (const [fieldKey, headerName] of Object.entries(this.fieldMapping)) {
      if (headerName) {
        const headerIndex = this.excelPreviewHeaders.indexOf(headerName);
        if (headerIndex >= 0) {
          let value = row[headerIndex];
          
          // Convertir valores numéricos si es necesario
          if (fieldKey === 'qty' || fieldKey === 'price') {
            value = value !== undefined && value !== null ? Number(value) : 0;
          }
          
          item[fieldKey] = value;
        }
      }
    }
    
    // Verificar que el ítem tenga al menos código
    if (item.code) {
      importedItems.push(item);
    }
  }
  
  // Verificar si hay datos a importar
  if (importedItems.length === 0) {
    alert('No se encontraron datos válidos para importar.');
    return;
  }
  
  this.loading = true;
  
  // Llamar al servicio para importar los datos
  this.tutorialService.importCotizacionItems(this.codigoCot, importedItems).subscribe({
    next: (response) => {
      console.log('Importación completada exitosamente', response);
      
      // Recargar los datos
      this.loadimportaciones();
      
      // Cerrar el modal
      this.cancelImport();
      
      // Mostrar notificación de éxito
      alert(`Se importaron ${importedItems.length} ítems correctamente.`);
    },
    error: (error) => {
      console.error('Error al importar los datos', error);
      this.loading = false;
      
      // Mostrar notificación de error
      alert('Error al importar los datos. Por favor, intente nuevamente.');
    }
  });
} catch (error) {
  console.error('Error al procesar los datos para importar:', error);
  alert('Error al procesar los datos. Por favor, verifique el formato del archivo.');
}
}
}