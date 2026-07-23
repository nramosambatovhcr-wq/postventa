import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Language = 'es' | 'en' | 'zh';

export interface Translations {
  [key: string]: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLanguageSubject = new BehaviorSubject<Language>('es');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  private translations: Record<Language, Translations> = {
    es: {
      /* ---------- Header ---------- */
      title: 'Pedidos Proveedor',
      searchPlaceholder: 'Buscar',

      /* ---------- Dashboard ---------- */
      dashboardTitle: 'Dashboard Proveedor',
      dashboardSubtitle: 'Monitoreo en tiempo real de los proveedores',

      /* ---------- Statistics Cards ---------- */
      quotations: 'COTIZACIONES',
      assigned:   'ASIGNADAS',         // ✅ NUEVO
      approved:   'APROBADAS',
      rejected:   'RECHAZADAS',

      /* ---------- Table ---------- */
      recentQuotations: 'Cotizaciones Recientes',
      from: 'Desde:',
      to: 'Hasta:',
      reset: 'Resetear',
      filter: 'Filtrar',
      export: 'Exportar',
      excel: 'Excel (.xlsx)',
      csv: 'CSV (.csv)',

      /* ---------- Table Headers ---------- */
      item: 'Item',
      code: 'Código',
      supplier: 'Proveedor',
      date: 'Fecha',
      status: 'Estado',
      details: 'Detalles',
      actions: 'Acciones',

      /* ---------- Footer ---------- */
      showing: 'Mostrando',
      of: 'de',
      orders: 'pedidos',

      /* ---------- Tooltips ---------- */
      viewDetails: 'Ver detalles'
    },

    en: {
      /* ---------- Header ---------- */
      title: 'Supplier Orders',
      searchPlaceholder: 'Search',

      /* ---------- Dashboard ---------- */
      dashboardTitle: 'Supplier Dashboard',
      dashboardSubtitle: 'Real-time supplier monitoring',

      /* ---------- Statistics Cards ---------- */
      quotations: 'QUOTATIONS',
      assigned:   'ASSIGNED',          // ✅ NEW
      approved:   'APPROVED',
      rejected:   'REJECTED',

      /* ---------- Table ---------- */
      recentQuotations: 'Recent Quotations',
      from: 'From:',
      to: 'To:',
      reset: 'Reset',
      filter: 'Filter',
      export: 'Export',
      excel: 'Excel (.xlsx)',
      csv: 'CSV (.csv)',

      /* ---------- Table Headers ---------- */
      item: 'Item',
      code: 'Code',
      supplier: 'Supplier',
      date: 'Date',
      status: 'Status',
      details: 'Details',
      actions: 'Actions',

      /* ---------- Footer ---------- */
      showing: 'Showing',
      of: 'of',
      orders: 'orders',

      /* ---------- Tooltips ---------- */
      viewDetails: 'View details'
    },

    zh: {
      /* ---------- Header ---------- */
      title: '供应商订单',
      searchPlaceholder: '搜索',

      /* ---------- Dashboard ---------- */
      dashboardTitle: '供应商仪表板',
      dashboardSubtitle: '实时供应商监控',

      /* ---------- Statistics Cards ---------- */
      quotations: '报价单',
      assigned:   '已分配',           // ✅ 新增
      approved:   '已批准',
      rejected:   '已拒绝',

      /* ---------- Table ---------- */
      recentQuotations: '最近的报价',
      from: '从:',
      to: '到:',
      reset: '重置',
      filter: '筛选',
      export: '导出',
      excel: 'Excel (.xlsx)',
      csv: 'CSV (.csv)',

      /* ---------- Table Headers ---------- */
      item: '项目',
      code: '代码',
      supplier: '供应商',
      date: '日期',
      status: '状态',
      details: '详情',
      actions: '操作',

      /* ---------- Footer ---------- */
      showing: '显示',
      of: '的',
      orders: '订单',

      /* ---------- Tooltips ---------- */
      viewDetails: '查看详情'
    }
  };

  constructor() {
    const savedLang = localStorage.getItem('appLanguage') as Language;
    if (savedLang && ['es', 'en', 'zh'].includes(savedLang)) {
      this.currentLanguageSubject.next(savedLang);
    }
  }

  setLanguage(lang: Language): void {
    this.currentLanguageSubject.next(lang);
    localStorage.setItem('appLanguage', lang);
  }

  getCurrentLanguage(): Language {
    return this.currentLanguageSubject.value;
  }

  translate(key: string): string {
    const lang = this.currentLanguageSubject.value;
    return this.translations[lang][key] ?? key;
  }

  getTranslations(): Translations {
    const lang = this.currentLanguageSubject.value;
    return this.translations[lang];
  }
}