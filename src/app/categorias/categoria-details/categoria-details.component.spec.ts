import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoriaDetailsComponent } from './categoria-details.component';

describe('CategoriaDetailsComponent', () => {
  let component: CategoriaDetailsComponent;
  let fixture: ComponentFixture<CategoriaDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CategoriaDetailsComponent]
    });
    fixture = TestBed.createComponent(CategoriaDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
