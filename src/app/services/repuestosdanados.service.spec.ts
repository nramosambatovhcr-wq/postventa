import { TestBed } from '@angular/core/testing';

import { RepuestosdanadosService } from './repuestosdanados.service';

describe('RepuestosdanadosService', () => {
  let service: RepuestosdanadosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RepuestosdanadosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
