import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevisionblComponent } from './revisionbl.component';

describe('RevisionblComponent', () => {
  let component: RevisionblComponent;
  let fixture: ComponentFixture<RevisionblComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RevisionblComponent]
    });
    fixture = TestBed.createComponent(RevisionblComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
