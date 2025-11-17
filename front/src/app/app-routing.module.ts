import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatrixesComponent } from './matrixes/matrixes.component';
import { BlocksComponent } from './blocks/blocks.component';
import { ElongingComponent } from './elonging/elonging.component';
import { DeterministicComponent } from './deterministic/deterministic.component';
import { CircuitEditorComponent } from './circuit-editor/circuit-editor.component';
import { TemplatesComponent } from './templates/templates.component';
import { QubitsConfigurationComponent } from './qubits-configuration/qubits-configuration.component';
import { HomeComponent } from './home/home.component';
import { CanDeactivateGuard } from './CanDeactivateGuard';
import { TranspilationComponent } from './transpilation/transpilation.component';
import { ExecutionHistoryComponent } from './execution-history/execution-history.component';

const routes: Routes = [
  { path: "", redirectTo: "/home", pathMatch: "full" },
  { path: "matrix", component: MatrixesComponent },
  { path: "elonging", component: ElongingComponent, canDeactivate: [CanDeactivateGuard] },
  { path: "blocks", component: BlocksComponent, canDeactivate: [CanDeactivateGuard] },
  { path: "grenoble", component: DeterministicComponent },
  { path: "editor", component: CircuitEditorComponent },
  { path: "templates", component: TemplatesComponent },
  { path: "qubits-configuration", component: QubitsConfigurationComponent },
  { path: "transpilation", component: TranspilationComponent },
  { path: 'execution-history', component: ExecutionHistoryComponent },
  { path: "home", component: HomeComponent },

];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
