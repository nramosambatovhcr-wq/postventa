import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidosbodrevComponent } from './pedidosbodrev.component';

describe('PedidosbodrevComponent', () => {
  let component: PedidosbodrevComponent;
  let fixture: ComponentFixture<PedidosbodrevComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidosbodrevComponent]
    });
    fixture = TestBed.createComponent(PedidosbodrevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
