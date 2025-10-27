import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgForm } from '@angular/forms';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-run-code',
  standalone: true, 
  imports: [CommonModule, FormsModule, CdkDrag, CdkDragHandle, NgIf, NgFor],
  templateUrl: './run-code.component.html',
  styleUrls: ['./run-code.component.scss']
})
export class RunCodeComponent implements OnInit {


  @Input() qiskitCode: string = '';

  @Input() mostrarModal = false;

  @Output() cerrar = new EventEmitter<void>();

  executionUrl : string = 'https://alarcosj.esi.uclm.es/proxyaotro/proxyaotro/resend?url=';

  cerrarModal(): void {
    this.cerrar.emit();
  }
  options = ["1. Just simulator", "2. Just fake_backends", "3. Simulator and fake_backends", "4. Just actual_backends", "5. All options"];
  httpLabel: string = '';

  formData = {
    iterations: 1,
    override: false,
    ibm_token: '',
    ibm_instance: '',
    option: this.options[0]
  };

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.updateHttpLabel();
  }

  get isIbmRequired(): boolean {
    const fullOptionString = this.formData.option;
    const selectedNumber = fullOptionString ? Number(String(fullOptionString).match(/^(\d+)/)?.[0]) : null;
    return selectedNumber === 4 || selectedNumber === 5;
  }

  get needsTokenAndInstance(): boolean {
    return true;
  }

  updateHttpLabel(): void {
    const { iterations, override, option, ibm_token, ibm_instance } = this.formData;
    
    const optionMatch = option.match(/^(\d+)/);
    const runnerNumber = optionMatch ? optionMatch[0] : '1';
    
    const overwriteValue = override ? 'y' : 'n';

    let url = `${this.executionUrl}http://172.20.48.130:8080/run_qiskit?iterations=${iterations}&overwrite=${overwriteValue}&runner=${runnerNumber}`

    if (ibm_token) {
        url += `&ibm_token=${ibm_token}`; 
    }

    if (ibm_instance) {
        url += `&ibm_instance=${ibm_instance}`;
    }

    let authStatus = '';
    if (this.isIbmRequired) {
        const tokenStatus = ibm_token ? 'PROVIDED' : 'MISSING!';
        const instanceStatus = ibm_instance ? 'PROVIDED' : 'MISSING!';
        authStatus = ` (Auth Status: Token: ${tokenStatus}, Instance: ${instanceStatus})`;
    } else {
        const tokenStatus = ibm_token ? 'provided' : 'not provided';
        const instanceStatus = ibm_instance ? 'provided' : 'not provided';
        authStatus = ` (Auth Status: Token: ${tokenStatus}, Instance: ${instanceStatus})`;
    }
    
    console.log('Auth Status:', authStatus);
    this.httpLabel = url;
  }

  runCode(): void {
        if (!this.isFormValid()) {
            console.error('Form is invalid. Cannot run code.');
            return;
        }

        const { iterations, override, ibm_token, ibm_instance } = this.formData;
        
        const optionMatch = this.formData.option.match(/^(\d+)/);
        const runnerNumber = optionMatch ? optionMatch[0] : '1';
        const overwriteValue = override ? 'y' : 'n';

        let finalUrl = `${this.executionUrl}http://172.20.48.130:8080/run_qiskit?iterations=${iterations}&overwrite=${overwriteValue}&runner=${runnerNumber}`;

        if (ibm_token) {
            finalUrl += `&ibm_token=${encodeURIComponent(ibm_token)}`;
        }

        if (ibm_instance) {
            finalUrl += `&ibm_instance=${encodeURIComponent(ibm_instance)}`;
        }
        
        const finalBody = [this.qiskitCode]; 

        console.log('Sending POST Request...');
        console.log('URL:', finalUrl);
        console.log('Body:', finalBody);

        this.http.post(finalUrl, finalBody).subscribe({
            next: (response: any) => {
                console.log('Execution successful!', response);
                alert(`Execution successful! Batch ID: ${response.batch_id}`);
            },
            error: (err) => {
                console.error('Execution failed:', err);
                alert(`Execution failed. Error: ${err.error?.message || err.message}`);
            }
        });
  }

  isFormValid(): boolean {
    if (this.formData.iterations < 1) {
      return false;
    }
    return true;
  }

}