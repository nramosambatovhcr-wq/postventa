import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlvehiRevisionComponent } from './blvehi-revision.component';

describe('BlvehiRevisionComponent', () => {
  let component: BlvehiRevisionComponent;
  let fixture: ComponentFixture<BlvehiRevisionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlvehiRevisionComponent]
    });
    fixture = TestBed.createComponent(BlvehiRevisionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
