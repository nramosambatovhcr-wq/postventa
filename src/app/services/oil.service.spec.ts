import { TestBed } from '@angular/core/testing';

import { OilService } from './oil.service';

describe('OilService', () => {
  let service: OilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
