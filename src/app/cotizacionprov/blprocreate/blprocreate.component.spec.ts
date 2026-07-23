import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlprocreateComponent } from './blprocreate.component';

describe('BlprocreateComponent', () => {
  let component: BlprocreateComponent;
  let fixture: ComponentFixture<BlprocreateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlprocreateComponent]
    });
    fixture = TestBed.createComponent(BlprocreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
