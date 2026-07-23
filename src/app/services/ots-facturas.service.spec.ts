import { TestBed } from '@angular/core/testing';

import { OtsFacturasService } from './ots-facturas.service';

describe('OtsFacturasService', () => {
  let service: OtsFacturasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OtsFacturasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
