import { Component, Input } from '@angular/core';
import { DeterministicComponent } from '../deterministic/deterministic.component';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss'
})
export class EditorComponent {

  @Input() parent: any;

  isDeterministic: boolean = false;

  ngOnInit() {
    this.isDeterministic = this.parent instanceof DeterministicComponent;
  }

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

  callParentBoolean(methodName: string, ...args: any[]): boolean {
    if (this.parent && typeof this.parent[methodName] === 'function') {
      return this.parent[methodName](...args);
    }
    return false;
  }  

  onUserInput() {
    if (this.parent) {
      this.parent.checkForExpressions();
    } else {
      console.error("parent no está definido en EditorComponent");
    }
  }

  selectRecommendation() {
    console.log("Seleccionada la recomendación:", this.parent?.recommendation);
  }

  onTabPress(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      this.callParentMethod("onTabPress", event);
    }
    
  }
}