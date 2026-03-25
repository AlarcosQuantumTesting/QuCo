import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MinimizeDirective } from '../common/minimize.directive';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDragHandle, MinimizeDirective],
  templateUrl: './about-us.component.html',
  styleUrls: ['./about-us.component.css']
})
export class AboutUsComponent {
  @Input() mostrarModal: boolean = false;
  @Output() cerrarModal = new EventEmitter<void>();

  constructor() {}
}
