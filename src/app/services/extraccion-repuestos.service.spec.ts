import { TestBed } from '@angular/core/testing';

import { ExtraccionRepuestosService } from './extraccion-repuestos.service';

describe('ExtraccionRepuestosService', () => {
  let service: ExtraccionRepuestosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExtraccionRepuestosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
