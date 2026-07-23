import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvusuariosComponent } from './invusuarios.component';

describe('InvusuariosComponent', () => {
  let component: InvusuariosComponent;
  let fixture: ComponentFixture<InvusuariosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvusuariosComponent]
    });
    fixture = TestBed.createComponent(InvusuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
