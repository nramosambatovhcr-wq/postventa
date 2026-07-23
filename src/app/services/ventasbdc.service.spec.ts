import { TestBed } from '@angular/core/testing';

import { VentasbdcService } from './ventasbdc.service';

describe('VentasbdcService', () => {
  let service: VentasbdcService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VentasbdcService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
