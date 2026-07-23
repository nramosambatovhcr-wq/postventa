import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecepcionComponent } from './recepcion.component';

describe('RecepcionComponent', () => {
  let component: RecepcionComponent;
  let fixture: ComponentFixture<RecepcionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RecepcionComponent]
    });
    fixture = TestBed.createComponent(RecepcionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
