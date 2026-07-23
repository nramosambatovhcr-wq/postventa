import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidosbodproceComponent } from './pedidosbodproce.component';

describe('PedidosbodproceComponent', () => {
  let component: PedidosbodproceComponent;
  let fixture: ComponentFixture<PedidosbodproceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidosbodproceComponent]
    });
    fixture = TestBed.createComponent(PedidosbodproceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
