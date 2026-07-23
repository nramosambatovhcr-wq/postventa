import { TestBed } from '@angular/core/testing';

import { FechasOrdenService } from './fechas-orden.service';

describe('FechasOrdenService', () => {
  let service: FechasOrdenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FechasOrdenService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
