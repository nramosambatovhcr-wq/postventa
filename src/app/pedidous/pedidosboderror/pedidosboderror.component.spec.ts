import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidosboderrorComponent } from './pedidosboderror.component';

describe('PedidosboderrorComponent', () => {
  let component: PedidosboderrorComponent;
  let fixture: ComponentFixture<PedidosboderrorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidosboderrorComponent]
    });
    fixture = TestBed.createComponent(PedidosboderrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
