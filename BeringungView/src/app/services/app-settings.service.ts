import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AppSettings } from '../models/app-settings.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/AppSettings`;

  getSettings(): Observable<AppSettings> {
    return this.http.get<AppSettings>(this.baseUrl);
  }

  setActiveStandort(standortId: string): Observable<AppSettings> {
    return this.http.put<AppSettings>(`${this.baseUrl}/active-standort/${standortId}`, null);
  }
}
