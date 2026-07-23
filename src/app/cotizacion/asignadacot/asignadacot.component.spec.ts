import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsignadacotComponent } from './asignadacot.component';

describe('AsignadacotComponent', () => {
  let component: AsignadacotComponent;
  let fixture: ComponentFixture<AsignadacotComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AsignadacotComponent]
    });
    fixture = TestBed.createComponent(AsignadacotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
