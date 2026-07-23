import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlprocreateexcelComponent } from './blprocreateexcel.component';

describe('BlprocreateexcelComponent', () => {
  let component: BlprocreateexcelComponent;
  let fixture: ComponentFixture<BlprocreateexcelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BlprocreateexcelComponent]
    });
    fixture = TestBed.createComponent(BlprocreateexcelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
