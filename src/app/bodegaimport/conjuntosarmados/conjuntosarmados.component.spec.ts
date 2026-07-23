import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConjuntosarmadosComponent } from './conjuntosarmados.component';

describe('ConjuntosarmadosComponent', () => {
  let component: ConjuntosarmadosComponent;
  let fixture: ComponentFixture<ConjuntosarmadosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConjuntosarmadosComponent]
    });
    fixture = TestBed.createComponent(ConjuntosarmadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
