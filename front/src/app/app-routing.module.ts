import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatrixesComponent } from './matrixes/matrixes.component';
import { BlocksComponent } from './blocks/blocks.component';
import { ElongingComponent } from './elonging/elonging.component';
import { GroverComponent } from './grover/grover.component';
import { DeterministicComponent } from './deterministic/deterministic.component';

const routes: Routes = [
  { path : "matrix", component : MatrixesComponent },
  { path : "grover", component : GroverComponent },
  { path : "elonging", component : ElongingComponent },
  { path : "blocks", component : BlocksComponent },
  { path : "deterministic", component : DeterministicComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
