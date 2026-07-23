import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoproasignadaComponent } from './invoproasignada.component';

describe('InvoproasignadaComponent', () => {
  let component: InvoproasignadaComponent;
  let fixture: ComponentFixture<InvoproasignadaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvoproasignadaComponent]
    });
    fixture = TestBed.createComponent(InvoproasignadaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
