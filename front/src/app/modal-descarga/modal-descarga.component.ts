import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MinimizeDirective } from '../common/minimize.directive';


@Component({
  selector: 'app-modal-descarga',
  standalone: true,
  imports: [CommonModule, DragDropModule, MinimizeDirective],
  templateUrl: './modal-descarga.component.html',
  styleUrl: './modal-descarga.component.scss'
})
export class ModalDescargaComponent {
  @Input() mostrarModal = false;
  @Output() cerrar = new EventEmitter<void>();

  cerrarModal() {
    this.mostrarModal = false;
    this.cerrar.emit();
  }

  descargarZip() {
    const enlace = document.createElement('a');
    enlace.href = 'assets/executionFiles.zip';
    enlace.download = 'executionFiles.zip';
    enlace.click();
  }
}
