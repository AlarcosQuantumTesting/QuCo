import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MinimizeDirective } from '../common/minimize.directive';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-download-code-modal',
  standalone: true,
  imports: [CommonModule, DragDropModule, MinimizeDirective, FormsModule],
  templateUrl: './download-code-modal.component.html',
  styleUrl: './download-code-modal.component.scss'
})
export class DownloadCodeModalComponent {
  @Input() mostrarModal = false;
  @Input() qiskitCode: string = '';
  @Output() cerrar = new EventEmitter<void>();

  selectedExtension: string = '.py';

  cerrarModal() {
    this.mostrarModal = false;
    this.cerrar.emit();
  }

  descargarCodigo() {
    if (!this.qiskitCode) return;
    const blob = new Blob([this.qiskitCode], { type: 'text/plain;charset=utf-8' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `qiskit_code${this.selectedExtension}`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
    this.cerrarModal();
  }
}
