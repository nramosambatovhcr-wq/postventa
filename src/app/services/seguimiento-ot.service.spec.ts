import { TestBed } from '@angular/core/testing';

import { SeguimientoOtService } from './seguimiento-ot.service';

describe('SeguimientoOtService', () => {
  let service: SeguimientoOtService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeguimientoOtService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
