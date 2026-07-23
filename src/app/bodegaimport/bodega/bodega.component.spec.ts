import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BodegaComponent } from './bodega.component';

describe('BodegaComponent', () => {
  let component: BodegaComponent;
  let fixture: ComponentFixture<BodegaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BodegaComponent]
    });
    fixture = TestBed.createComponent(BodegaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
