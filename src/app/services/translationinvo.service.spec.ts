import { TestBed } from '@angular/core/testing';

import { TranslationinvoService } from './translationinvo.service';

describe('TranslationinvoService', () => {
  let service: TranslationinvoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TranslationinvoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
