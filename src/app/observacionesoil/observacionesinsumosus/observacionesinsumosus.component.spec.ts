import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservacionesinsumosusComponent } from './observacionesinsumosus.component';

describe('ObservacionesinsumosusComponent', () => {
  let component: ObservacionesinsumosusComponent;
  let fixture: ComponentFixture<ObservacionesinsumosusComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ObservacionesinsumosusComponent]
    });
    fixture = TestBed.createComponent(ObservacionesinsumosusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
