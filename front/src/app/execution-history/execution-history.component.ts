import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface ExecutionHistory {
  id: string;
  name: string;
  creationDateTime: string;
  status: 'PENDING' | 'RUNNING' | 'FINISHED' | 'ERROR' | 'UNKNOWN';
  details?: {
    runner?: string;
    iterations?: number;
    optionSelected?: string;
    //backend_status?: string;
    started_at?: string;
    finished_at?: string;
    stderr_path?: string;
    stdout_path?: string;
  };
}

@Component({
  selector: 'app-execution-history',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor, NgIf, DatePipe],
  templateUrl: './execution-history.component.html',
  styleUrls: ['./execution-history.component.scss']
})
export class ExecutionHistoryComponent implements OnInit {

  executionWorks: ExecutionHistory[] = [];
  
  executionSelected: ExecutionHistory | null = null;
  searchQuery: string = '';
  
  isLoading: boolean = false;
  mensajeTemporal: string = '';
  modalDelete = false;
  modalDetails = false;
  
  private readonly serverUrl = 'http://172.20.48.130:8080/run_qiskit'; 

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadExecutionHistory();
    this.refreshAllStatuses(); 
  }

  loadExecutionHistory(): void {
    // Clave correcta
    const historyJson = localStorage.getItem('execution_batches'); 
    if (historyJson) {
      this.executionWorks = JSON.parse(historyJson).reverse(); 
    } else {
      this.executionWorks = [];
    }
  }

  private saveExecutionHistory(): void {
    localStorage.setItem('execution_batches', JSON.stringify(this.executionWorks.slice().reverse()));
  }

  refresExecutionData(): void {
    this.refreshAllStatuses();
  }

  refreshAllStatuses(): void {
    if (this.executionWorks.length > 0) {
      this.isLoading = true;
      // this.showMessage(`Fetching real status for ${this.executionWorks.length} batches...`);
      this.showMessage(`Refreshing executions...`);

      this.executionWorks.forEach(execution => {
          this.checkStatus(execution.id); 
      });
      setTimeout(() => this.isLoading = false, 2000); 

    } else {
      this.showMessage(`No execution batches found locally.`);
      this.isLoading = false;
    }
  }


  get filteredExecutionWorks(): ExecutionHistory[] {
    if (!this.searchQuery) {
      return this.executionWorks;
    }
    return this.executionWorks.filter(e => 
      e.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
      e.id.includes(this.searchQuery)
    );
  }

  searchExecution(): void {
    const found = this.executionWorks.find(e => e.name === this.searchQuery || e.id === this.searchQuery);
    if (found) {
      this.selectExecution(found);
      this.modalDetails = true;
    } else {
      this.showMessage(`No execution found with name or ID: ${this.searchQuery}`);
      this.executionSelected = null;
    }
  }

  selectExecution(execution: ExecutionHistory): void {
    this.executionSelected = execution;
    this.searchQuery = execution.name;
    this.modalDetails = true;
    //this.showMessage(`Execution ${execution.id} selected.`);
    this.checkStatus(execution.id); 
  }

  checkStatus(id: string): void {
    const statusUrl = `${this.serverUrl}/status/${id}`; 
    const execution = this.executionWorks.find(e => e.id === id);
    
    if (!execution) return;
    
    execution.status = 'UNKNOWN'; 

    this.http.get(statusUrl).subscribe({
        next: (result: any) => {
            
            let newStatus: 'PENDING' | 'RUNNING' | 'FINISHED' | 'ERROR' | 'UNKNOWN' = 'UNKNOWN';
            
            switch (result.state) {
                case 'running':
                    newStatus = 'RUNNING';
                    break;
                case 'finished':
                    newStatus = 'FINISHED';
                    break;
                case 'error':
                    newStatus = 'ERROR';
                    break;
                default:
                    newStatus = 'PENDING'; 
                    break;
            }

            execution.status = newStatus; 
            
            execution.details = {
                ...execution.details,
                started_at: result.started_at,
                finished_at: result.finished_at,
                stderr_path: result.stderr_path,
                stdout_path: result.stdout_path,
            };
            
            if (this.executionSelected?.id === id) {
                this.executionSelected = {...execution}; 
            }

            //this.showMessage(`Status for ID ${id} fetched. Current Status: ${execution.status}`);
        },
        error: (err) => {
            execution.status = 'ERROR'; 
            this.showMessage(`Error fetching status for ID ${id}. Code: ${err.status}`, true);
        }
    });
  }

  confirmDelete(id: string): void {
    this.executionWorks = this.executionWorks.filter(e => e.id !== id);
    
    this.saveExecutionHistory();

    this.executionSelected = null;
    this.modalDelete = false;
    this.showMessage(`Execution batch ${id} deleted locally.`);
  }

  /*deleteModalConfirm(execution: ExecutionHistory): void {
    this.executionSelected = execution;
    this.modalDelete = true;
  }*/

  deleteModalConfirm(execution: ExecutionHistory | null): void {
    if (!execution || !execution.id) {
      console.error('Attempted to delete a null or invalid execution.');
      return;
    }
      
    this.executionSelected = execution;
    this.modalDelete = true;
  }

  showMessage(message: string, isError: boolean = false): void {
    this.mensajeTemporal = message;
    setTimeout(() => this.mensajeTemporal = '', 3000);
  }

  downloadSummary(id: string): void {
    const downloadUrl = `${this.serverUrl}/get_summary/${id}`;

    console.log('sumary');
    console.log(`Downloading summary for Batch ID ${id}...`);
    
    this.showMessage(`Initiating download for Batch ID ${id}...`);

    this.http.get(downloadUrl, { responseType: 'blob' }).subscribe({
        next: (responseBlob: Blob) => {
            const downloadLink = document.createElement('a');
            const url = window.URL.createObjectURL(responseBlob);
            
            downloadLink.href = url;
            downloadLink.download = `summary_${id}.csv`; 
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            window.URL.revokeObjectURL(url);
            
            this.showMessage(`Download for Batch ID ${id} started successfully!`);
        },
        error: (err) => {
            console.error('Error fetching summary CSV:', err);
            let errorMessage = `Failed to download summary for Batch ID ${id}.`;
            
            if (err.status === 404) {
                errorMessage += ' File not found on server (404).';
            } else if (err.status >= 500) {
                errorMessage += ` Server error (${err.status}).`;
            }
            
            this.showMessage(errorMessage, true);
        }
    });
  }

  downloadResults(id: string): void {
    const downloadUrl = `${this.serverUrl}/get_results/${id}`;

    this.showMessage(`Initiating download for All Results (ID ${id})...`);

    this.http.get(downloadUrl, { responseType: 'blob' }).subscribe({
        next: (responseBlob: Blob) => {
            const downloadLink = document.createElement('a');
            const url = window.URL.createObjectURL(responseBlob);
            
            downloadLink.href = url;
            downloadLink.download = `all_results_${id}.csv`; 
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            window.URL.revokeObjectURL(url);
            
            this.showMessage(`Download for All Results (ID ${id}) started successfully!`);
        },
        error: (err) => {
            console.error('Error fetching results CSV:', err);
            let errorMessage = `Failed to download results for Batch ID ${id}.`;
            
            if (err.status === 404) {
                errorMessage += ' File not found on server (404).';
            } else if (err.status >= 500) {
                errorMessage += ` Server error (${err.status}).`;
            }
            
            this.showMessage(errorMessage, true);
        }
    });
  }

  clearSelection(): void {
    this.executionSelected = null;
  }
}