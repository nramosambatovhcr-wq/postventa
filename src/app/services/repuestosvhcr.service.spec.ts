import { TestBed } from '@angular/core/testing';

import { RepuestosvhcrService } from './repuestosvhcr.service';

describe('RepuestosvhcrService', () => {
  let service: RepuestosvhcrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RepuestosvhcrService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
