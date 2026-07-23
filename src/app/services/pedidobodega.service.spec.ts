import { TestBed } from '@angular/core/testing';

import { PedidobodegaService } from './pedidobodega.service';

describe('PedidobodegaService', () => {
  let service: PedidobodegaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PedidobodegaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
