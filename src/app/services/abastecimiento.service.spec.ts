import { TestBed } from '@angular/core/testing';

import { AbastecimientoService } from './abastecimiento.service';

describe('AbastecimientoService', () => {
  let service: AbastecimientoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AbastecimientoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
