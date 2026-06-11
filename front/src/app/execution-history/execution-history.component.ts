import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgFor, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MinimizeDirective } from '../common/minimize.directive';
import { environment } from '../../environments/environment';
import { ExecutionPollingService, ExecutionHistory } from '../execution-polling.service';
import { ActivatedRoute, Router } from '@angular/router';

export interface ParsedAnnealingResult {
  raw: string;
  originalProblem?: any;
  qubo?: any;
  hamiltonian?: any;
  offset?: string;
  results?: {
    fval: string;
    variables: { name: string; value: string }[];
    status: string;
  }[];
  time?: string;
}

@Component({
  selector: 'app-execution-history',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor, NgIf, DatePipe, CdkDrag, CdkDragHandle, MinimizeDirective],
  templateUrl: './execution-history.component.html',
  styleUrls: ['./execution-history.component.scss']
})
export class ExecutionHistoryComponent implements OnInit, OnDestroy {

  executionWorks: ExecutionHistory[] = [];

  executionSelected: ExecutionHistory | null = null;
  searchQuery: string = '';

  isLoading: boolean = false;
  mensajeTemporal: string = '';
  modalDelete = false;

  elapsedTimes: { [id: string]: number } = {};
  timerInterval: any;

  modalDetails = false;
  enLocal: boolean = false;
  modalShare = false;
  generatedShareId: string = '';

  parsedStdoutResult: ParsedAnnealingResult | null = null;
  infoState: { original: boolean; qubo: boolean; hamiltonian: boolean } = { original: false, qubo: false, hamiltonian: false };
  mostrarResultadosStdout: boolean = false;

  showHelp: boolean = false;

  showAllSolutions: boolean = false;
  showFilters: boolean = false;
  
  filterFvalMin: number | null = null;
  filterFvalMax: number | null = null;
  filterIncludedVar: string = '';
  filterExcludedVar: string = '';
  filterNumIncludedMin: number | null = null;
  filterNumIncludedMax: number | null = null;
  filterNumExcludedMin: number | null = null;
  filterNumExcludedMax: number | null = null;

  clearFilters(): void {
    this.clearCostFilters();
    this.clearIncludedFilters();
    this.clearExcludedFilters();
  }

  clearCostFilters(): void {
    this.filterFvalMin = null;
    this.filterFvalMax = null;
  }

  clearIncludedFilters(): void {
    this.filterIncludedVar = '';
    this.filterNumIncludedMin = null;
    this.filterNumIncludedMax = null;
  }

  clearExcludedFilters(): void {
    this.filterExcludedVar = '';
    this.filterNumExcludedMin = null;
    this.filterNumExcludedMax = null;
  }

  get bestSolution() {
    return this.parsedStdoutResult?.results?.[0];
  }

  get otherSolutions() {
    if (!this.parsedStdoutResult?.results || this.parsedStdoutResult.results.length <= 1) {
      return [];
    }

    let solutions = this.parsedStdoutResult.results.slice(1);

    if (this.filterFvalMin !== null && this.filterFvalMin !== undefined && this.filterFvalMin.toString() !== '') {
      solutions = solutions.filter(s => parseFloat(s.fval) >= this.filterFvalMin!);
    }
    
    if (this.filterFvalMax !== null && this.filterFvalMax !== undefined && this.filterFvalMax.toString() !== '') {
      solutions = solutions.filter(s => parseFloat(s.fval) <= this.filterFvalMax!);
    }

    if (this.filterIncludedVar) {
      const incVars = this.filterIncludedVar.split(',').map(v => v.trim()).filter(v => v);
      solutions = solutions.filter(s => 
        incVars.every(incVar => s.variables.some(v => v.name === incVar && v.value === '1.0'))
      );
    }

    if (this.filterExcludedVar) {
      const excVars = this.filterExcludedVar.split(',').map(v => v.trim()).filter(v => v);
      solutions = solutions.filter(s => 
        excVars.every(excVar => s.variables.some(v => v.name === excVar && v.value === '0.0'))
      );
    }

    if (this.filterNumIncludedMin !== null && this.filterNumIncludedMin !== undefined && this.filterNumIncludedMin.toString() !== '') {
      solutions = solutions.filter(s => s.variables.filter(v => v.value === '1.0').length >= this.filterNumIncludedMin!);
    }
    
    if (this.filterNumIncludedMax !== null && this.filterNumIncludedMax !== undefined && this.filterNumIncludedMax.toString() !== '') {
      solutions = solutions.filter(s => s.variables.filter(v => v.value === '1.0').length <= this.filterNumIncludedMax!);
    }

    if (this.filterNumExcludedMin !== null && this.filterNumExcludedMin !== undefined && this.filterNumExcludedMin.toString() !== '') {
      solutions = solutions.filter(s => s.variables.filter(v => v.value === '0.0').length >= this.filterNumExcludedMin!);
    }

    if (this.filterNumExcludedMax !== null && this.filterNumExcludedMax !== undefined && this.filterNumExcludedMax.toString() !== '') {
      solutions = solutions.filter(s => s.variables.filter(v => v.value === '0.0').length <= this.filterNumExcludedMax!);
    }

    return solutions;
  }
  //private readonly serverUrl = `${environment.proxyAOtroUrl}http://172.20.48.130:8081}/run_qiskit``;
  private readonly serverUrl = `${environment.proxyAOtroUrl}${environment.remoteRunnerUrl}run_qiskit`;

