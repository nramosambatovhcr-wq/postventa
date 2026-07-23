import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventariopaqComponent } from './inventariopaq.component';

describe('InventariopaqComponent', () => {
  let component: InventariopaqComponent;
  let fixture: ComponentFixture<InventariopaqComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InventariopaqComponent]
    });
    fixture = TestBed.createComponent(InventariopaqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
