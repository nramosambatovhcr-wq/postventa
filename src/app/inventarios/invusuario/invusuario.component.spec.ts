import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvusuarioComponent } from './invusuario.component';

describe('InvusuarioComponent', () => {
  let component: InvusuarioComponent;
  let fixture: ComponentFixture<InvusuarioComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvusuarioComponent]
    });
    fixture = TestBed.createComponent(InvusuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
