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
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Definir tipos para las traducciones FUERA de la clase
type TranslationKey = 'header' | 'search' | 'dashboard' | 'subtitle' | 'quotations' | 'create' | 
  'uploadDetail' | 'approved' | 'rejected' | 'quotationDetails' | 'from' | 'to' | 'reset' | 
  'filter' | 'export' | 'importExcel' | 'saveChanges' | 'code' | 'equivalentCode' | 
  'description' | 'qty' | 'fob' | 'observations' | 'actions' | 'undo' | 'delete' | 
  'showing' | 'of' | 'orders' | 'confirmDelete' | 'confirmDeleteMsg' | 'cancel' | 
  'importData' | 'processing' | 'preview' | 'columnMapping' | 'selectColumn' | 'import' | 'chineseLabel' | 'clientQty' | 'addItem' | 'total'; // ADDED 'total'

type Language = 'es' | 'en' | 'zh';

type Translations = {
  [key in Language]: {
    [key in TranslationKey]: string;
  };
};

// Agregar después de los imports y antes del @Component
interface DetalleCotizacion {
  detalleCotizacionId: number;
  cotizacionId: number;
  code: string;
  qty: number; // Cantidad a cotizar (editable)
  clientQty: number; // NUEVO: Cantidad solicitada por el cliente (fija)
  cantidad_proveedor: number;
  description: string;
  chinese: string;
  unit: string;
  price: number;
  equivalent_code: string;
  observations: string;
  fecha_creacion:any;
  translations?: {
    es: string;
    en: string;
    zh: string;
  };
  isNew?: boolean; // NUEVO: Indicador para ítems agregados manualmente/Excel
}

@Component({
selector: 'app-respuestapro',
templateUrl: './respuestapro.component.html',
styleUrls: ['./respuestapro.component.css']
})
export class RespuestaproComponent implements OnInit, OnDestroy {
   // Idioma seleccionado
 currentLanguage: Language = 'es';
  
