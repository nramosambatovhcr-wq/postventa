import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlvehiComponent } from './blvehi.component';

describe('BlvehiComponent', () => {
  let component: BlvehiComponent;
  let fixture: ComponentFixture<BlvehiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlvehiComponent]
    });
    fixture = TestBed.createComponent(BlvehiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
