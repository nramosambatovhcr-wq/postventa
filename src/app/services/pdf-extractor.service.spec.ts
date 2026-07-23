import { TestBed } from '@angular/core/testing';

import { PdfExtractorService } from './pdf-extractor.service';

describe('PdfExtractorService', () => {
  let service: PdfExtractorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfExtractorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