  // Traducciones
  translations: Translations = {
    es: {
      header: 'REVISIÓN COTIZACIÓN',
      search: 'Buscar',
      dashboard: 'Dashboard para Revisión de Cotización',
      subtitle: 'Monitoreo en tiempo real de las cotizaciones',
      quotations: 'COTIZACIONES',
      create: 'CREAR',
      uploadDetail: 'SUBIR DETALLE',
      approved: 'APROBADAS',
      rejected: 'RECHAZADAS',
      quotationDetails: 'Cotizaciones Detalles',
      from: 'Desde:',
      to: 'Hasta:',
      reset: 'Resetear',
      filter: 'Filtrar',
      export: 'Exportar',
      importExcel: 'Importar Excel',
      saveChanges: 'Guardar Cambios',
      code: 'Código',
      equivalentCode: 'Código Equivalente',
      description: 'Descripción / Chino',
      qty: 'Cantidad',
      fob: 'FOB',
      observations: 'Observaciones',
      actions: 'Acciones',
      undo: 'Deshacer',
      delete: 'Eliminar',
      showing: 'Mostrando',
      of: 'de',
      orders: 'pedidos',
      confirmDelete: 'Confirmar eliminación',
      confirmDeleteMsg: '¿Está seguro que desea eliminar este ítem?',
      cancel: 'Cancelar',
      importData: 'Importar datos desde Excel',
      processing: 'Procesando archivo...',
      preview: 'Vista previa de los datos (primeras 5 filas):',
      columnMapping: 'Mapeo de columnas',
      selectColumn: '-- Seleccionar columna --',
      import: 'Importar',
      chineseLabel: 'Chino',
      clientQty: 'Cant. Cliente', // NUEVO
      addItem: 'Agregar Ítem', // NUEVO
      total: 'Total' // ADDED
    },
    en: {
      header: 'QUOTATION REVIEW',
      search: 'Search',
      dashboard: 'Quotation Review Dashboard',
      subtitle: 'Real-time quotation monitoring',
      quotations: 'QUOTATIONS',
      create: 'CREATE',
      uploadDetail: 'UPLOAD DETAIL',
      approved: 'APPROVED',
      rejected: 'REJECTED',
      quotationDetails: 'Quotation Details',
      from: 'From:',
      to: 'To:',
      reset: 'Reset',
      filter: 'Filter',
      export: 'Export',
      importExcel: 'Import Excel',
      saveChanges: 'Save Changes',
      code: 'Code',
      equivalentCode: 'Equivalent Code',
      description: 'Description / Chinese',
      qty: 'Qty',
      fob: 'FOB',
      observations: 'Observations',
      actions: 'Actions',
      undo: 'Undo',
      delete: 'Delete',
      showing: 'Showing',
      of: 'of',
      orders: 'orders',
      confirmDelete: 'Confirm deletion',
      confirmDeleteMsg: 'Are you sure you want to delete this item?',
      cancel: 'Cancel',
      importData: 'Import data from Excel',
      processing: 'Processing file...',
      preview: 'Data preview (first 5 rows):',
      columnMapping: 'Column mapping',
      selectColumn: '-- Select column --',
      import: 'Import',
      chineseLabel: 'Chinese',
      clientQty: 'Client Qty', // NUEVO
      addItem: 'Add Item', // NUEVO
      total: 'Total' // ADDED
    },
    zh: {
      header: '审核报价',
      search: '搜索',
      dashboard: '报价审核仪表板',
      subtitle: '实时报价监控',
      quotations: '报价单',
      create: '创建',
      uploadDetail: '上传详情',
      approved: '已批准',
      rejected: '已拒绝',
      quotationDetails: '报价详情',
      from: '从:',
      to: '到:',
      reset: '重置',
      filter: '筛选',
      export: '导出',
      importExcel: '导入Excel',
      saveChanges: '保存更改',
      code: '代码',
      equivalentCode: '等效代码',
      description: '描述 / 中文',
      qty: '数量',
      fob: '离岸价',
      observations: '备注',
      actions: '操作',
      undo: '撤销',
      delete: '删除',
      showing: '显示',
      of: '共',
      orders: '订单',
      confirmDelete: '确认删除',
      confirmDeleteMsg: '您确定要删除此项目吗？',
      cancel: '取消',
      importData: '从Excel导入数据',
      processing: '正在处理文件...',
      preview: '数据预览（前5行）：',
      columnMapping: '列映射',
      selectColumn: '-- 选择列 --',
      import: '导入',
      chineseLabel: '中文',
      clientQty: '客户数量', // NUEVO
      addItem: '添加项目', // NUEVO
      total: '总计' // ADDED
    }
  };

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
  lista: DetalleCotizacion[] = []; // Usar el tipo DetalleCotizacion
  allData: DetalleCotizacion[] = []; // Usar el tipo DetalleCotizacion
  filteredData: DetalleCotizacion[] = []; // Usar el tipo DetalleCotizacion
  newImportedItems: DetalleCotizacion[] = []; // NUEVO: Ítems agregados sin guardar
  id: number = 0;
  usuario: Usuario | null = null;
  loading = false;
  private subscription = new Subscription();
  startDate: string = '';
  endDate: string = '';
  codigoCot: number = 0;
  originalData: DetalleCotizacion[] = []; // Usar el tipo DetalleCotizacion
  changedItems: Set<number> = new Set();
  hasChanges: boolean = false;
  showDeleteConfirmModal: boolean = false;
  itemToDelete: DetalleCotizacion | null = null;
  indexToDelete: number = -1;
  showImportModal: boolean = false;
  importProgress: 'uploading' | 'preview' | null = null;
  excelRawData: any[] = [];
  excelPreviewData: any[] = [];
  excelPreviewHeaders: string[] = [];
  fieldMapping: { [key: string]: string } = {};
  
  grandTotal: number = 0; // ADDED: Propiedad para el total global
  
