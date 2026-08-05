import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventarioagenComponent } from './inventarioagen.component';

describe('InventarioagenComponent', () => {
  let component: InventarioagenComponent;
  let fixture: ComponentFixture<InventarioagenComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InventarioagenComponent]
    });
    fixture = TestBed.createComponent(InventarioagenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
