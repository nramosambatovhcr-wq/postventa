import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecepcionplantaensamComponent } from './recepcionplantaensam.component';

describe('RecepcionplantaensamComponent', () => {
  let component: RecepcionplantaensamComponent;
  let fixture: ComponentFixture<RecepcionplantaensamComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RecepcionplantaensamComponent]
    });
    fixture = TestBed.createComponent(RecepcionplantaensamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
