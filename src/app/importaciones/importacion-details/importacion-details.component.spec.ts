import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportacionDetailsComponent } from './importacion-details.component';

describe('ImportacionDetailsComponent', () => {
  let component: ImportacionDetailsComponent;
  let fixture: ComponentFixture<ImportacionDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ImportacionDetailsComponent]
    });
    fixture = TestBed.createComponent(ImportacionDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
