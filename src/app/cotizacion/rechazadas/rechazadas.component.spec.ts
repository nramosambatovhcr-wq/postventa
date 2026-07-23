import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RechazadasComponent } from './rechazadas.component';

describe('RechazadasComponent', () => {
  let component: RechazadasComponent;
  let fixture: ComponentFixture<RechazadasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RechazadasComponent]
    });
    fixture = TestBed.createComponent(RechazadasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
