import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RespuestaproComponent } from './respuestapro.component';

describe('RespuestaproComponent', () => {
  let component: RespuestaproComponent;
  let fixture: ComponentFixture<RespuestaproComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RespuestaproComponent]
    });
    fixture = TestBed.createComponent(RespuestaproComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
