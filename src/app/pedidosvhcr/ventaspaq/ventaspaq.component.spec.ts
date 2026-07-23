import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VentaspaqComponent } from './ventaspaq.component';

describe('VentaspaqComponent', () => {
  let component: VentaspaqComponent;
  let fixture: ComponentFixture<VentaspaqComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VentaspaqComponent]
    });
    fixture = TestBed.createComponent(VentaspaqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
