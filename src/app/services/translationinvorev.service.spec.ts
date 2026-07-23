import { TestBed } from '@angular/core/testing';

import { TranslationinvorevService } from './translationinvorev.service';

describe('TranslationinvorevService', () => {
  let service: TranslationinvorevService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TranslationinvorevService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
