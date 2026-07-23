import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsumoCreateComponent } from './insumo-create.component';

describe('InsumoCreateComponent', () => {
  let component: InsumoCreateComponent;
  let fixture: ComponentFixture<InsumoCreateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InsumoCreateComponent]
    });
    fixture = TestBed.createComponent(InsumoCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
