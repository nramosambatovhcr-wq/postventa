import { TestBed } from '@angular/core/testing';

import { ConjuntosArmadosService } from './conjuntos-armados.service';

describe('ConjuntosArmadosService', () => {
  let service: ConjuntosArmadosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConjuntosArmadosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
