import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidotallerComponent } from './pedidotaller.component';

describe('PedidotallerComponent', () => {
  let component: PedidotallerComponent;
  let fixture: ComponentFixture<PedidotallerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidotallerComponent]
    });
    fixture = TestBed.createComponent(PedidotallerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
