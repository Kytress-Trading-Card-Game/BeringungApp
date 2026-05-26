import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { StandortDaten } from '../models/standort-daten.models';
import {
  StatsTrendBucket,
  StatsTrendResponse,
  StatsTrendSeries,
} from '../models/stats.models';
import { StandortDatenService } from '../services/standort-daten.service';
import { StatsService } from '../services/stats.service';

interface ChartPoint {
  x: number;
  y: number;
  value: number;
}

interface ChartSeries extends StatsTrendSeries {
  color: string;
  points: ChartPoint[];
  path: string;
}

interface ChartLabel {
  label: string;
  x: number;
}

interface ChartTick {
  value: number;
  y: number;
}

interface ChartModel {
  labels: ChartLabel[];
  yTicks: ChartTick[];
  series: ChartSeries[];
  maxValue: number;
}

@Component({
  selector: 'app-statistiken',
  imports: [RouterLink],
  templateUrl: './statistiken.html',
  styleUrl: './statistiken.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Statistiken {
  private readonly statsService = inject(StatsService);
  private readonly standortService = inject(StandortDatenService);

  protected readonly standorte = signal<StandortDaten[]>([]);
  protected readonly selectedStandortIds = signal<string[]>([]);
  protected readonly bucket = signal<StatsTrendBucket>('month');
  protected readonly fromDate = signal(this.buildDefaultFromDate());
  protected readonly toDate = signal(this.buildTodayDate());
  protected readonly trend = signal<StatsTrendResponse | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly chartWidth = 1200;
  protected readonly chartHeight = 420;
  protected readonly chartPadding = { top: 28, right: 24, bottom: 56, left: 72 };

  protected readonly chartColors = [
    '#1E4E8C',
    '#19A27B',
    '#D97706',
    '#C2410C',
    '#7C3AED',
    '#0F766E',
    '#DB2777',
    '#2563EB',
  ];

  protected readonly chartModel = computed<ChartModel | null>(() => {
    const trend = this.trend();

    if (!trend) {
      return null;
    }

    const maxValue = Math.max(1, trend.maxValue);
    const innerWidth = this.chartWidth - this.chartPadding.left - this.chartPadding.right;
    const innerHeight = this.chartHeight - this.chartPadding.top - this.chartPadding.bottom;
    const labelCount = trend.labels.length;

    return {
      labels: trend.labels.map((label, index) => ({
        label,
        x:
          labelCount === 1
            ? this.chartPadding.left + innerWidth / 2
            : this.chartPadding.left + (innerWidth * index) / (labelCount - 1),
      })),
      yTicks: this.buildTicks(maxValue),
      series: trend.series.map((series, index) => {
        const pointCount = series.values.length;
        const points = series.values.map((value, valueIndex) => {
          const x =
            pointCount === 1
              ? this.chartPadding.left + innerWidth / 2
              : this.chartPadding.left + (innerWidth * valueIndex) / (pointCount - 1);
          const y = this.chartPadding.top + innerHeight - (innerHeight * value) / maxValue;

          return { x, y, value };
        });

        return {
          ...series,
          color: this.chartColors[index % this.chartColors.length],
          points,
          path: this.buildPath(points),
        };
      }),
      maxValue,
    };
  });

  constructor() {
    this.loadStandorte();
  }

  protected updateBucket(value: string): void {
    this.bucket.set(value === 'year' ? 'year' : 'month');
    this.loadTrend();
  }

  protected updateFromDate(value: string): void {
    this.fromDate.set(value);
    this.loadTrend();
  }

  protected updateToDate(value: string): void {
    this.toDate.set(value);
    this.loadTrend();
  }

  protected toggleStandort(standortId: string, checked: boolean): void {
    const selected = new Set(this.selectedStandortIds());

    if (checked) {
      selected.add(standortId);
    } else {
      selected.delete(standortId);
    }

    this.selectedStandortIds.set([...selected]);
    this.loadTrend();
  }

  protected selectAllStandorte(): void {
    this.selectedStandortIds.set(this.standorte().map((standort) => standort.id));
    this.loadTrend();
  }

  protected clearStandorte(): void {
    this.selectedStandortIds.set([]);
    this.trend.set(null);
  }

  protected getSeriesMax(series: StatsTrendSeries): number {
    return series.values.reduce((highest, value) => Math.max(highest, value), 0);
  }

  protected formatAxisLabel(value: number): string {
    return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value);
  }

  private loadStandorte(): void {
    this.standortService
      .getAll()
      .pipe(take(1))
      .subscribe({
        next: (standorte) => {
          this.standorte.set(standorte);
          this.selectedStandortIds.set(standorte.map((standort) => standort.id));
          this.loadTrend();
        },
        error: () => {
          this.errorMessage.set('Standorte konnten nicht geladen werden.');
          this.trend.set(null);
        },
      });
  }

  private loadTrend(): void {
    const selectedStandortIds = this.selectedStandortIds();

    if (selectedStandortIds.length === 0) {
      this.isLoading.set(false);
      this.errorMessage.set(null);
      this.trend.set(null);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.statsService
      .getTrend({
        fromDate: this.fromDate(),
        toDate: this.toDate(),
        bucket: this.bucket(),
        standortIds: selectedStandortIds,
      })
      .pipe(take(1))
      .subscribe({
        next: (trend) => {
          this.trend.set(trend);
          this.isLoading.set(false);
        },
        error: () => {
          this.trend.set(null);
          this.isLoading.set(false);
          this.errorMessage.set('Trenddaten konnten nicht geladen werden.');
        },
      });
  }

  private buildDefaultFromDate(): string {
    return this.formatDateInput(new Date(new Date().getFullYear(), 0, 1));
  }

  private buildTodayDate(): string {
    return this.formatDateInput(new Date());
  }

  private formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private buildPath(points: ChartPoint[]): string {
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(' ');
  }

  private buildTicks(maxValue: number): ChartTick[] {
    const innerHeight = this.chartHeight - this.chartPadding.top - this.chartPadding.bottom;

    return [4, 3, 2, 1, 0].map((step) => {
      const value = Math.round((maxValue * step) / 4);
      const y = this.chartPadding.top + innerHeight - (innerHeight * value) / maxValue;
      return { value, y };
    });
  }
}
