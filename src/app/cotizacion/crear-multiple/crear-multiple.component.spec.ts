import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearMultipleComponent } from './crear-multiple.component';

describe('CrearMultipleComponent', () => {
  let component: CrearMultipleComponent;
  let fixture: ComponentFixture<CrearMultipleComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CrearMultipleComponent]
    });
    fixture = TestBed.createComponent(CrearMultipleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
