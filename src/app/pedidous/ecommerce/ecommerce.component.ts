import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { FormControl } from '@angular/forms';
import {
  InventarioSimplificadoDto,
  InventarioConsolidadoService,
  ImagenUnificada
} from 'src/app/services/inventario-consolidado.service';

export interface CartItem {
  articulo: InventarioSimplificadoDto;
  cantidad: number;
}

type CampoMonitoreado = 'stockTotal' | 'stockReservado' | 'stockDisponible'
                      | 'precioSinIva' | 'precioConIva' | 'agenciasConDisponible';

const CAMPOS: CampoMonitoreado[] = [
  'stockTotal', 'stockReservado', 'stockDisponible',
  'precioSinIva', 'precioConIva', 'agenciasConDisponible'
];

@Component({
  selector: 'app-ecommerce',
  templateUrl: './ecommerce.component.html',
  styleUrls: ['./ecommerce.component.css']
})
export class EcommerceComponent implements OnInit, OnDestroy {

  /* ── Estado principal ── */
  items: InventarioSimplificadoDto[]          = [];
  itemsFiltrados: InventarioSimplificadoDto[] = [];
  cargando = false;
  error    = '';

  /* ── Filtros ── */
  searchCtrl = new FormControl('');
  claseCtrl  = new FormControl('');
  grupoCtrl  = new FormControl('');
  soloStock  = false;
  clases: string[] = [];
  grupos: string[] = [];

  /* ── Paginación ── */
  paginaActual       = 1;
  registrosPorPagina = 500;
  get totalPaginas() { return Math.ceil(this.itemsFiltrados.length / this.registrosPorPagina); }
  get itemsPagina() {
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    return this.itemsFiltrados.slice(inicio, inicio + this.registrosPorPagina);
  }
  get paginas(): number[] {
    const delta = 2, rango: number[] = [];
    for (let i = Math.max(1, this.paginaActual - delta); i <= Math.min(this.totalPaginas, this.paginaActual + delta); i++) rango.push(i);
    return rango;
  }

  /* ── Carrito ── */
  carrito: CartItem[] = [];
  carritoAbierto      = false;
  get totalCarrito()    { return this.carrito.reduce((s, i) => s + i.cantidad * i.articulo.precioConIva, 0); }
  get cantidadCarrito() { return this.carrito.reduce((s, i) => s + i.cantidad, 0); }

  /* ── Modal detalle ── */
  itemDetalle: InventarioSimplificadoDto | null = null;

  /* ── IMÁGENES MODAL ── */
  imagenesDetalle: ImagenUnificada[] = [];
  cargandoImagenes = false;
  imagenActivaIdx  = 0;
  imagenError      = false;

  get imagenActiva(): ImagenUnificada | null {
    return this.imagenesDetalle[this.imagenActivaIdx] ?? null;
  }

  /* ════════════════════════════════════════
     IMÁGENES EN CARDS (slide on hover)
     Cache compartido con el modal.
  ════════════════════════════════════════ */

  /** codigoArticulo → lista de imágenes (undefined = no pedida aún; [] = sin fotos) */
  imagenCache  = new Map<string, ImagenUnificada[]>();

  /** codigoArticulo → índice visible en la card */
  cardSlideIdx = new Map<string, number>();

  /** codigoArticulo → true mientras carga por primera vez */
  cardCargando = new Map<string, boolean>();

  private slideTimers = new Map<string, ReturnType<typeof setInterval>>();

  /* ── Helpers de card ── */
  getCardImagenUrl(codigo: string): string | null {
    const imgs = this.imagenCache.get(codigo);
    if (!imgs?.length) return null;
    return imgs[this.cardSlideIdx.get(codigo) ?? 0]?.url ?? null;
  }

  getCardImageCount(codigo: string): number {
    return this.imagenCache.get(codigo)?.length ?? 0;
  }

  getCardSlideIdx(codigo: string): number {
    return this.cardSlideIdx.get(codigo) ?? 0;
  }

  isCardCargando(codigo: string): boolean {
    return this.cardCargando.get(codigo) ?? false;
  }

