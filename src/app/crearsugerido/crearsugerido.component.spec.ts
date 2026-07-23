import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearsugeridoComponent } from './crearsugerido.component';

describe('CrearsugeridoComponent', () => {
  let component: CrearsugeridoComponent;
  let fixture: ComponentFixture<CrearsugeridoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CrearsugeridoComponent]
    });
    fixture = TestBed.createComponent(CrearsugeridoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
