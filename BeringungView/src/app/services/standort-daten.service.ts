import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  StandortDaten,
  StandortDatenCreateDto,
} from '../models/standort-daten.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StandortDatenService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/StandortDaten`;

  getAll(): Observable<StandortDaten[]> {
    return this.http.get<StandortDaten[]>(this.baseUrl);
  }

  getById(id: string): Observable<StandortDaten> {
    return this.http.get<StandortDaten>(`${this.baseUrl}/${id}`);
  }

  create(dto: StandortDatenCreateDto): Observable<StandortDaten> {
    return this.http.post<StandortDaten>(this.baseUrl, dto);
  }

  update(id: string, standort: StandortDaten): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, standort);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
