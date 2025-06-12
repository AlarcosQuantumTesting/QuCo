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
  svgCircuit? : any

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

  cancelTranspilation(id: any) {
    let option = confirm("Are you sure you want to delete this work?");
    if (!option) 
      return

    this.service.cancelTranspilation(id).subscribe({
      next: (data) => {
       this.getTranspilationWorks(); // Refresh the list after cancellation
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

  loadSvg(id: string): void {
    this.service.getCircuitSvg(id).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        this.svgCircuit = url;
      },
      error: err => {
        console.error('Error loading image', err);
      }
    });
  }
}
