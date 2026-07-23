import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompralocalesComponent } from './compralocales.component';

describe('CompralocalesComponent', () => {
  let component: CompralocalesComponent;
  let fixture: ComponentFixture<CompralocalesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CompralocalesComponent]
    });
    fixture = TestBed.createComponent(CompralocalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
