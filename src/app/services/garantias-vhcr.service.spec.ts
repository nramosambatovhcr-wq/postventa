import { TestBed } from '@angular/core/testing';

import { GarantiasVHCRService } from './garantias-vhcr.service';

describe('GarantiasVHCRService', () => {
  let service: GarantiasVHCRService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GarantiasVHCRService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
