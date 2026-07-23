import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VidriosListenvComponent } from './vidrios-listenv.component';

describe('VidriosListenvComponent', () => {
  let component: VidriosListenvComponent;
  let fixture: ComponentFixture<VidriosListenvComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VidriosListenvComponent]
    });
    fixture = TestBed.createComponent(VidriosListenvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
