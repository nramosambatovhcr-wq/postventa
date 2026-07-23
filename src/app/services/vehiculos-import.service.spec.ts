import { TestBed } from '@angular/core/testing';

import { VehiculosImportService } from './vehiculos-import.service';

describe('VehiculosImportService', () => {
  let service: VehiculosImportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VehiculosImportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
