import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  VogelErfassung,
  VogelErfassungCreateDto,
	VogelErfassungQuery,
} from '../models/vogel-erfassung.models';
import { environment } from '../../environments/environment';
import { PagedResponse } from '../models/Paging';

@Injectable({ providedIn: 'root' })
export class VogelErfassungService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/VogelErfassung`;

  getAll(query?: VogelErfassungQuery): Observable<PagedResponse<VogelErfassung>> {
    let params = new HttpParams();

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PagedResponse<VogelErfassung>>(this.baseUrl, { params });
  }

  getById(id: string): Observable<VogelErfassung> {
    return this.http.get<VogelErfassung>(`${this.baseUrl}/${id}`);
  }

  getByRingnummer(ringnummer: string): Observable<VogelErfassung[]> {
    return this.http.get<VogelErfassung[]>(`${this.baseUrl}/ringnummer/${ringnummer}`);
  }

  getNextRingnummer(anfangsbuchstabe: string): Observable<{ ringnummer: string }> {
    return this.http.get<{ ringnummer: string }>(
      `${this.baseUrl}/ringnummer/next/${anfangsbuchstabe}`,
    );
  }

  create(dto: VogelErfassungCreateDto): Observable<VogelErfassung> {
    const payload: VogelErfassungCreateDto = {
      ...dto,
      plausibilitaetUeberspringen: dto.plausibilitaetUeberspringen ?? false,
    };

    return this.http.post<VogelErfassung>(this.baseUrl, payload);
  }
}
