import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OilPedidosComponent } from './oil-pedidos.component';

describe('OilPedidosComponent', () => {
  let component: OilPedidosComponent;
  let fixture: ComponentFixture<OilPedidosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OilPedidosComponent]
    });
    fixture = TestBed.createComponent(OilPedidosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
