import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  StatsAveragesResponse,
  StatsListResponse,
  StatsSeasonResponse,
  StatsTotalsResponse,
  StatsWiederfangResponse,
} from '../models/stats.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/Stats`;

  getSeasonStats(standortId: string, season: number): Observable<StatsSeasonResponse> {
    return this.http.get<StatsSeasonResponse>(
      `${this.baseUrl}?standortId=${standortId}&season=${season}`,
    );
  }

  getTotals(standortId: string, season: number): Observable<StatsTotalsResponse> {
    return this.http.get<StatsTotalsResponse>(
      `${this.baseUrl}/totals?standortId=${standortId}&season=${season}`,
    );
  }

  getWiederfang(standortId: string, season: number): Observable<StatsWiederfangResponse> {
    return this.http.get<StatsWiederfangResponse>(
      `${this.baseUrl}/wiederfang?standortId=${standortId}&season=${season}`,
    );
  }

  getAverages(standortId: string, season: number): Observable<StatsAveragesResponse> {
    return this.http.get<StatsAveragesResponse>(
      `${this.baseUrl}/averages?standortId=${standortId}&season=${season}`,
    );
  }

  getTopArten(standortId: string, season: number): Observable<StatsListResponse> {
    return this.http.get<StatsListResponse>(
      `${this.baseUrl}/top-arten?standortId=${standortId}&season=${season}`,
    );
  }

  getGeschlechtVerteilung(standortId: string, season: number): Observable<StatsListResponse> {
    return this.http.get<StatsListResponse>(
      `${this.baseUrl}/geschlecht?standortId=${standortId}&season=${season}`,
    );
  }

  getAlterVerteilung(standortId: string, season: number): Observable<StatsListResponse> {
    return this.http.get<StatsListResponse>(
      `${this.baseUrl}/alter?standortId=${standortId}&season=${season}`,
    );
  }
}
