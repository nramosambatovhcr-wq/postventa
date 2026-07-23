import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialbajasComponent } from './historialbajas.component';

describe('HistorialbajasComponent', () => {
  let component: HistorialbajasComponent;
  let fixture: ComponentFixture<HistorialbajasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HistorialbajasComponent]
    });
    fixture = TestBed.createComponent(HistorialbajasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
