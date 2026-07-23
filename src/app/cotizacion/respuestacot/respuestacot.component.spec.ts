import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RespuestacotComponent } from './respuestacot.component';

describe('RespuestacotComponent', () => {
  let component: RespuestacotComponent;
  let fixture: ComponentFixture<RespuestacotComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RespuestacotComponent]
    });
    fixture = TestBed.createComponent(RespuestacotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
