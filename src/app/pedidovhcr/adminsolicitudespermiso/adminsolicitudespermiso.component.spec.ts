import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminsolicitudespermisoComponent } from './adminsolicitudespermiso.component';

describe('AdminsolicitudespermisoComponent', () => {
  let component: AdminsolicitudespermisoComponent;
  let fixture: ComponentFixture<AdminsolicitudespermisoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminsolicitudespermisoComponent]
    });
    fixture = TestBed.createComponent(AdminsolicitudespermisoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
