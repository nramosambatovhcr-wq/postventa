import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Language = 'es' | 'en' | 'zh';

interface Translations {
  [key: string]: {
    es: string;
    en: string;
    zh: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TranslationinvoService {
private currentLanguageSubject = new BehaviorSubject<Language>('es');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  private translations: Translations = {
    // Header
    searchPlaceholder: {
      es: 'Buscar...',
      en: 'Search...',
      zh: '搜索...'
    },

    // Dashboard Title
    invoiceDashboardTitle: {
      es: 'Panel de Facturas',
      en: 'Invoice Dashboard',
      zh: '发票仪表板'
    },
    invoiceDashboardSubtitle: {
      es: 'Gestiona y visualiza todas tus facturas',
      en: 'Manage and view all your invoices',
      zh: '管理和查看所有发票'
    },

    // Status Cards
    invoice: {
      es: 'Facturas',
      en: 'Invoices',
      zh: '发票'
    },
    create: {
      es: 'Crear',
      en: 'Create',
      zh: '创建'
    },
    uploadDetail: {
      es: 'Subir Detalle',
      en: 'Upload Detail',
      zh: '上传详情'
    },
    revision: {
      es: 'Revisión',
      en: 'Revision',
      zh: '审核中'
    },
    approved: {
      es: 'Aprobada',
      en: 'Approved',
      zh: '已批准'
    },
    
    asignada: {
      es: 'Asignada',
      en: 'Assigned',
      zh: '已分配'
    },
    delivered: {
      es: 'Entregada',
      en: 'Delivered',
      zh: '已交付'
    },
    annulled: {
      es: 'Anulada',
      en: 'Annulled',
      zh: '已取消'
    },

    // Date Filters
    from: {
      es: 'Desde',
      en: 'From',
      zh: '从'
    },
    to: {
      es: 'Hasta',
      en: 'To',
      zh: '到'
    },

    // Export Buttons
    excel: {
      es: 'Exportar Excel',
      en: 'Export Excel',
      zh: '导出Excel'
    },
    csv: {
      es: 'Exportar CSV',
      en: 'Export CSV',
      zh: '导出CSV'
    },

    // Table Headers
    item: {
      es: 'Item',
      en: 'Item',
      zh: '项目'
    },
    quotation: {
      es: 'Cotización',
      en: 'Quotation',
      zh: '报价单'
    },
    status: {
      es: 'Estado',
      en: 'Status',
      zh: '状态'
    },
    actions: {
      es: 'Acciones',
      en: 'Actions',
      zh: '操作'
    },

    // Action Buttons
    edit: {
      es: 'Editar',
      en: 'Edit',
      zh: '编辑'
    },
    delete: {
      es: 'Eliminar',
      en: 'Delete',
      zh: '删除'
    },
    viewDetails: {
      es: 'Ver Detalles',
      en: 'View Details',
      zh: '查看详情'
    },
    list: {
      es: 'Lista',
      en: 'List',
      zh: '列表'
    },

    // Pagination
    showing: {
      es: 'Mostrando',
      en: 'Showing',
      zh: '显示'
    },
    of: {
      es: 'de',
      en: 'of',
      zh: '共'
    },
    orders: {
      es: 'pedidos',
      en: 'orders',
      zh: '个订单'
    },

    // Modal
    orderImage: {
      es: 'Imagen del pedido',
      en: 'Order image',
      zh: '订单图片'
    },

    // Notifications
    confirmDelete: {
      es: '¿Está seguro de eliminar este registro?',
      en: 'Are you sure you want to delete this record?',
      zh: '您确定要删除此记录吗？'
    },
    deleteOk: {
      es: 'Registro eliminado correctamente',
      en: 'Record deleted successfully',
      zh: '记录已成功删除'
    },
    deleteError: {
      es: 'Error al eliminar el registro',
      en: 'Error deleting record',
      zh: '删除记录时出错'
    },

    // Loading and empty states
    loading: {
      es: 'Cargando...',
      en: 'Loading...',
      zh: '加载中...'
    },
    noData: {
      es: 'No hay datos para mostrar',
      en: 'No data to display',
      zh: '没有数据显示'
    }
  };

  constructor() {
    // Cargar idioma guardado o usar español por defecto
    const savedLang = localStorage.getItem('preferredLanguage') as Language;
    if (savedLang && ['es', 'en', 'zh'].includes(savedLang)) {
      this.currentLanguageSubject.next(savedLang);
    }
  }

  setLanguage(lang: Language): void {
    this.currentLanguageSubject.next(lang);
    localStorage.setItem('preferredLanguage', lang);
  }

  getCurrentLanguage(): Language {
    return this.currentLanguageSubject.value;
  }

  getTranslations(): { [key: string]: string } {
    const lang = this.currentLanguageSubject.value;
    const result: { [key: string]: string } = {};
    
    Object.keys(this.translations).forEach(key => {
      result[key] = this.translations[key][lang];
    });
    
    return result;
  }

  translate(key: string): string {
    const lang = this.currentLanguageSubject.value;
    return this.translations[key]?.[lang] || key;
  }
}