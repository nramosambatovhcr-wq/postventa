import { TestBed } from '@angular/core/testing';

import { InvioceblService } from './inviocebl.service';

describe('InvioceblService', () => {
  let service: InvioceblService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InvioceblService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
