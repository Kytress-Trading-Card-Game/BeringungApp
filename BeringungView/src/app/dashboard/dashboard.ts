import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { VogelEintragungForm } from '../vogel-eintragung-form/vogel-eintragung-form';
import { VogelEintragungModalService } from '../services/vogel-eintragung-modal.service';
import { VogelErfassungService } from '../services/vogel-erfassung.service';
import { VogelErfassung } from '../models/vogel-erfassung.models';
import { AppSettingsService } from '../services/app-settings.service';
import { StatsService } from '../services/stats.service';
import { StatsSeasonResponse } from '../models/stats.models';
import { PagedResponse } from '../models/Paging';
import { ToastService } from '../services/toast-message.service';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [VogelEintragungForm, RouterLink, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly modalService = inject(VogelEintragungModalService);
  private readonly vogelErfassungService = inject(VogelErfassungService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly statsService = inject(StatsService);
	private readonly toastService = inject(ToastService);

  protected readonly isModalOpen = this.modalService.isOpen;
  protected readonly recentVogels = signal<PagedResponse<VogelErfassung>>({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    data: [],
  });
  protected readonly stats = signal<StatsSeasonResponse | null>(null);
  protected readonly isStatsLoading = signal(true);
  protected readonly statsError = signal<string | null>(null);
  protected readonly activeStandortName = signal<string | null>(null);
  protected readonly currentSeason: number = new Date().getFullYear();

  constructor() {
    this.loadRecentVogels();
    this.loadStats();
  }

  protected openModal(): void {
    this.modalService.open();
  }

  protected closeModal(): void {
    this.modalService.close();
  }

  private loadRecentVogels(): void {
    this.vogelErfassungService
      .getAll({ page: 1, pageSize: 5 })
      .pipe(take(1))
      .subscribe({
        next: (vogels) => this.recentVogels.set(vogels),
        error: () =>
          this.recentVogels.set({
            page: 1,
            pageSize: 10,
            totalCount: 0,
            totalPages: 0,
            data: [],
          }),
      });
  }

  private loadStats(): void {
    this.isStatsLoading.set(true);
    this.statsError.set(null);

    this.appSettingsService
      .getSettings()
      .pipe(take(1))
      .subscribe({
        next: (settings) => {
          this.activeStandortName.set(settings.activeStandort?.standort ?? null);

          if (!settings.activeStandortId) {
            this.stats.set(null);
            this.isStatsLoading.set(false);
            this.statsError.set('Kein aktiver Standort gesetzt.');
            return;
          }

          this.statsService
            .getSeasonStats(settings.activeStandortId, this.currentSeason)
            .pipe(take(1))
            .subscribe({
              next: (stats) => {
                this.stats.set(stats);
                this.isStatsLoading.set(false);
              },
              error: () => {
                this.isStatsLoading.set(false);
                this.statsError.set('Statistiken konnten nicht geladen werden.');
              },
            });
        },
        error: () => {
          this.isStatsLoading.set(false);
          this.statsError.set('Einstellungen konnten nicht geladen werden.');
        },
      });
  }

  protected formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }

    const rounded = Math.round(value);
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded}%`;
  }

  protected formatNumber(value: number | null | undefined, suffix?: string): string {
    if (value === null || value === undefined) {
      return '-';
    }

    const formatted = value.toFixed(1);
    return suffix ? `${formatted} ${suffix}` : formatted;
  }
}
