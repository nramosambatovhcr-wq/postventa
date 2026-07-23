import { TestBed } from '@angular/core/testing';

import { FechasBlService } from './fechas-bl.service';

describe('FechasBlService', () => {
  let service: FechasBlService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FechasBlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
