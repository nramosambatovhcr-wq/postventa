import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportEditComponent } from './import-edit.component';

describe('ImportEditComponent', () => {
  let component: ImportEditComponent;
  let fixture: ComponentFixture<ImportEditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ImportEditComponent]
    });
    fixture = TestBed.createComponent(ImportEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
