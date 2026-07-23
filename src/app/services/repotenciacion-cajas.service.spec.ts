import { TestBed } from '@angular/core/testing';

import { RepotenciacionCajasService } from './repotenciacion-cajas.service';

describe('RepotenciacionCajasService', () => {
  let service: RepotenciacionCajasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RepotenciacionCajasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
