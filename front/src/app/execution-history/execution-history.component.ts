import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { environment } from '../../environments/environment';

interface ExecutionHistory {
  id: string;
  name: string;
  creationDateTime: string;
  status: 'PENDING' | 'RUNNING' | 'FINISHED' | 'ERROR' | 'UNKNOWN';
  details?: {
    runner?: string;
    iterations?: number;
    optionSelected?: string;
    ibm_token_provided?: boolean;
    ibm_instance_provided?: boolean;
    files?: { name: string; size: number }[];
    started_at?: string;
    finished_at?: string;
    stderr_path?: string;
    stdout_path?: string;
  };
}

@Component({
  selector: 'app-execution-history',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor, NgIf, DatePipe, CdkDrag, CdkDragHandle],
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
  enLocal: boolean = false;
  modalShare = false;
  generatedShareId: string = '';
  
  private readonly serverUrl = `${environment.proxyAOtroUrl}http://172.20.48.130:8081/run_qiskit`; 

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadExecutionHistory();
    this.refreshAllStatuses();
    this.searchQuery = '';
  }

  loadExecutionHistory(): void {
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
      this.showMessage(`Refreshing executions...`);

      this.executionWorks.forEach(execution => {
          this.checkStatus(execution.id); 
      });
      setTimeout(() => this.isLoading = false, 2000); 

    } else {
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
    if (!this.searchQuery) {
        this.showMessage(`Please enter an ID or name to search.`);
        this.executionSelected = null;
        return;
    }
    
    const query = this.searchQuery.trim();

    const foundLocal = this.executionWorks.find(e => 
        e.name.toLowerCase() === query.toLowerCase() || 
        e.id === query
    );

    if (foundLocal) {
        this.selectExecution(foundLocal);
    } else {
      // if (query && !isNaN(Number(query))) {
      if (query) {
        this.enLocal = false;
        this.searchRemoteExecution(query);
      } else {
        this.showMessage(`No local execution found for: ${query}. Please search by ID.`);
        this.executionSelected = null;
        this.modalDetails = false;
      }
    }
  }

  selectExecution(execution: ExecutionHistory): void {
    this.executionSelected = execution;
    this.searchQuery = execution.name;
    this.modalDetails = true;
    this.enLocal = true;
    this.checkStatus(execution.id); 
  }

  checkStatus(id: string): void {
    const statusUrl = `${this.serverUrl}/status/${id}`; 
    const execution = this.executionWorks.find(e => e.id === id);
    
    if (!execution) return;
    
    execution.status = 'UNKNOWN'; 

    this.http.post(statusUrl, null).subscribe({
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
                files: result.files || execution.details?.files,
            };
            
            if (this.executionSelected?.id === id) {
                this.executionSelected = {...execution}; 
            }
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

    this.http.post(downloadUrl, null, { responseType: 'blob' }).subscribe({
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

    this.http.post(downloadUrl, null, { responseType: 'blob' }).subscribe({
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
    this.enLocal = false;
  }

  calculateExecutionTime(): string | null {
    const details = this.executionSelected?.details;
    
    if (details?.finished_at && details.started_at) {
        const finishedTime = new Date(details.finished_at).getTime();
        const startedTime = new Date(details.started_at).getTime();
        
        const durationMs = finishedTime - startedTime;
        
        const durationSeconds = (durationMs / 1000).toFixed(2);

        return durationSeconds + ' s';
    }
    
    return null;
  }




  downloadStdout(id: string): void {
    const downloadUrl = `${this.serverUrl}/get_stdout/${id}`;

    this.showMessage(`Initiating download for STDOUT Log (ID ${id})...`);

    this.http.post(downloadUrl, null, { responseType: 'blob' }).subscribe({
        next: (responseBlob: Blob) => {
            const downloadLink = document.createElement('a');
            const url = window.URL.createObjectURL(responseBlob);
            
            downloadLink.href = url;
            downloadLink.download = `stdout_${id}.txt`;
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            window.URL.revokeObjectURL(url);
            
            this.showMessage(`Download for STDOUT Log (ID ${id}) started successfully!`);
        },
        error: (err) => {
            console.error('Error fetching STDOUT log:', err);
            let errorMessage = `Failed to download STDOUT log for Batch ID ${id}.`;
            
            if (err.status === 404) {
                errorMessage += ' Log file not found on server (404).';
            } else if (err.status >= 500) {
                errorMessage += ` Server error (${err.status}).`;
            }
            
            this.showMessage(errorMessage, true);
        }
    });
  }


  downloadStderr(id: string): void {
    const downloadUrl = `${this.serverUrl}/get_stderr/${id}`;

    this.showMessage(`Initiating download for STDERR Log (ID ${id})...`);

    this.http.post(downloadUrl, null, { responseType: 'blob' }).subscribe({
        next: (responseBlob: Blob) => {
            const downloadLink = document.createElement('a');
            const url = window.URL.createObjectURL(responseBlob);
            
            downloadLink.href = url;
            downloadLink.download = `stderr_${id}.txt`;
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            window.URL.revokeObjectURL(url);
            
            this.showMessage(`Download for STDERR Log (ID ${id}) started successfully!`);
        },
        error: (err) => {
            console.error('Error fetching STDERR log:', err);
            let errorMessage = `Failed to download STDERR log for Batch ID ${id}.`;
            
            if (err.status === 404) {
                errorMessage += ' Log file not found on server (404).';
            } else if (err.status >= 500) {
                errorMessage += ` Server error (${err.status}).`;
            }
            
            this.showMessage(errorMessage, true);
        }
    });
  }

  clearAllHistory(): void {
    
    localStorage.removeItem('execution_batches');

    this.executionWorks = [];
    this.executionSelected = null;
    this.searchQuery = '';
    this.modalDetails = false;
    this.isLoading = false;
    this.modalDelete = false;
    this.showMessage('All execution history cleared successfully.');
    
  }

  downloadGenericFile(batchId: string, fileName: string): void {
    const downloadUrl = `${this.serverUrl}/get_file/${batchId}/${fileName}`;

    this.showMessage(`Initiating download for ${fileName} (ID ${batchId})...`);

    this.http.post(downloadUrl, null, { responseType: 'blob' }).subscribe({
        next: (responseBlob: Blob) => {
            const downloadLink = document.createElement('a');
            const url = window.URL.createObjectURL(responseBlob);
            
            downloadLink.href = url;
            downloadLink.download = fileName; 
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            window.URL.revokeObjectURL(url);
            
            this.showMessage(`${fileName} download started successfully!`);
        },
        error: (err) => {
            console.error(`Error fetching ${fileName}:`, err);
            this.showMessage(`Failed to download ${fileName}. Status: ${err.status}`, true);
        }
    });
  }

  getFileListColorClass(): string {
    const status = this.executionSelected?.status;
    const files = this.executionSelected?.details?.files;

    if (!files || status === 'PENDING' || status === 'UNKNOWN') {
        return '';
    }
    
    if (status === 'RUNNING') {
        return 'files-running';
    }

    const stderrFile = files.find(f => f.name === 'stderr.txt');

    if (status === 'FINISHED' || status === 'ERROR') {
        if (stderrFile && stderrFile.size > 0) {
            return 'files-error';
        }
        return 'files-success';
    }

    return '';
  }

  searchRemoteExecution(id: string): void {
    this.enLocal = false;
    this.isLoading = true;
    this.showMessage(`Searching server for Batch ID ${id}...`);

    const realExecutionId = this.resolveShareId(id);
    
    const statusUrl = `${this.serverUrl}/status/${realExecutionId}`;
    
    this.http.post(statusUrl, null).subscribe({
        next: (result: any) => {
            const remoteExecution: ExecutionHistory = {
                id: id,
                name: `${id}`,
                creationDateTime: result.started_at || new Date().toISOString(),
                status: result.state.toUpperCase(),
                details: {
                  runner: result.runner,
                  iterations: result.iterations,
                  optionSelected: result.optionSelected,
                  ibm_token_provided: result.ibm_token_provided,
                  ibm_instance_provided: result.ibm_instance_provided,
                  files: result.files,
                  started_at: result.started_at,
                  finished_at: result.finished_at,
                  stderr_path: result.stderr_path,
                  stdout_path: result.stdout_path,
                }
            };
            
            this.selectExecution(remoteExecution);

            this.checkStatus(id); 
            this.isLoading = false;
            
        },
        error: (err) => {
            if (err.status === 404) {
                this.showMessage(`Error: Execution ID ${id} not found on the server.`, true);
            } else {
                this.showMessage(`Error connecting to server. Code: ${err.status}`, true);
            }
            this.isLoading = false;
        }
    });
  }

  generateShareId(execution: ExecutionHistory): string {
    const secretSalt = "MyIdExecutionShare"; 
    const dataToEncode = `${secretSalt}_${execution.id}`;
    
    try {
        const shareId = btoa(dataToEncode);
        console.log("ID Codificado:", shareId);
        return shareId;
    } catch (e) {
        console.error('Error al codificar el ID en Base64:', e);
        return '';
    }
  }

  private resolveShareId(shareId: string): string | null {
    try {
        const secretSalt = "MyIdExecutionShare"; 
        const decodedData = atob(shareId);
        if (decodedData.startsWith(secretSalt + '_')) {
            const realExecutionId = decodedData.split(secretSalt + '_')[1];
            
            if (/^\d+$/.test(realExecutionId)) {
              console.log("Id inicial", realExecutionId)
                return realExecutionId;
            }
        }
        return null; 
    } catch (e) {
        return null;
    }
  }

  openShareModal(execution: ExecutionHistory): void {
    this.generatedShareId = this.generateShareId(execution);
    this.modalShare = true;
  }

  copyShareId(): void {
    if (this.generatedShareId) {
      navigator.clipboard.writeText(this.generatedShareId).then(() => {
        this.showMessage('ID copied to clipboard!', false);
      }).catch(err => {
        const tempInput = document.createElement('textarea');
        tempInput.value = this.generatedShareId;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        this.showMessage('ID copied to clipboard!', false);
      });
    }
  }
}