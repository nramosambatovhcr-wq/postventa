import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidopdiexcelComponent } from './pedidopdiexcel.component';

describe('PedidopdiexcelComponent', () => {
  let component: PedidopdiexcelComponent;
  let fixture: ComponentFixture<PedidopdiexcelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PedidopdiexcelComponent]
    });
    fixture = TestBed.createComponent(PedidopdiexcelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
