import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsariosbiComponent } from './usariosbi.component';

describe('UsariosbiComponent', () => {
  let component: UsariosbiComponent;
  let fixture: ComponentFixture<UsariosbiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UsariosbiComponent]
    });
    fixture = TestBed.createComponent(UsariosbiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
