// translation.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
export class TranslationinvorevService {
 private currentLanguageSubject = new BehaviorSubject<Language>('es');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  private translations: Translations = {
    // Header
    'orderDetails': {
      es: 'ORDEN DETALLES',
      en: 'ORDER DETAILS',
      zh: '订单详情'
    },
    'searchPlaceholder': {
      es: 'Buscar por código, descripción, invoices...',
      en: 'Search by code, description, invoices...',
      zh: '按代码、描述、发票搜索...'
    },
    
    // Panel Header
    'orderDetailsTitle': {
      es: 'Detalles de Orden',
      en: 'Order Details',
      zh: '订单详情'
    },
    'itemsTotal': {
      es: 'items total',
      en: 'items total',
      zh: '总项目'
    },
    'ofInvoiceBL': {
      es: 'de Invoice BL',
      en: 'from Invoice BL',
      zh: '来自发票提单'
    },
    'onlyInOrder': {
      es: 'solo en Orden',
      en: 'only in Order',
      zh: '仅在订单中'
    },
    'both': {
      es: 'ambos',
      en: 'both',
      zh: '两者'
    },
    
    // Statistics Cards
    'totalItems': {
      es: 'Total Items',
      en: 'Total Items',
      zh: '总项目'
    },
    'totalRequested': {
      es: 'Total Solicitado',
      en: 'Total Requested',
      zh: '总请求'
    },
    'totalInvoiced': {
      es: 'Total Facturado',
      en: 'Total Invoiced',
      zh: '总开票'
    },
    'compliance': {
      es: 'Cumplimiento',
      en: 'Compliance',
      zh: '合规性'
    },
    'pendingItems': {
      es: 'Items Pendientes',
      en: 'Pending Items',
      zh: '待处理项目'
    },
    'completeItems': {
      es: 'Items Completos',
      en: 'Complete Items',
      zh: '完整项目'
    },
    'invoices': {
      es: 'Invoices',
      en: 'Invoices',
      zh: '发票'
    },
    
    // Progress Bar
    'complianceProgress': {
      es: 'Progreso de Cumplimiento',
      en: 'Compliance Progress',
      zh: '合规进度'
    },
    'of': {
      es: 'de',
      en: 'of',
      zh: '的'
    },
    
    // Associated Invoices
    'associatedInvoices': {
      es: 'Invoices Asociadas:',
      en: 'Associated Invoices:',
      zh: '相关发票：'
    },
    
    // Table
    'orderDetailsTable': {
      es: 'Detalles de la Orden',
      en: 'Order Details',
      zh: '订单详情'
    },
    'allOrigins': {
      es: 'Todos los orígenes',
      en: 'All origins',
      zh: '所有来源'
    },
    'onlyInvoiceBL': {
      es: 'Solo Invoice BL',
      en: 'Only Invoice BL',
      zh: '仅发票提单'
    },
    'onlyPurchaseOrder': {
      es: 'Solo Orden Compra',
      en: 'Only Purchase Order',
      zh: '仅采购订单'
    },
    'allStates': {
      es: 'Todos los estados',
      en: 'All states',
      zh: '所有状态'
    },
    'complete': {
      es: 'Completos',
      en: 'Complete',
      zh: '完整'
    },
    'pending': {
      es: 'Pendientes',
      en: 'Pending',
      zh: '待处理'
    },
    'withoutRequest': {
      es: 'Sin Solicitud',
      en: 'Without Request',
      zh: '无请求'
    },
    'filter': {
      es: 'Filtrar',
      en: 'Filter',
      zh: '过滤'
    },
    'export': {
      es: 'Exportar',
      en: 'Export',
      zh: '导出'
    },
    
    // Table Headers
    'code': {
      es: 'Código',
      en: 'Code',
      zh: '代码'
    },
    'code new': {
      es: 'Código Nuevo',
      en: 'New Code',
      zh: '代码'
    },
    'description': {
      es: 'Descripción',
      en: 'Description',
      zh: '描述'
    },
    'requestedQty': {
      es: 'Cant. Solicitada',
      en: 'Requested Qty',
      zh: '请求数量'
    },
    'invoicedQty': {
      es: 'Cant. Facturada',
      en: 'Invoiced Qty',
      zh: '开票数量'
    },
    'pendingQty': {
      es: 'Cant. Pendiente',
      en: 'Pending Qty',
      zh: '待处理数量'
    },
    'status': {
      es: 'Estado',
      en: 'Status',
      zh: '状态'
    },
    'origin': {
      es: 'Origen',
      en: 'Origin',
      zh: '来源'
    },
    
    // Status Labels
    'completeStatus': {
      es: 'Completo',
      en: 'Complete',
      zh: '完整'
    },
    'pendingStatus': {
      es: 'Pendiente',
      en: 'Pending',
      zh: '待处理'
    },
    'withoutRequestStatus': {
      es: 'Sin Solicitud',
      en: 'Without Request',
      zh: '无请求'
    },
    
    // Footer
    'showing': {
      es: 'Mostrando',
      en: 'Showing',
      zh: '显示'
    },
    'items': {
      es: 'items',
      en: 'items',
      zh: '项目'
    },
    'requested': {
      es: 'Solicitado:',
      en: 'Requested:',
      zh: '请求：'
    },
    'invoiced': {
      es: 'Facturado:',
      en: 'Invoiced:',
      zh: '开票：'
    },
    
    // Messages
    'noDataFound': {
      es: 'No se encontraron detalles para mostrar.',
      en: 'No details found to display.',
      zh: '未找到要显示的详细信息。'
    },
    'loadingOrderDetails': {
      es: 'Cargando detalles de la orden...',
      en: 'Loading order details...',
      zh: '加载订单详情...'
    }
  };

  constructor() {
    // Load saved language from localStorage
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

  translate(key: string): string {
    const translation = this.translations[key];
    if (!translation) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    return translation[this.getCurrentLanguage()];
  }

  instant(key: string): string {
    return this.translate(key);
  }
}