import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompraslocalesComponent } from './compraslocales.component';

describe('CompraslocalesComponent', () => {
  let component: CompraslocalesComponent;
  let fixture: ComponentFixture<CompraslocalesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CompraslocalesComponent]
    });
    fixture = TestBed.createComponent(CompraslocalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
