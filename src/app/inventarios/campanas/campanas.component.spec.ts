import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampanasComponent } from './campanas.component';

describe('CampanasComponent', () => {
  let component: CampanasComponent;
  let fixture: ComponentFixture<CampanasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CampanasComponent]
    });
    fixture = TestBed.createComponent(CampanasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
