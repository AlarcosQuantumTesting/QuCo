import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss'
})
export class EditorComponent {

  @Input() parent: any;

  callParentMethodEx() {
    if (this.parent) {
      this.parent.someMethodInMatrixes();
    }
  }

  callParentMethod(methodName: string, ...args: any[]) {
    if (this.parent && typeof this.parent[methodName] === 'function') {
      this.parent[methodName](...args);
    }
  }

  onUserInput() {
    if (this.parent) {
      this.parent.checkForExpressions();
    } else {
      console.error("parent no está definido en EditorComponent");
    }
  }

  selectRecommendation() {
    // Lógica para manejar la selección de una recomendación
    console.log("Seleccionada la recomendación:", this.parent?.recommendation);
  }
}