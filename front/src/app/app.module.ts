import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http'

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MatrixesComponent } from './matrixes/matrixes.component';
import { RouterModule, Routes } from '@angular/router';
import { BlocksComponent } from './blocks/blocks.component';
import { ElongingComponent } from './elonging/elonging.component';
import { GroverComponent } from './grover/grover.component';
import { DeterministicComponent } from './deterministic/deterministic.component';
import { QuantumEditorComponent } from './quantum-editor/quantum-editor.component';
import { TemplatesComponent } from './templates/templates.component';

const appRoutes : Routes = [
  { path : 'matrixes', component : MatrixesComponent },
  { path : 'elonging', component : ElongingComponent },
  { path : 'blocks', component : BlocksComponent },
  { path : 'grover', component : GroverComponent },
  { path : '', redirectTo : '/', pathMatch : 'full'}
]

@NgModule({
  declarations: [
    AppComponent,
    MatrixesComponent,
    BlocksComponent,
    ElongingComponent,
    GroverComponent,
    DeterministicComponent,
    QuantumEditorComponent,
    TemplatesComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forRoot(appRoutes)
  ],
  providers: [ ],
  bootstrap: [AppComponent]
})
export class AppModule { }
