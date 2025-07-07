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

  mensajeTemporal: string = '';
  searchQuery: string = "";
  transpilationSelected: any = null;
  transpilationFiltered: any[] = [];
  selectedBackend: string | null = null;
  selectedStatusLine: any = null;


  constructor(private service: TranspilationService) { 
    this.getTranspilationWorks();
  }

  ngOnInit() {
    this.getTranspilationWorks();
  }

  getTranspilationWorks() {
    this.service.getListOfTranspilationWorks().subscribe({
      next: (data) => {
        this.transpilationWorks = data;
        this.transpilationFiltered = data;

        if (data.length > 0) {
          this.transpilationSelected = data[0];
          this.searchQuery = data[0].name;
        }
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


  onSearchInput() {
    // Aquí normalmente no se hace nada porque el <datalist> ya lo hace
  }

  onFocusInput() {
    
  }

  onTabPress(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      this.selectTranspilationIfMatch();
    }
  }

  selectTranspilationIfMatch() {
    const match = this.transpilationWorks.find(
      t => t.name.toLowerCase() === this.searchQuery.trim().toLowerCase()
    );

    if (match) {
      this.transpilationSelected = match;
      this.searchQuery = match.name;
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.transpilationSelected = null;
    this.transpilationFiltered = [...this.transpilationWorks];
  }

  searchTranspilation() {
    const match = this.transpilationWorks.find(
      t => t.name.toLowerCase() === this.searchQuery.trim().toLowerCase()
    );

    if (match) {
      this.transpilationSelected = match;
    } else {
      console.warn('No se encontró ninguna transpilación con ese nombre.');
    }
  }

  onBackendChange(id: Event) {
    this.service.getTranspiledCode(id).subscribe({
      next: (data) => {
        this.transpiledCode = data.code;
      },
      error: (err) => {
        console.error("Error fetching transpilation works:", err);
      }
    });
  }



  showAll() {
    this.transpilationSelected = null;
    this.transpilationFiltered = [...this.transpilationWorks];
  }
}
