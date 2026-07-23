import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlpedusComponent } from './blpedus.component';

describe('BlpedusComponent', () => {
  let component: BlpedusComponent;
  let fixture: ComponentFixture<BlpedusComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlpedusComponent]
    });
    fixture = TestBed.createComponent(BlpedusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
