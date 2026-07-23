import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImagecacheService {
private cache = new Map<string, string>();
  private loadingImages = new Map<string, Promise<string>>();

  constructor() {}

  async getImage(url: string): Promise<string> {
    // Si ya está en caché, devolverla inmediatamente
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // Si ya se está cargando, esperar esa promesa
    if (this.loadingImages.has(url)) {
      return this.loadingImages.get(url)!;
    }

    // Crear nueva promesa de carga
    const loadPromise = this.loadImage(url);
    this.loadingImages.set(url, loadPromise);

    try {
      const result = await loadPromise;
      this.cache.set(url, result);
      return result;
    } finally {
      this.loadingImages.delete(url);
    }
  }

  private async loadImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  preloadImages(urls: string[]): void {
    urls.forEach(url => this.getImage(url).catch(() => {}));
  }
}