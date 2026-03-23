import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SonySettingsComponent } from './sony.component';

describe('SonyComponent', () => {
  let component: SonySettingsComponent;
  let fixture: ComponentFixture<SonySettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SonySettingsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SonySettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
