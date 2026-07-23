import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/**
 * Cliente SSE para avisos de conteos en tiempo real.
 * Abre un EventSource contra el backend y emite por 'avisos$' cada vez que
 * llega un "refresh" para la agencia+campaña suscrita.
 *
 * El navegador reconecta el EventSource solo cuando la pestaña vuelve a estar
 * activa, así que no programamos reconexión manual: solo abrir y cerrar.
 */
@Injectable({ providedIn: 'root' })
export class SseConteosService {

  // ⚠️ AJUSTA esta base para que apunte a tu API (la misma de InventarioService).
  private readonly baseUrl = 'https://bodega.vehicentro.com:1830/api/api/Inventario';

  private eventSource: EventSource | null = null;
  private readonly avisos = new Subject<void>();

  /** Se emite (sin datos) cada vez que el backend avisa "refresca". */
  get avisos$(): Observable<void> {
    return this.avisos.asObservable();
  }

  constructor(private ngZone: NgZone) {}

  /**
   * Abre la conexión SSE para una agencia+campaña.
   * Si ya había una abierta, la cierra antes (evita duplicados).
   */
  conectar(agenciaId: number, campanaId: number): void {
    this.desconectar();

    const url = `${this.baseUrl}/conteos-sse?agenciaId=${agenciaId}&campanaId=${campanaId}`;

    // EventSource vive fuera de la zona de Angular (igual que tu polling), para
    // no disparar detección de cambios en cada latido. Solo re-entramos a la
    // zona cuando de verdad hay que refrescar (lo hace el componente con ngZone.run).
    this.ngZone.runOutsideAngular(() => {
      try {
        this.eventSource = new EventSource(url);

        this.eventSource.addEventListener('conteo', () => {
          this.avisos.next();
        });

        // El backend manda "ping" cada 20s para mantener viva la conexión.
        // No hacemos nada con él; solo evita que proxies corten por inactividad.
        this.eventSource.addEventListener('ping', () => { /* keep-alive */ });

        this.eventSource.onerror = () => {
          // El navegador reintenta solo. No cerramos aquí para no romper esa
          // reconexión automática. Si la pestaña está oculta, se pausa y al
          // volver reconecta. El poll de seguridad del componente cubre el hueco.
        };
      } catch {
        // Si el navegador no soporta EventSource (muy raro hoy), el componente
        // sigue funcionando solo con su poll de seguridad.
        this.eventSource = null;
      }
    });
  }

  /** Cierra la conexión SSE (al destruir el componente o cambiar de agencia). */
  desconectar(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}