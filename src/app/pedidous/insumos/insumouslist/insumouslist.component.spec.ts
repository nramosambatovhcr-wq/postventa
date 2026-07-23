import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsumouslistComponent } from './insumouslist.component';

describe('InsumouslistComponent', () => {
  let component: InsumouslistComponent;
  let fixture: ComponentFixture<InsumouslistComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InsumouslistComponent]
    });
    fixture = TestBed.createComponent(InsumouslistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
