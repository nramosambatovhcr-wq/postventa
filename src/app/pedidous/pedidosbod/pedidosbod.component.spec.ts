import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidosbodComponent } from './pedidosbod.component';

describe('PedidosbodComponent', () => {
  let component: PedidosbodComponent;
  let fixture: ComponentFixture<PedidosbodComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidosbodComponent]
    });
    fixture = TestBed.createComponent(PedidosbodComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
