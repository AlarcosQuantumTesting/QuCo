import { Component } from '@angular/core';
import { TranspilationService } from '../transpilation.service';

@Component({
  selector: 'app-transpilation',
  templateUrl: './transpilation.component.html',
  styleUrl: './transpilation.component.css'
})
export class TranspilationComponent {

  transpilationWorks: any[] = [];
  transpiledCode?: string;

  constructor(private service: TranspilationService) { 
    this.getTranspilationWorks();
  }

  getTranspilationWorks() {
    this.service.getListOfTranspilationWorks().subscribe({
      next: (data) => {
        this.transpilationWorks = data;
      },
      error: (err) => {
        console.error("Error fetching transpilation works:", err);
      }
    });
  }

  getTranspiledCode(id : any) {
    this.service.getTranspiledCode(id).subscribe({
      next: (data) => {
        this.transpiledCode = data.code;
      },
      error: (err) => {
        console.error("Error fetching transpilation works:", err);
      }
    });
  }

  getErrors(id: any) {
    this.service.getErrors(id).subscribe({
      next: (data) => {
        this.transpiledCode = data.code;
      },
      error: (err) => {
        console.error("Error fetching transpilation works:", err);
      }
    });
  }

}
