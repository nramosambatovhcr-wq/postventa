import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatepedidoComponent } from './createpedido.component';

describe('CreatepedidoComponent', () => {
  let component: CreatepedidoComponent;
  let fixture: ComponentFixture<CreatepedidoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CreatepedidoComponent]
    });
    fixture = TestBed.createComponent(CreatepedidoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
