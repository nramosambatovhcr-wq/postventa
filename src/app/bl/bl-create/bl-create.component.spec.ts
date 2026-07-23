import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlCreateComponent } from './bl-create.component';

describe('BlCreateComponent', () => {
  let component: BlCreateComponent;
  let fixture: ComponentFixture<BlCreateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlCreateComponent]
    });
    fixture = TestBed.createComponent(BlCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
