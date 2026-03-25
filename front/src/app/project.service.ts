// project.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private baseUrl = environment.qsauronUrl + 'projects';
  private baseUrl2 = environment.qsauronUrl + 'qucoreper';

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
    return this.http.post(`${this.baseUrl2}/getProjectsName`, requestBody);
  }

  getProject(requestBody: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/getProject`, requestBody);
  }
}