  requiredFields = [
    { key: 'code', label: 'Código' },
    { key: 'equivalent_code', label: 'Código Equivalente' },
    { key: 'description', label: 'Descripción' },
    { key: 'chinese', label: 'Chino' },
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

  // Método para obtener la traducción actual
  t(key: TranslationKey): string {
    return this.translations[this.currentLanguage][key] || key;
  }

  // Método para cambiar el idioma
  changeLanguage(lang: Language): void {
    this.currentLanguage = lang;
    // Guardar en localStorage para persistencia
    localStorage.setItem('appLanguage', lang);
  }

  getTranslatedDescription(item: any): string {
    // Primero intentar usar las traducciones que vienen de la API
    if (item.translations && item.translations[this.currentLanguage]) {
      const translation = item.translations[this.currentLanguage];
      // Solo retornar si no está vacío
      if (translation && translation.trim() !== '') {
        return translation;
      }
    }

    // Fallback al comportamiento anterior
    const isChineseSelected = this.currentLanguage === 'zh';

    if (isChineseSelected) {
      return item.chinese || item.description || '';
    }
    
    return item.description || item.chinese || '';
  }

  ngOnInit(): void {
    // Cargar idioma guardado
    const savedLang = localStorage.getItem('appLanguage') as Language | null;
    if (savedLang && (savedLang === 'es' || savedLang === 'en' || savedLang === 'zh')) {
      this.currentLanguage = savedLang;
    }

    const idString: string | null = this.route.snapshot.paramMap.get('id');
    if (idString) {
      this.codigoCot = Number(idString);
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
  
  // NUEVO: Calcula el total de una fila (Cantidad * FOB)
  getTotalForItem(item: DetalleCotizacion): number {
    // Asegurarse de que sean números. Si no son válidos, usar 0.
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    
    return qty * price;
  }
  
  // NUEVO: Calcula el total de todos los ítems
  calculateGrandTotal(): void {
    // Combinar todos los datos (filtrados/existentes + nuevos/importados)
    const combinedData = [...this.filteredData, ...this.newImportedItems];
    
    this.grandTotal = combinedData.reduce((sum, item) => {
      return sum + this.getTotalForItem(item);
    }, 0);
  }
  
  loadimportaciones() {
    this.loading = true;
    this.tutorialService.getCotizacionDetailProNew(this.codigoCot).subscribe({
      next: (data: any) => {
        console.log('Datos recibidos:', data);
        console.log('Total de registros:', data.length);
        
        // Transformar data: Agregar clientQty (cantidad original) y isNew: false
        this.allData = data.map((item: any) => ({
            ...item,
            clientQty: item.qty, // La cantidad inicial es la cantidad del cliente
            qty: item.cantidad_proveedor,
            equivalent_code: item.equivalent_Code ?? item.equivalent_code ?? '', // normalizar capitalización
            isNew: false
        }));
        
        this.originalData = JSON.parse(JSON.stringify(this.allData));
        
        this.filteredData = this.allData;
        this.totalItems = this.filteredData.length + this.newImportedItems.length; // Contar también los nuevos
        
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePageData();
        
        this.changedItems.clear();
        this.hasChanges = this.newImportedItems.length > 0; // Solo nuevos si no hay cambios en existentes
        
        this.calculateGrandTotal(); // CALLED HERE
        
        this.loading = false;
      },
      error: (e) => {
        console.error('Error al cargar cotizaciones:', e);
        this.loading = false;
      }
    });
  }

  // NUEVO MÉTODO: Agregar un ítem manualmente
  addNewItem(): void {
    const newItem: DetalleCotizacion = {
      detalleCotizacionId: 0, 
      cotizacionId: this.codigoCot,
      code: '',
      qty: 0, 
      clientQty: 0, 
      cantidad_proveedor: 0, 
      description: '',
      chinese: '',
      unit: '',
      price: 0, 
      equivalent_code: '',
      observations: '',
      fecha_creacion:'',
      isNew: true 
    };
    this.newImportedItems.push(newItem);
    this.updatePageData();
    this.hasChanges = true;
    this.calculateGrandTotal(); // CALLED HERE
  }

  isItemChanged(item: DetalleCotizacion, field?: string): boolean {
    if (item.isNew) return false; // Los nuevos no tienen estado original en originalData

    const originalItem = this.originalData.find(orig => orig.detalleCotizacionId === item.detalleCotizacionId);
    if (!originalItem) return false;

    if (field) {
      return item[field as keyof DetalleCotizacion] !== originalItem[field as keyof DetalleCotizacion];
    }

    return item.qty !== originalItem.qty || 
           item.price !== originalItem.price || 
           item.equivalent_code !== originalItem.equivalent_code ||
           item.observations !== originalItem.observations ||
           item.chinese !== originalItem.chinese;
  }

  onItemChanged(item: DetalleCotizacion, index: number): void {
    // Si es un item nuevo, solo actualiza hasChanges
    if (item.isNew) {
      this.hasChanges = true;
      this.calculateGrandTotal(); // CALLED HERE
      return;
    }
    
    // Lógica para items existentes
    const isChanged = this.isItemChanged(item);
    if (isChanged) {
      this.changedItems.add(index);
    } else {
      this.changedItems.delete(index);
    }

    this.hasChanges = this.changedItems.size > 0 || this.newImportedItems.length > 0;
    this.calculateGrandTotal(); // CALLED HERE
  }

  resetItemChanges(item: DetalleCotizacion, index: number): void {
    if (item.isNew) return; // No se puede deshacer un ítem nuevo

    const originalItem = this.originalData.find(orig => orig.detalleCotizacionId === item.detalleCotizacionId);
    if (originalItem) {
      item.qty = originalItem.qty;
      item.price = originalItem.price;
      item.equivalent_code = originalItem.equivalent_code;
      item.observations = originalItem.observations;
      item.chinese = originalItem.chinese;
      
      this.changedItems.delete(index);
      this.hasChanges = this.changedItems.size > 0 || this.newImportedItems.length > 0;
      this.calculateGrandTotal(); // CALLED HERE
    }
  }

  deleteItem(item: DetalleCotizacion, index: number): void {
    this.itemToDelete = item;
    this.indexToDelete = index;
    this.showDeleteConfirmModal = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirmModal = false;
    this.itemToDelete = null;
    this.indexToDelete = -1;
  }

  confirmDelete(): void {
    if (!this.itemToDelete || this.indexToDelete < 0) return;

    if (this.itemToDelete.isNew) {
      // 1. Eliminación de ítem NUEVO (solo front-end)
      const newIndex = this.newImportedItems.findIndex(i => i === this.itemToDelete);
      if (newIndex >= 0) {
          this.newImportedItems.splice(newIndex, 1);
      }
      
      this.updatePageData();
      this.hasChanges = this.changedItems.size > 0 || this.newImportedItems.length > 0;
      this.calculateGrandTotal(); // CALLED HERE
      this.showDeleteConfirmModal = false;
      this.itemToDelete = null;
      this.indexToDelete = -1;
      alert('El ítem nuevo ha sido eliminado correctamente del borrador.');
      return;
    }
    
    // 2. Eliminación de ítem EXISTENTE (API)
    this.loading = true;
    
    // Se usa 'detalleCotizacionId' ya que es la clave en la interfaz,
    // asumiendo que el servicio lo requiere.
    this.tutorialService.deleteCotizacionItem(this.codigoCot, this.itemToDelete.detalleCotizacionId).subscribe({
      next: (response) => {
        console.log('Ítem eliminado exitosamente', response);
        
        // Eliminar de allData y filteredData
        const removeById = (arr: DetalleCotizacion[]) => arr.findIndex(item => item.detalleCotizacionId === this.itemToDelete!.detalleCotizacionId);

        let allDataIndex = removeById(this.allData);
        if (allDataIndex >= 0) this.allData.splice(allDataIndex, 1);
        
        let filteredDataIndex = removeById(this.filteredData);
        if (filteredDataIndex >= 0) this.filteredData.splice(filteredDataIndex, 1);
        
        this.totalItems = this.filteredData.length + this.newImportedItems.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        if (this.currentPage > this.totalPages && this.totalPages > 0) {
          this.currentPage = this.totalPages;
        }
        this.updatePageData();
        
        this.calculateGrandTotal(); // CALLED HERE
        
        this.showDeleteConfirmModal = false;
        this.itemToDelete = null;
        this.indexToDelete = -1;
        this.loading = false;
        
        alert('El ítem ha sido eliminado correctamente');
      },
      error: (error) => {
        console.error('Error al eliminar el ítem', error);
        this.loading = false;
        this.showDeleteConfirmModal = false;
        this.itemToDelete = null;
        this.indexToDelete = -1;
        alert('Error al eliminar el ítem. Por favor, intente nuevamente.');
      }
    });
  }
/*
  saveChanges(): void {
    // 1. Preparar ítems existentes modificados
    const existingUpdatedItems = this.allData.filter(item => {
        const original = this.originalData.find(o => o.detalleCotizacionId === item.detalleCotizacionId);
        if (!original) return false;
        
        // Chequeo de cambios
        return item.qty !== original.qty || 
               item.price !== original.price || 
               item.equivalent_code !== original.equivalent_code ||
               item.observations !== original.observations ||
               item.chinese !== original.chinese;
    }).map(item => ({
        code: item.code,
        qty: item.qty,
        price: item.price,
        equivalent_code: item.equivalent_code,
        observations: item.observations,
        chinese: item.chinese,
        id: item.detalleCotizacionId // Usar detalleCotizacionId para update
    }));
    
    // 2. Preparar ítems nuevos para creación (Importación)
    const newItemsToSave = this.newImportedItems.map(item => ({
        code: item.code,
        qty: item.qty,
        price: item.price,
        equivalent_code: item.equivalent_code,
        observations: item.observations,
        chinese: item.chinese,
        cotizacionId: this.codigoCot
    }));

    if (existingUpdatedItems.length === 0 && newItemsToSave.length === 0) {
      alert('No hay cambios para guardar.');
      return;
    }

    this.loading = true;
    let successCount = 0;
    const totalOperations = (existingUpdatedItems.length > 0 ? 1 : 0) + (newItemsToSave.length > 0 ? 1 : 0);

    const checkCompletion = () => {
        successCount++;
        if (successCount === totalOperations) {
            console.log('Finalizando guardado...');
            this.newImportedItems = []; // Limpiar nuevos ítems si fueron creados
            this.loadimportaciones(); // Recargar datos para incluir nuevos y confirmar actualizaciones
            this.loading = false;
            alert('Los cambios y nuevos ítems se han guardado correctamente.');
        }
    };
    
    // A. Manejar Actualizaciones
    if (existingUpdatedItems.length > 0) {
      this.tutorialService.updateCotizacionItems1(this.codigoCot, existingUpdatedItems).subscribe({
        next: (response) => {
          console.log('Cambios en ítems existentes guardados exitosamente', response);
          checkCompletion();
        },
        error: (error) => {
          console.error('Error al guardar los cambios en ítems existentes', error);
          this.loading = false;
          alert('Error al guardar los cambios. Por favor, intente nuevamente.');
        }
      });
    }
    
    // B. Manejar Creación de Nuevos Ítems
    if (newItemsToSave.length > 0) {
      this.tutorialService.importCotizacionItems(this.codigoCot, newItemsToSave).subscribe({
        next: (response) => {
          console.log('Nuevos ítems creados exitosamente', response);
          checkCompletion();
        },
        error: (error) => {
          console.error('Error al crear nuevos ítems', error);
          this.loading = false;
          alert('Error al crear nuevos ítems. Por favor, intente nuevamente.');
        }
      });
    }
  }
*/
saveChanges(): void {
  const existingUpdatedItems = this.allData
    .filter(item => {
      const original = this.originalData.find(o => o.detalleCotizacionId === item.detalleCotizacionId);
      if (!original) return false;
      return item.qty !== original.qty ||
             item.price !== original.price ||
             item.equivalent_code !== original.equivalent_code ||
             item.observations !== original.observations ||
             item.chinese !== original.chinese;
    })
    .map(item => ({
      id: item.detalleCotizacionId,
      code: item.code,
      qty: item.qty,
      price: item.price,
      description: item.description,
      equivalent_code: item.equivalent_code,
      observations: item.observations,
      chinese: item.chinese,
      cotizacionId: item.cotizacionId
    }));

  const newItemsToSave = this.newImportedItems.map(item => ({
    code: item.code,
    qty: item.qty,
    price: item.price,
    description: item.description,
    equivalent_code: item.equivalent_code,
    observations: item.observations,
    chinese: item.chinese,
    cotizacionId: this.codigoCot
  }));

  if (existingUpdatedItems.length === 0 && newItemsToSave.length === 0) {
    alert('No hay cambios para guardar.');
    return;
  }

  this.loading = true;

  // ✅ UNA sola petición bulk en lugar de N peticiones
  const update$ = existingUpdatedItems.length > 0
    ? this.tutorialService.updateItemsBulk(existingUpdatedItems).pipe(
        catchError(err => {
          console.error('Error al actualizar ítems', err);
          return of(null);
        })
      )
    : of(null);

  const create$ = newItemsToSave.length > 0
    ? this.tutorialService.importCotizacionItems2(this.codigoCot, newItemsToSave).pipe(
        catchError(err => {
          console.error('Error al crear nuevos ítems', err);
          return of(null);
        })
      )
    : of(null);

  forkJoin([update$, create$]).subscribe({
    next: () => {
      this.newImportedItems = [];
      this.loadimportaciones();
      this.loading = false;
      alert('Cambios guardados correctamente.');
    },
    error: (err) => {
      console.error('Error inesperado', err);
      this.loading = false;
      alert('Error al guardar cambios.');
    }
  });
}

  updatePageData() {
    // Combina los ítems filtrados (existentes) con los nuevos (Excel/Manual)
    const combinedData = [...this.filteredData, ...this.newImportedItems]; 
    
    this.totalItems = combinedData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.lista = combinedData.slice(startIndex, endIndex);
    
    this.calculateGrandTotal(); // CALLED HERE
  }
  
  // NUEVO: Método para obtener la lista combinada para la exportación
  getCombinedDataForExport(): DetalleCotizacion[] {
    return [...this.filteredData, ...this.newImportedItems];
  }


  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePageData();
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  applyDateFilter() {
    if (!this.startDate || !this.endDate) {
      this.filteredData = this.allData;
    } else {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      
      this.filteredData = this.allData.filter(item => {
        // Asumiendo que item tiene una fecha de creación o similar para filtrar
        // Si no existe, este filtro no hará nada útil.
        const itemDate = new Date(item.fecha_creacion || '1970-01-01'); 
        return itemDate >= start && itemDate <= end;
      });
    }

    this.totalItems = this.filteredData.length + this.newImportedItems.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePageData();
  }
  

  resetDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.filteredData = this.allData;
    this.totalItems = this.filteredData.length + this.newImportedItems.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePageData();
  }

  searchImports(): void {
    if (this.searchTerm.trim() === '') {
      this.applyDateFilter();
    } else {
      const searchTermLower = this.searchTerm.toLowerCase();
      
      let dateFilteredData = this.allData;
      if (this.startDate && this.endDate) {
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        end.setHours(23, 59, 59, 999);
        
        dateFilteredData = this.allData.filter(item => {
          const itemDate = new Date(item.fecha_creacion || '1970-01-01');
          return itemDate >= start && itemDate <= end;
        });
      }
      
      this.filteredData = dateFilteredData.filter(item => 
        (item.code && item.code.toLowerCase().includes(searchTermLower)) ||
        (item.description && item.description.toLowerCase().includes(searchTermLower)) ||
        (item.observations && item.observations.toLowerCase().includes(searchTermLower)) ||
        (item.equivalent_code && item.equivalent_code.toLowerCase().includes(searchTermLower)) ||
        (item.chinese && item.chinese.toLowerCase().includes(searchTermLower))
      );
      
      this.totalItems = this.filteredData.length + this.newImportedItems.length;
      this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
      this.currentPage = 1;
      this.updatePageData();
    }
    console.log('Buscando:', this.searchTerm);
  }

  filterData(): void {
    console.log('Filtrar datos');
  }

  revisado() {
    this.router.navigate(['/pedidobodrev']);
  }

  error() {
    this.router.navigate(['/detallexcelcot']);
  }

  crear() {
    this.router.navigate(['/crearcot']);
  }

  coti() {
    this.router.navigate(['/dashboardcotpro']);
  }

  aprobada() {
    this.router.navigate(['/cotaprobada']);
  }

  rechazada() {
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
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      const pages: number[] = [];
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push(-1);
      }
      
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push(-1);
      }
      
      if (totalPages > 1) {
        pages.push(totalPages);
      }
      
      return pages;
    }
  }

  downloadExcel(): void {
    const dataToExport = this.getCombinedDataForExport();
    // Mapear los datos para una mejor visualización en el Excel, incluyendo Cant. Cliente y Total
    const exportData = dataToExport.map(item => ({
      'Código': item.code || '',
      'Código Equivalente': item.equivalent_code || '',
      'Descripción': item.description || '',
      'Chino': item.chinese || '',
      'Cant. Cliente': item.clientQty || '', // Cantidad solicitada (fija)
      'Cantidad': item.qty || '', // Cantidad a cotizar (editable)
      'Precio FOB': item.price || '',
      'Total': this.getTotalForItem(item) || '', // ADDED Total
      'Observaciones': item.observations || ''
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cotizacion');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Cotizacion_${new Date().toISOString().split('T')[0]}.xlsx`);

    this.showExportMenu = false;
  }

  downloadCSV(): void {
    const dataToExport = this.getCombinedDataForExport();
    // Actualizar encabezados
    let csvContent = 'Codigo,Codigo_Equivalente,Descripcion,Chino,Cant_Cliente,Cantidad,Precio,Total,Observaciones\n';
    
    dataToExport.forEach(item => {
      const row = [
        item.code || '',
        item.equivalent_code || '',
        item.description || '',
        item.chinese || '',
        item.clientQty || '', // Cantidad solicitada (fija)
        item.qty || '', // Cantidad a cotizar (editable)
        item.price || '',
        this.getTotalForItem(item) || '', // ADDED Total
        (item.observations || '').replace(/,/g, ' ')
      ].join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `Cotizacion_${new Date().toISOString().split('T')[0]}.csv`);

    this.showExportMenu = false;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.showImportModal = true;
      this.importProgress = 'uploading';
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          this.excelRawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (this.excelRawData.length < 2) {
            throw new Error('El archivo Excel no contiene datos suficientes');
          }
          
          this.excelPreviewHeaders = this.excelRawData[0] as string[];
          this.excelPreviewData = this.excelRawData.slice(1, 6); // Mostrar solo las primeras 5 filas
          this.fieldMapping = {};
          
          this.autoMapFields();
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

  autoMapFields(): void {
    const normalizeString = (str: string) => str.toLowerCase().replace(/[\s_-]/g, '');
    this.requiredFields.forEach(field => {
      const normalizedFieldKey = normalizeString(field.key);
      const normalizedFieldLabel = normalizeString(field.label);
      
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

  isValidMapping(): boolean {
    const requiredKeys = ['code', 'qty', 'price'];
    return requiredKeys.every(key => this.fieldMapping[key] && this.fieldMapping[key].trim() !== '');
  }

  cancelImport(): void {
    this.showImportModal = false;
    this.importProgress = null;
    this.excelRawData = [];
    this.excelPreviewData = [];
    this.excelPreviewHeaders = [];
    this.fieldMapping = {};
  }

  // UPDATED: Implementa la lógica de "upsert" local (actualizar si existe, insertar si no)
  processExcelImport(): void {
    if (!this.isValidMapping()) {
      alert('Por favor, complete el mapeo de campos obligatorios.');
      return;
    }

    try {
      const itemsToUpdate: DetalleCotizacion[] = []; // Para los que ya existen
      const newItemsFromImport: DetalleCotizacion[] = []; // Para los que son realmente nuevos
      
      for (let i = 1; i < this.excelRawData.length; i++) {
        const row = this.excelRawData[i];
        if (!row || row.length === 0) continue;
        
        const item: any = {};
        
        // 1. Mapeo de datos del Excel
        for (const [fieldKey, headerName] of Object.entries(this.fieldMapping)) {
          if (headerName) {
            const headerIndex = this.excelPreviewHeaders.indexOf(headerName);
            if (headerIndex >= 0) {
              let value = row[headerIndex];
              
              if (fieldKey === 'qty' || fieldKey === 'price') {
                // Aseguramos que qty y price sean números.
                value = value !== undefined && value !== null ? Number(value) : 0;
              }
              
              item[fieldKey] = value;
            }
          }
        }
        
        // 2. Procesamiento y Upsert local
        if (item.code) {
          const itemCodeStr = String(item.code);
          
          // Buscar si el ítem YA EXISTE en la cotización cargada (allData)
          const existingItemIndex = this.allData.findIndex(d => d.code === itemCodeStr);
          
          if (existingItemIndex >= 0) {
            // *** A. ÍTEM EXISTENTE: ACTUALIZAR Y MARCAR COMO CAMBIADO ***
            const existingItem = this.allData[existingItemIndex];
            
            // Aplicar los nuevos valores SOLO si se mapearon
            if (item.qty !== undefined) existingItem.qty = item.qty;
            if (item.price !== undefined) existingItem.price = item.price;
            if (item.equivalent_code !== undefined) existingItem.equivalent_code = item.equivalent_code;
            if (item.observations !== undefined) existingItem.observations = item.observations;
            if (item.chinese !== undefined) existingItem.chinese = item.chinese;

            // Marcar el ítem como modificado (si realmente cambió)
            this.onItemChanged(existingItem, existingItemIndex);
            
            itemsToUpdate.push(existingItem);
            
          } else {
            // *** B. ÍTEM NUEVO: AGREGAR A LA LISTA DE NUEVOS ÍTEMS ***
            const newItem: DetalleCotizacion = {
              detalleCotizacionId: 0, 
              cotizacionId: this.codigoCot,
              code: itemCodeStr,
              qty: item.qty || 0,
              clientQty: 0, 
              cantidad_proveedor:0,
              description: item.description || '',
              chinese: item.chinese || '',
              unit: item.unit || '', 
              price: item.price || 0, 
              equivalent_code: item.equivalent_code || '',
              observations: item.observations || '',
              fecha_creacion: new Date().toISOString(),
              isNew: true 
            };
            newItemsFromImport.push(newItem);
          }
        }
      }
      
      if (itemsToUpdate.length === 0 && newItemsFromImport.length === 0) {
        alert('No se encontraron datos válidos para importar o actualizar.');
        return;
      }
      
      // 3. Aplicar cambios al front-end
      
      // Agregar los ítems realmente nuevos a la lista de nuevos
      this.newImportedItems = [...this.newImportedItems, ...newItemsFromImport];
      
      this.cancelImport(); 
      this.updatePageData(); 
      
      // Recalcular si hay cambios
      this.hasChanges = this.changedItems.size > 0 || this.newImportedItems.length > 0;
      this.calculateGrandTotal(); // CALLED HERE
      
      const updatedCount = itemsToUpdate.length;
      const newCount = newItemsFromImport.length;
      let alertMessage = `Proceso de importación local finalizado. `;
      
      if (updatedCount > 0) {
        alertMessage += `Se actualizaron ${updatedCount} ítems existentes. `;
      }
      if (newCount > 0) {
        alertMessage += `Se agregaron ${newCount} ítems nuevos al borrador. `;
      }
      
      alertMessage += `Presione "${this.t('saveChanges')}" para subir todos los cambios y nuevos ítems al sistema.`;
      alert(alertMessage);
      
    } catch (error) {
      console.error('Error al procesar los datos para importar:', error);
      alert('Error al procesar los datos. Por favor, verifique el formato del archivo.');
    }
  }
}