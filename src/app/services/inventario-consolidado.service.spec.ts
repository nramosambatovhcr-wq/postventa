import { TestBed } from '@angular/core/testing';

import { InventarioConsolidadoService } from './inventario-consolidado.service';

describe('InventarioConsolidadoService', () => {
  let service: InventarioConsolidadoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InventarioConsolidadoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
