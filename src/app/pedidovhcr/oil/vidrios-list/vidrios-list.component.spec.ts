import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VidriosListComponent } from './vidrios-list.component';

describe('VidriosListComponent', () => {
  let component: VidriosListComponent;
  let fixture: ComponentFixture<VidriosListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VidriosListComponent]
    });
    fixture = TestBed.createComponent(VidriosListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
