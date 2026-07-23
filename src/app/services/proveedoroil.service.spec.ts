import { TestBed } from '@angular/core/testing';

import { ProveedoroilService } from './proveedoroil.service';

describe('ProveedoroilService', () => {
  let service: ProveedoroilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProveedoroilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
