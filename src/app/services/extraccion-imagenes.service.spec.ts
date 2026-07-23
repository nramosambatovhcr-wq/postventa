import { TestBed } from '@angular/core/testing';

import { ExtraccionImagenesService } from './extraccion-imagenes.service';

describe('ExtraccionImagenesService', () => {
  let service: ExtraccionImagenesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExtraccionImagenesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
