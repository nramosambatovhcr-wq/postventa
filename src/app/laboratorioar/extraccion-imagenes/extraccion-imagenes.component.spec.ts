import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtraccionImagenesComponent } from './extraccion-imagenes.component';

describe('ExtraccionImagenesComponent', () => {
  let component: ExtraccionImagenesComponent;
  let fixture: ComponentFixture<ExtraccionImagenesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExtraccionImagenesComponent]
    });
    fixture = TestBed.createComponent(ExtraccionImagenesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
