import { TestBed } from '@angular/core/testing';

import { PlanmantenimientoService } from './planmantenimiento.service';

describe('PlanmantenimientoService', () => {
  let service: PlanmantenimientoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanmantenimientoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
