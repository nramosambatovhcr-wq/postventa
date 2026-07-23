import { TestBed } from '@angular/core/testing';

import { ExtraccionBodService } from './extraccion-bod.service';

describe('ExtraccionBodService', () => {
  let service: ExtraccionBodService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExtraccionBodService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
