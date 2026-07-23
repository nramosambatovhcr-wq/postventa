import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArchivosblComponent } from './archivosbl.component';

describe('ArchivosblComponent', () => {
  let component: ArchivosblComponent;
  let fixture: ComponentFixture<ArchivosblComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ArchivosblComponent]
    });
    fixture = TestBed.createComponent(ArchivosblComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
