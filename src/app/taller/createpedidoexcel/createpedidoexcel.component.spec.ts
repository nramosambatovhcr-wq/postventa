import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatepedidoexcelComponent } from './createpedidoexcel.component';

describe('CreatepedidoexcelComponent', () => {
  let component: CreatepedidoexcelComponent;
  let fixture: ComponentFixture<CreatepedidoexcelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CreatepedidoexcelComponent]
    });
    fixture = TestBed.createComponent(CreatepedidoexcelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
