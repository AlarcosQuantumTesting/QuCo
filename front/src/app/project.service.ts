// project.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  //private baseUrl = 'http://localhost:8081/projects';
  private baseUrl = environment.qsauronUrl + '/projects';
  //private baseUrl = 'https://c9x3lxf0-8080.uks1.devtunnels.ms/projects';

  constructor(private http: HttpClient) { }

  saveProject(projectData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/save`, projectData);
  }

  deleteProject(requestBody: { projectId: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/delete`, requestBody);
  }

  getProjectsByUser(userEmail: string): Observable<any> {
    const requestBody = { email: userEmail };
    return this.http.post(`${this.baseUrl}/getAllByUser`, requestBody);
  }

  getProjectsName(requestBody: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/getProjectsName`, requestBody);
  }

  getProject(requestBody: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/getProject`, requestBody);
  }
}