  /** Hover enter: carga imágenes (si no están) y arranca el auto-slide */
  onCardHoverEnter(codigo: string): void {
    const cached = this.imagenCache.get(codigo);

    if (cached === undefined) {
      // Primera vez — pedir al backend
      this.cardCargando.set(codigo, true);

      this.svc.getImagenesPorCodigo(this.normalizarCodigoImagen(codigo))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (resp) => {
            const lista = resp?.imagenes ?? [];
            this.imagenCache.set(codigo, lista);
            this.cardSlideIdx.set(codigo, 0);
            this.cardCargando.set(codigo, false);
            if (lista.length > 1) this.iniciarSlideCard(codigo);
            this.cdr.markForCheck();
          },
          error: () => {
            this.imagenCache.set(codigo, []);
            this.cardCargando.set(codigo, false);
            this.cdr.markForCheck();
          }
        });

    } else if (cached.length > 1) {
      // Ya en cache con múltiples fotos — solo arrancar slide
      this.iniciarSlideCard(codigo);
    }
  }

  /** Hover leave: para el slide y vuelve al índice 0 */
  onCardHoverLeave(codigo: string): void {
    this.pararSlideCard(codigo);
    this.cardSlideIdx.set(codigo, 0);
    this.cdr.markForCheck();
  }

  private iniciarSlideCard(codigo: string): void {
    this.pararSlideCard(codigo);
    const timer = setInterval(() => {
      const imgs = this.imagenCache.get(codigo);
      if (!imgs || imgs.length < 2) { this.pararSlideCard(codigo); return; }
      const actual = this.cardSlideIdx.get(codigo) ?? 0;
      this.cardSlideIdx.set(codigo, (actual + 1) % imgs.length);
      this.cdr.markForCheck();
    }, 1200);
    this.slideTimers.set(codigo, timer);
  }

  private pararSlideCard(codigo: string): void {
    const t = this.slideTimers.get(codigo);
    if (t) { clearInterval(t); this.slideTimers.delete(codigo); }
  }

  /* ── POLLING & DIFF ── */
  readonly POLL_INTERVAL_MS = 30_000;
  camposCambiados  = new Map<string, Set<CampoMonitoreado>>();
  ultimaActualizacion: Date | null = null;
  cambiosUltimoCiclo  = 0;
  autoRefreshActivo   = true;
  mostrarBannerCambios = false;
  countdownPct = 100;

  private destroy$        = new Subject<void>();
  private stopPoll$       = new Subject<void>();
  private countdownTimer?: ReturnType<typeof setInterval>;
  private countdownStart  = Date.now();
  private highlightTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private svc: InventarioConsolidadoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarInicial();

    this.searchCtrl.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.paginaActual = 1; this.aplicarFiltros(); });
    this.claseCtrl.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.paginaActual = 1; this.aplicarFiltros(); });
    this.grupoCtrl.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.paginaActual = 1; this.aplicarFiltros(); });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.pararCountdown();
    this.highlightTimers.forEach(t => clearTimeout(t));
    this.slideTimers.forEach(t => clearInterval(t));
  }

  cargarInicial() {
    this.cargando = true;
    this.error    = '';
    this.pararPoll();

    this.svc.getSimplificado({ soloConStock: this.soloStock, registrosPorPagina: -1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.items               = resp.data;
          this.clases              = [...new Set(resp.data.map(i => i.clase).filter(Boolean))].sort();
          this.grupos              = [...new Set(resp.data.map(i => i.grupo).filter(Boolean))].sort();
          this.cargando            = false;
          this.ultimaActualizacion = new Date();
          this.aplicarFiltros();
          this.iniciarPoll();
        },
        error: (err) => {
          this.error    = 'No se pudo cargar el inventario.';
          this.cargando = false;
          console.error(err);
        }
      });
  }

  private iniciarPoll() {
    if (!this.autoRefreshActivo) return;
    this.pararPoll();
    this.iniciarCountdown();

    interval(this.POLL_INTERVAL_MS).pipe(
      takeUntil(this.stopPoll$),
      takeUntil(this.destroy$),
      switchMap(() =>
        this.svc.getSimplificado({ soloConStock: this.soloStock, registrosPorPagina: -1 })
          .pipe(catchError(err => { console.warn('Poll error:', err); return of(null); }))
      )
    ).subscribe(resp => {
      if (!resp) return;
      this.aplicarDiff(resp.data);
      this.ultimaActualizacion = new Date();
      this.resetCountdown();
      this.cdr.markForCheck();
    });
  }

  private pararPoll() { this.stopPoll$.next(); this.pararCountdown(); }

  private aplicarDiff(nuevos: InventarioSimplificadoDto[]) {
    const mapaActual = new Map(this.items.map(i => [i.codigoArticulo, i]));
    const mapaNuevos = new Map(nuevos.map(i => [i.codigoArticulo, i]));
    let totalCambios = 0;

    mapaActual.forEach((actual, codigo) => {
      const nuevo = mapaNuevos.get(codigo);
      if (!nuevo) return;
      const camposModificados = new Set<CampoMonitoreado>();
      CAMPOS.forEach(campo => {
        if (actual[campo] !== nuevo[campo]) {
          (actual as any)[campo] = nuevo[campo];
          camposModificados.add(campo);
          totalCambios++;
        }
      });
      if (camposModificados.size > 0) {
        const existente = this.camposCambiados.get(codigo) ?? new Set<CampoMonitoreado>();
        camposModificados.forEach(c => existente.add(c));
        this.camposCambiados.set(codigo, existente);
        const prev = this.highlightTimers.get(codigo);
        if (prev) clearTimeout(prev);
        const tid = setTimeout(() => {
          this.camposCambiados.delete(codigo);
          this.highlightTimers.delete(codigo);
          this.cdr.markForCheck();
        }, 3500);
        this.highlightTimers.set(codigo, tid);
      }
    });

    mapaNuevos.forEach((nuevo, codigo) => {
      if (!mapaActual.has(codigo)) { this.items.push(nuevo); totalCambios++; }
    });

    if (this.soloStock) {
      this.items = this.items.filter(i => mapaNuevos.has(i.codigoArticulo));
    }

    this.cambiosUltimoCiclo = totalCambios;
    if (totalCambios > 0) { this.aplicarFiltros(); this.mostrarBanner(); }
  }

  private mostrarBanner() {
    this.mostrarBannerCambios = true;
    setTimeout(() => { this.mostrarBannerCambios = false; this.cdr.markForCheck(); }, 4000);
  }

  private iniciarCountdown() {
    this.pararCountdown();
    this.countdownStart = Date.now();
    this.countdownPct   = 100;
    this.countdownTimer = setInterval(() => {
      const elapsed     = Date.now() - this.countdownStart;
      this.countdownPct = Math.max(0, 100 - (elapsed / this.POLL_INTERVAL_MS) * 100);
      this.cdr.markForCheck();
    }, 500);
  }
  private resetCountdown() { this.countdownStart = Date.now(); this.countdownPct = 100; }
  private pararCountdown() { if (this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = undefined; } }

  toggleAutoRefresh() {
    this.autoRefreshActivo = !this.autoRefreshActivo;
    if (this.autoRefreshActivo) this.iniciarPoll(); else this.pararPoll();
  }
  refrescarAhora()  { this.cargarInicial(); }
  toggleSoloStock() { this.soloStock = !this.soloStock; this.cargarInicial(); }

  aplicarFiltros() {
    const texto    = (this.searchCtrl.value ?? '').toLowerCase().trim();
    const clase    = this.claseCtrl.value ?? '';
    const grupo    = this.grupoCtrl.value ?? '';
    const palabras = texto ? texto.split(/\s+/) : [];

    /**
     * Normaliza un string eliminando /, -, . y espacios
     * Permite que "WG9925720019" encuentre "WG9925720019/4"
     *         que "0446"         encuentre "KIT-0446"
     *         que "kit 0446"     encuentre "KIT FILTROS 0446/A"
     */
    const normalizar  = (s: string) => s.toLowerCase().replace(/[\s/\-.]/g, '');
    const textoNorm   = normalizar(texto);
    // Palabras normalizadas para multi-palabra sobre códigos con caracteres especiales
    const palabrasNorm = palabras.map(p => normalizar(p));

    this.itemsFiltrados = this.items.filter(i => {
      if (palabras.length === 0) {
        return (!clase || i.clase === clase) && (!grupo || i.grupo === grupo);
      }

      const haystack     = `${i.codigoArticulo} ${i.descripcion}`.toLowerCase();
      const haystackNorm = normalizar(`${i.codigoArticulo} ${i.descripcion}`);

      const coincideTexto =
        // Opción A — búsqueda normal: todas las palabras en el texto original
        palabras.every(p => haystack.includes(p)) ||
        // Opción B — búsqueda normalizada multi-palabra: ignora /, -, .
        // "WG9925720019" encuentra "WG9925720019/4" → norm: "wg9925720019" ⊂ "wg99257200194"
        // "kit 0446"     encuentra "KIT-0446/A"     → ambas palabras norm presentes
        palabrasNorm.every(p => haystackNorm.includes(p));

      return coincideTexto &&
             (!clase || i.clase === clase) &&
             (!grupo || i.grupo === grupo);
    });
  }

  limpiarFiltros() { this.searchCtrl.setValue(''); this.claseCtrl.setValue(''); this.grupoCtrl.setValue(''); }

  irPagina(p: number) {
    if (p >= 1 && p <= this.totalPaginas) { this.paginaActual = p; window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  campoCambio(codigo: string, campo: CampoMonitoreado): boolean {
    return this.camposCambiados.get(codigo)?.has(campo) ?? false;
  }

  agregarAlCarrito(item: InventarioSimplificadoDto, cantidad = 1) {
    const existente = this.carrito.find(c => c.articulo.codigoArticulo === item.codigoArticulo);
    if (existente) existente.cantidad += cantidad;
    else this.carrito.push({ articulo: item, cantidad });
    this.carritoAbierto = true;
  }
  cambiarCantidad(item: CartItem, delta: number) {
    item.cantidad += delta;
    if (item.cantidad <= 0) this.removerDelCarrito(item.articulo.codigoArticulo);
  }
  removerDelCarrito(codigo: string) { this.carrito = this.carrito.filter(c => c.articulo.codigoArticulo !== codigo); }
  limpiarCarrito() { this.carrito = []; }

  abrirDetalle(item: InventarioSimplificadoDto) {
    this.itemDetalle      = item;
    this.imagenActivaIdx  = 0;
    this.imagenError      = false;
    document.body.style.overflow = 'hidden';

    // Reutiliza cache compartido con las cards
    const cached = this.imagenCache.get(item.codigoArticulo);
    if (cached !== undefined) {
      this.imagenesDetalle  = cached;
      this.cargandoImagenes = false;
      return;
    }

    this.cargandoImagenes = true;
    this.imagenesDetalle  = [];

    this.svc.getImagenesPorCodigo(this.normalizarCodigoImagen(item.codigoArticulo))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          const lista = resp?.imagenes ?? [];
          this.imagenesDetalle = lista;
          this.imagenCache.set(item.codigoArticulo, lista);
          this.cargandoImagenes = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.imagenesDetalle  = [];
          this.cargandoImagenes = false;
          this.cdr.markForCheck();
        }
      });
  }

  cerrarDetalle() {
    this.itemDetalle     = null;
    this.imagenesDetalle = [];
    this.imagenActivaIdx = 0;
    document.body.style.overflow = '';
  }

  imagenSiguiente() {
    if (this.imagenesDetalle.length < 2) return;
    this.imagenError     = false;
    this.imagenActivaIdx = (this.imagenActivaIdx + 1) % this.imagenesDetalle.length;
  }

  imagenAnterior() {
    if (this.imagenesDetalle.length < 2) return;
    this.imagenError     = false;
    this.imagenActivaIdx = (this.imagenActivaIdx - 1 + this.imagenesDetalle.length) % this.imagenesDetalle.length;
  }

  irAImagen(idx: number) { this.imagenError = false; this.imagenActivaIdx = idx; }
  onImagenError() { this.imagenError = true; }

  getColorGradient(codigo: string): string {
    let hash = 0;
    for (let i = 0; i < codigo.length; i++) hash = codigo.charCodeAt(i) + ((hash << 5) - hash);
    const h1 = Math.abs(hash % 360);
    return `linear-gradient(135deg, hsl(${h1},55%,25%), hsl(${(h1+40)%360},60%,18%))`;
  }

  getIniciales(codigo: string): string { return codigo.replace(/[^A-Z0-9]/gi,'').substring(0,3).toUpperCase(); }

  /**
   * Normaliza el código para buscar imágenes en el backend.
   *
   * Casos manejados:
   *  • Lynk & Co  → inventario usa "LC-1234567" / "LC1234567"
   *                  imágenes guardadas como       "1234567"
   *  • Sinotruk   → inventario usa "S10016073"
   *                  imágenes guardadas como       "10016073"
   *                  (solo se elimina la S cuando va seguida de dígitos)
   *
   * Cualquier otro código (WG..., KIT-..., etc.) se mantiene igual.
   */
  private normalizarCodigoImagen(codigo: string): string {
    // Lynk & Co: quita "LC" o "LC-" al inicio
    if (/^LC[-\s]*/i.test(codigo)) {
      return codigo.replace(/^LC[-\s]*/i, '');
    }
    // Sinotruk: quita la "S" inicial solo si va seguida de dígitos (ej: S10016073)
    if (/^S\d/i.test(codigo)) {
      return codigo.replace(/^S/i, '');
    }
    return codigo;
  }

  getAgencias(agencias: string): { nombre: string; cantidad: number }[] {
    if (!agencias) return [];
    return agencias.split('|').map(a => {
      const p = a.trim().split(':');
      return { nombre: p[0]?.trim() ?? '', cantidad: parseFloat(p[1]?.trim() ?? '0') || 0 };
    }).filter(a => a.nombre);
  }

  stockLabel(s: number): string { return s <= 0 ? 'Sin stock' : s <= 5 ? 'Últimas unidades' : s <= 20 ? 'Stock limitado' : 'Disponible'; }
  stockClass(s: number): string { return s <= 0 ? 'badge-danger' : s <= 5 ? 'badge-warning' : s <= 20 ? 'badge-info' : 'badge-success'; }

  get tiempoDesdeActualizacion(): string {
    if (!this.ultimaActualizacion) return '—';
    const segs = Math.floor((Date.now() - this.ultimaActualizacion.getTime()) / 1000);
    return segs < 60 ? `hace ${segs}s` : `hace ${Math.floor(segs/60)}m`;
  }
}