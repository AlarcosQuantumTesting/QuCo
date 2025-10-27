import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExecutionHistoryComponent } from './execution-history.component';

describe('ExecutionHistoryComponent', () => {
  let component: ExecutionHistoryComponent;
  let fixture: ComponentFixture<ExecutionHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExecutionHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExecutionHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
