import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentoUploadComponent } from './documento-upload.component';

describe('DocumentoUploadComponent', () => {
  let component: DocumentoUploadComponent;
  let fixture: ComponentFixture<DocumentoUploadComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DocumentoUploadComponent]
    });
    fixture = TestBed.createComponent(DocumentoUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
