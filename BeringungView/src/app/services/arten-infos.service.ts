import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  ArtenInfos,
  ArtenInfosCreateDto,
  ArtenInfosUpdateDto,
  ArtenInfosTopArtenResponse,
} from '../models/arten-infos.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ArtenInfosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/ArtenInfos`;

  getAll(): Observable<ArtenInfos[]> {
    return this.http.get<ArtenInfos[]>(this.baseUrl);
  }

  create(dto: ArtenInfosCreateDto): Observable<ArtenInfos> {
    return this.http.post<ArtenInfos>(this.baseUrl, dto);
  }

  update(artbezeichnung: string, dto: ArtenInfosUpdateDto): Observable<ArtenInfos> {
    const encoded = encodeURIComponent(artbezeichnung);
    return this.http.put<ArtenInfos>(`${this.baseUrl}/${encoded}`, dto);
  }

  delete(artbezeichnung: string): Observable<void> {
    const encoded = encodeURIComponent(artbezeichnung);
    return this.http.delete<void>(`${this.baseUrl}/${encoded}`);
  }

  getTopArten(standortId: string): Observable<ArtenInfosTopArtenResponse> {
    return this.http.get<ArtenInfosTopArtenResponse>(
      `${this.baseUrl}/top-arten?standortId=${standortId}`,
    );
  }
}
