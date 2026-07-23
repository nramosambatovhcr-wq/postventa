import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidopdiComponent } from './pedidopdi.component';

describe('PedidopdiComponent', () => {
  let component: PedidopdiComponent;
  let fixture: ComponentFixture<PedidopdiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidopdiComponent]
    });
    fixture = TestBed.createComponent(PedidopdiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