  getServerUrl(execution: ExecutionHistory): string {
    const runnerType = execution.details?.runnerType || 'qiskit';
    const baseUrl = `${environment.proxyAOtroUrl}${environment.remoteRunnerUrl}`;
    if (runnerType === 'editor') {
      return `${baseUrl}/run_qiskit_editor`;
    }
    return `${baseUrl}/run_qiskit`;
  }
  stdoutExecutionName: string = '';

  constructor(private http: HttpClient, private executionPollingService: ExecutionPollingService, private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.executionPollingService.executions$.subscribe(executions => {
      this.executionWorks = executions;
    });
    this.refreshAllStatuses();
    this.searchQuery = '';

    this.route.queryParams.subscribe(params => {
      if (params['selectedId']) {
        const selectedId = params['selectedId'];
        const exec = this.executionWorks.find(e => e.id === selectedId);
        if (exec) {
          this.selectExecution(exec);
          
          // Clear query params to prevent auto-opening on reload
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { selectedId: null },
            queryParamsHandling: 'merge'
          });
        }
      }
    });

    this.timerInterval = setInterval(() => {
      this.executionWorks.forEach(exec => {
        if (exec.status === 'RUNNING' || exec.status === 'PENDING') {
          const start = new Date(exec.creationDateTime).getTime();
          const now = new Date().getTime();
          this.elapsedTimes[exec.id] = Math.floor((now - start) / 1000);
        }
      });
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  formatElapsed(seconds: number): string {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }


  loadExecutionHistory(): void {
    this.executionPollingService.loadExecutionHistory();
  }

  private saveExecutionHistory(): void {
    this.executionPollingService.saveExecutionHistory(this.executionWorks);
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
    const execution = this.executionWorks.find(e => e.id === id);
    if (!execution) return;

    const statusUrl = `${this.getServerUrl(execution)}/status/${id}`;

    execution.status = 'UNKNOWN';

    const runnerType = execution.details?.runnerType || 'qiskit';
    const request = (runnerType === 'editor')
      ? this.http.get(statusUrl)
      : this.http.post(statusUrl, null);

    request.subscribe({
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
          this.executionSelected = { ...execution };
        }
      },
      error: (err) => {
        execution.status = 'ERROR';
        this.showMessage(`Error fetching status for ID ${id}. Code: ${err.status}`, true);
      }
    });
  }



  deleteSelectedExecution(): void {
    if (!this.executionSelected) return;

    this.executionWorks = this.executionWorks.filter(e => e.id !== this.executionSelected!.id);

    this.saveExecutionHistory();

    this.showMessage(`Execution batch ${this.executionSelected.id} deleted locally.`);
    this.executionSelected = null;
    this.modalDelete = false;
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
    const execution = this.executionWorks.find(e => e.id === id);
    if (!execution) return;
    const downloadUrl = `${this.getServerUrl(execution)}/get_summary/${id}`;

    console.log('sumary');
    console.log(`Downloading summary for Batch ID ${id}...`);

    this.showMessage(`Initiating download for Batch ID ${id}...`);

    const runnerType = execution.details?.runnerType || 'qiskit';
    const request = (runnerType === 'editor')
      ? this.http.get(downloadUrl, { responseType: 'blob' })
      : this.http.post(downloadUrl, null, { responseType: 'blob' });

    request.subscribe({
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
    const execution = this.executionWorks.find(e => e.id === id);
    if (!execution) return;
    const downloadUrl = `${this.getServerUrl(execution)}/get_results/${id}`;

    this.showMessage(`Initiating download for All Results (ID ${id})...`);

    const runnerType = execution.details?.runnerType || 'qiskit';
    const request = (runnerType === 'editor')
      ? this.http.get(downloadUrl, { responseType: 'blob' })
      : this.http.post(downloadUrl, null, { responseType: 'blob' });

    request.subscribe({
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

  formatTimeDisplay(secondsStr: string): string {
    const totalSeconds = parseFloat(secondsStr.replace('s', ''));
    if (isNaN(totalSeconds)) return secondsStr;

    if (totalSeconds < 60) {
      return totalSeconds.toFixed(2) + ' s';
    } else if (totalSeconds < 3600) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60);
      return `${minutes} m ${seconds} s`;
    } else {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);
      return `${hours} h ${minutes} m ${seconds} s`;
    }
  }

  calculateExecutionTime(): string | null {
    const details = this.executionSelected?.details;

    if (details?.finished_at && details.started_at) {
      const finishedTime = new Date(details.finished_at).getTime();
      const startedTime = new Date(details.started_at).getTime();

      const durationMs = finishedTime - startedTime;
      const durationSeconds = (durationMs / 1000).toString() + 's';

      return this.formatTimeDisplay(durationSeconds);
    }

    return null;
  }




  downloadStdout(id: string): void {
    const execution = this.executionWorks.find(e => e.id === id);
    if (!execution) return;
    const downloadUrl = `${this.getServerUrl(execution)}/get_stdout/${id}`;

    this.showMessage(`Initiating download for STDOUT Log (ID ${id})...`);

    const runnerType = execution.details?.runnerType || 'qiskit';
    const request = (runnerType === 'editor')
      ? this.http.get(downloadUrl, { responseType: 'blob' })
      : this.http.post(downloadUrl, null, { responseType: 'blob' });

    request.subscribe({
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
    const execution = this.executionWorks.find(e => e.id === id);
    if (!execution) return;
    const downloadUrl = `${this.getServerUrl(execution)}/get_stderr/${id}`;

    this.showMessage(`Initiating download for STDERR Log (ID ${id})...`);

    const runnerType = execution.details?.runnerType || 'qiskit';
    const request = (runnerType === 'editor')
      ? this.http.get(downloadUrl, { responseType: 'blob' })
      : this.http.post(downloadUrl, null, { responseType: 'blob' });

    request.subscribe({
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
    this.executionPollingService.updateExecutionsFromLocal([]);
    this.executionSelected = null;
    this.searchQuery = '';
    this.modalDetails = false;
    this.isLoading = false;
    this.modalDelete = false;
    this.showMessage('All execution history cleared successfully.');

  }

  downloadGenericFile(batchId: string, fileName: string): void {
    const execution = this.executionWorks.find(e => e.id === batchId);
    if (!execution) return;
    const downloadUrl = `${this.getServerUrl(execution)}/get_file/${batchId}/${fileName}`;

    this.showMessage(`Initiating download for ${fileName} (ID ${batchId})...`);

    const runnerType = execution.details?.runnerType || 'qiskit';
    const request = (runnerType === 'editor')
      ? this.http.get(downloadUrl, { responseType: 'blob' })
      : this.http.post(downloadUrl, null, { responseType: 'blob' });

    request.subscribe({
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

  viewStdoutResults(batchId: string, fileName: string): void {
    const execution = this.executionWorks.find(e => e.id === batchId);
    if (!execution) return;

    this.stdoutExecutionName = execution.name;
    const downloadUrl = `${this.getServerUrl(execution)}/get_file/${batchId}/${fileName}`;

    this.showMessage(`Fetching ${fileName} for parsing (ID ${batchId})...`);

    const runnerType = execution.details?.runnerType || 'qiskit';
    const request = (runnerType === 'editor')
      ? this.http.get(downloadUrl, { responseType: 'text' })
      : this.http.post(downloadUrl, null, { responseType: 'text' });

    request.subscribe({
      next: (responseText: string) => {
        this.parseStdout(responseText);
        this.mostrarResultadosStdout = true;
      },
      error: (err) => {
        console.error(`Error fetching ${fileName}:`, err);
        this.showMessage(`Failed to load ${fileName} for viewing. Status: ${err.status}`, true);
      }
    });
  }

  private parseMathLine(line: string): any {
    let probText = line.trim();
    let numVars = '';
    let numConstraints = '';
    
    const statsMatch = probText.match(/\((.*?)\)$/);
    if (statsMatch) {
        const statsStr = statsMatch[1];
        const parts = statsStr.split(',');
        for (let part of parts) {
           part = part.trim();
           if (part.includes('variables')) {
               numVars = part;
           } else if (part.includes('constraints')) {
               numConstraints = part;
           }
        }
        probText = probText.replace(/\((.*?)\)$/, '').trim();
    }
    
    let action = '';
    if (probText.toLowerCase().startsWith('minimize')) {
       action = 'minimize';
       probText = probText.substring('minimize'.length).trim();
    } else if (probText.toLowerCase().startsWith('maximize')) {
       action = 'maximize';
       probText = probText.substring('maximize'.length).trim();
    }

    return {
       action: action,
       equation: probText,
       variables: numVars,
       constraints: numConstraints
    };
  }

  parseStdout(text: string): void {
    this.parsedStdoutResult = { raw: text };

    try {
      const problemMatch = text.match(/Problema original:\n([\s\S]*?)QUBO:/);
      if (problemMatch && problemMatch[1]) {
        this.parsedStdoutResult.originalProblem = this.parseMathLine(problemMatch[1]);
      }

      const quboMatch = text.match(/QUBO:\n([\s\S]*?)Hamiltoniano:/);
      if (quboMatch && quboMatch[1]) {
        this.parsedStdoutResult.qubo = this.parseMathLine(quboMatch[1]);
      }

      const hamMatch = text.match(/Hamiltoniano:\n([\s\S]*?)Offset:/);
      if (hamMatch && hamMatch[1]) {
        let hamStr = hamMatch[1].trim();
        const pauliMatch = hamStr.match(/SparsePauliOp\(\[([\s\S]*?)\]/);
        const coeffMatch = hamStr.match(/coeffs=\[([\s\S]*?)\]/);
        
        if (pauliMatch && coeffMatch) {
            const paulis = pauliMatch[1].split(',').map(s => s.replace(/['"\s]/g, ''));
            const coeffs = coeffMatch[1].split(',').map(s => s.replace(/\s*\+0\.j/, '').trim());
            
            const terms = [];
            for (let i = 0; i < paulis.length; i++) {
                if (paulis[i] && coeffs[i]) {
                    terms.push({ pauli: paulis[i], coeff: coeffs[i] });
                }
            }
            this.parsedStdoutResult.hamiltonian = { terms, raw: hamStr };
        } else {
            this.parsedStdoutResult.hamiltonian = { raw: hamStr };
        }
      }

      const offsetMatch = text.match(/Offset:\s*([^\n]+)/);
      if (offsetMatch && offsetMatch[1]) {
        this.parsedStdoutResult.offset = offsetMatch[1].trim();
      }

      const results: { fval: string; variables: { name: string; value: string }[]; status: string; }[] = [];
      const lines = text.split('\n');
      let collectResults = false;
      for (const line of lines) {
        if (line.includes('Resultado:') || line.includes('---Todas_las_soluciones---') || line.includes('---ALL_SOLUTIONS---')) {
          collectResults = true;
          continue;
        }
        if (collectResults && line.includes('fval=')) {
          const resultLine = line.trim();
          const parts = resultLine.split(',').map(p => p.trim());
          const variables: { name: string, value: string }[] = [];
          let fval = '';
          let status = '';
          for (const p of parts) {
            const splitPart = p.split('=');
            if (splitPart.length === 2) {
              const k = splitPart[0].trim();
              const v = splitPart[1].trim();
              if (k === 'fval') fval = v;
              else if (k === 'status') status = v;
              else if (k.startsWith('x')) variables.push({ name: k, value: v });
            }
          }
          // Avoid pushing exact duplicates
          const isDuplicate = results.some(r => r.fval === fval && r.status === status && JSON.stringify(r.variables) === JSON.stringify(variables));
          if (!isDuplicate) {
            results.push({ fval, variables, status });
          }
        }
      }
      
      if (results.length > 0) {
        this.parsedStdoutResult.results = results;
      }

      const timeMatch = text.match(/Finished.*?in\s+([\d\.]+s)/);
      if (timeMatch && timeMatch[1]) {
        this.parsedStdoutResult.time = this.formatTimeDisplay(timeMatch[1].trim());
      }
    } catch (e) {
      console.error("Error parsing stdout:", e);
    }
  }

  closeStdoutModal(): void {
    this.mostrarResultadosStdout = false;
    this.parsedStdoutResult = null;
    this.stdoutExecutionName = '';
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

  toggleHelp() {
    this.showHelp = !this.showHelp;
  }

}