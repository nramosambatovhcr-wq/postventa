import { TestBed } from '@angular/core/testing';

import { VehiceService } from './vehice.service';

describe('VehiceService', () => {
  let service: VehiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VehiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
