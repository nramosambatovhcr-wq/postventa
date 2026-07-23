import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SinotrukcaComponent } from './sinotrukca.component';

describe('SinotrukcaComponent', () => {
  let component: SinotrukcaComponent;
  let fixture: ComponentFixture<SinotrukcaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SinotrukcaComponent]
    });
    fixture = TestBed.createComponent(SinotrukcaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
