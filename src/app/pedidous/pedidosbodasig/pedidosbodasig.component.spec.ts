import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidosbodasigComponent } from './pedidosbodasig.component';

describe('PedidosbodasigComponent', () => {
  let component: PedidosbodasigComponent;
  let fixture: ComponentFixture<PedidosbodasigComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidosbodasigComponent]
    });
    fixture = TestBed.createComponent(PedidosbodasigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
