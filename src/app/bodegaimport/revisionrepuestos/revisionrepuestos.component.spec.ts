import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevisionrepuestosComponent } from './revisionrepuestos.component';

describe('RevisionrepuestosComponent', () => {
  let component: RevisionrepuestosComponent;
  let fixture: ComponentFixture<RevisionrepuestosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RevisionrepuestosComponent]
    });
    fixture = TestBed.createComponent(RevisionrepuestosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
