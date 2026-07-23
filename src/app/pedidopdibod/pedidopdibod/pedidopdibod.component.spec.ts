import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidopdibodComponent } from './pedidopdibod.component';

describe('PedidopdibodComponent', () => {
  let component: PedidopdibodComponent;
  let fixture: ComponentFixture<PedidopdibodComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidopdibodComponent]
    });
    fixture = TestBed.createComponent(PedidopdibodComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
