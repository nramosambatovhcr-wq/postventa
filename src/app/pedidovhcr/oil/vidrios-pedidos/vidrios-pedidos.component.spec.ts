import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VidriosPedidosComponent } from './vidrios-pedidos.component';

describe('VidriosPedidosComponent', () => {
  let component: VidriosPedidosComponent;
  let fixture: ComponentFixture<VidriosPedidosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VidriosPedidosComponent]
    });
    fixture = TestBed.createComponent(VidriosPedidosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
