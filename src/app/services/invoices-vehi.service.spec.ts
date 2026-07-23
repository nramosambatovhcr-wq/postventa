import { TestBed } from '@angular/core/testing';

import { InvoicesVehiService } from './invoices-vehi.service';

describe('InvoicesVehiService', () => {
  let service: InvoicesVehiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InvoicesVehiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
