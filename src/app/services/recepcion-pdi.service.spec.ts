import { TestBed } from '@angular/core/testing';

import { RecepcionPdiService } from './recepcion-pdi.service';

describe('RecepcionPdiService', () => {
  let service: RecepcionPdiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecepcionPdiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
