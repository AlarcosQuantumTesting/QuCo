import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subscription, interval } from 'rxjs';
import { environment } from '../environments/environment';
import { ToastService } from './toast.service';

// Para el polling, cuando detecta que ha finalizado una ejecución, manda un mensaje a toastService.

export interface ExecutionHistory {
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
    runnerType?: 'qiskit' | 'cirq' | 'editor' | 'annealing';
  };
}

@Injectable({
  providedIn: 'root'
})
export class ExecutionPollingService implements OnDestroy {
  private executionWorks: ExecutionHistory[] = [];
  private executionsSubject = new BehaviorSubject<ExecutionHistory[]>([]);
  public executions$ = this.executionsSubject.asObservable();
  private pollingSub?: Subscription;

  constructor(private http: HttpClient, private toastService: ToastService) {
    this.loadExecutionHistory();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  public loadExecutionHistory(): void {
    const historyJson = localStorage.getItem('execution_batches');
    if (historyJson) {
      this.executionWorks = JSON.parse(historyJson).reverse();
    } else {
      this.executionWorks = [];
    }
    this.executionsSubject.next(this.executionWorks);
  }

  public saveExecutionHistory(executions: ExecutionHistory[]): void {
    this.executionWorks = executions;
    // we reverse back before saving because execution-history expects it?
    // wait, executionWorks is already reversed from localStorage when loaded.
    // execution-history.component.ts did:
    // localStorage.setItem('execution_batches', JSON.stringify(this.executionWorks.slice().reverse()));
    localStorage.setItem('execution_batches', JSON.stringify(this.executionWorks.slice().reverse()));
    this.executionsSubject.next(this.executionWorks);
  }

  public updateExecutionsFromLocal(executions: ExecutionHistory[]): void {
    this.executionWorks = executions;
    this.executionsSubject.next(this.executionWorks);
  }

  private startPolling(): void {
    // Poll every 5 seconds
    this.pollingSub = interval(5000).subscribe(() => {
      // Reload from local storage in case another tab or component added an execution
      const historyJson = localStorage.getItem('execution_batches');
      if (historyJson) {
        const loaded = JSON.parse(historyJson).reverse();
        // If length changed, update our memory. 
        // We do a simple assignment, but if we are in the middle of updating, we need to be careful.
        // For simplicity, we just use the loaded ones and merge statuses.
        this.executionWorks = loaded;
      }

      let hasPending = false;
      this.executionWorks.forEach(exec => {
        if (exec.status === 'RUNNING' || exec.status === 'PENDING') {
          hasPending = true;
          this.silentCheckStatus(exec.id);
        }
      });

      if (!hasPending) {
        this.executionsSubject.next(this.executionWorks);
      }
    });
  }

  public stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }
  }

  public getServerUrl(execution: ExecutionHistory): string {
    const runnerType = execution.details?.runnerType || 'qiskit';
    const baseUrl = `${environment.proxyAOtroUrl}${environment.remoteRunnerUrl}`;
    if (runnerType === 'editor') {
      return `${baseUrl}/run_qiskit_editor`;
    }
    return `${baseUrl}/run_qiskit`;
  }

  private silentCheckStatus(id: string): void {
    const execution = this.executionWorks.find(e => e.id === id);
    if (!execution) return;

    const statusUrl = `${this.getServerUrl(execution)}/status/${id}`;

    const runnerType = execution.details?.runnerType || 'qiskit';
    const request = (runnerType === 'editor')
      ? this.http.get(statusUrl)
      : this.http.post(statusUrl, null);

    request.subscribe({
      next: (result: any) => {
        let newStatus: 'PENDING' | 'RUNNING' | 'FINISHED' | 'ERROR' | 'UNKNOWN' = 'UNKNOWN';

        switch (result.state) {
          case 'running': newStatus = 'RUNNING'; break;
          case 'finished': newStatus = 'FINISHED'; break;
          case 'error': newStatus = 'ERROR'; break;
          default: newStatus = 'PENDING'; break;
        }

        const oldStatus = execution.status;

        execution.status = newStatus;
        execution.details = {
          ...execution.details,
          started_at: result.started_at,
          finished_at: result.finished_at,
          stderr_path: result.stderr_path,
          stdout_path: result.stdout_path,
          files: result.files || execution.details?.files,
        };

        if ((oldStatus === 'RUNNING' || oldStatus === 'PENDING') && newStatus === 'FINISHED') {
          this.toastService.addToast(`Execution ${id} finished`, id);
          this.saveExecutionHistory(this.executionWorks);
        } else if ((oldStatus === 'RUNNING' || oldStatus === 'PENDING') && newStatus === 'ERROR') {
          this.toastService.addToast(`Execution ${id} failed`, id);
          this.saveExecutionHistory(this.executionWorks);
        } else {
          // just update subject if something changed like files
          this.executionsSubject.next(this.executionWorks);
        }
      },
      error: (err) => {
        // silent fail
      }
    });
  }
}
