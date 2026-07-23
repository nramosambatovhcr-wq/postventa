import { TestBed } from '@angular/core/testing';

import { TransferenciaArmadoService } from './transferencia-armado.service';

describe('TransferenciaArmadoService', () => {
  let service: TransferenciaArmadoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransferenciaArmadoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
