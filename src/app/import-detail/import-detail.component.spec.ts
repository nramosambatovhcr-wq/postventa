import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportDetailComponent } from './import-detail.component';

describe('ImportDetailComponent', () => {
  let component: ImportDetailComponent;
  let fixture: ComponentFixture<ImportDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ImportDetailComponent]
    });
    fixture = TestBed.createComponent(ImportDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
