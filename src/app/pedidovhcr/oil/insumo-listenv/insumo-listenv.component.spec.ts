import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsumoListenvComponent } from './insumo-listenv.component';

describe('InsumoListenvComponent', () => {
  let component: InsumoListenvComponent;
  let fixture: ComponentFixture<InsumoListenvComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InsumoListenvComponent]
    });
    fixture = TestBed.createComponent(InsumoListenvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
