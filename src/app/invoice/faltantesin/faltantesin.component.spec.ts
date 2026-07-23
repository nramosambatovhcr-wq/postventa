import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FaltantesinComponent } from './faltantesin.component';

describe('FaltantesinComponent', () => {
  let component: FaltantesinComponent;
  let fixture: ComponentFixture<FaltantesinComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FaltantesinComponent]
    });
    fixture = TestBed.createComponent(FaltantesinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
