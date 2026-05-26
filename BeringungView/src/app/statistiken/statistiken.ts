import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { StandortDaten } from '../models/standort-daten.models';
import {
  StatsTrendBucket,
  StatsTrendResponse,
  StatsTrendSeries,
} from '../models/stats.models';
import { StandortDatenService } from '../services/standort-daten.service';
import { StatsService } from '../services/stats.service';

Chart.register(...registerables);

@Component({
  selector: 'app-statistiken',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './statistiken.html',
  styleUrl: './statistiken.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Statistiken implements AfterViewInit, OnDestroy {
  private readonly statsService = inject(StatsService);
  private readonly standortService = inject(StandortDatenService);
  @ViewChild('trendChartCanvas') private trendChartCanvas?: ElementRef<HTMLCanvasElement>;
  private trendChart: Chart<'line'> | null = null;

  protected readonly standorte = signal<StandortDaten[]>([]);
  protected readonly selectedStandortIds = signal<string[]>([]);
  protected readonly bucket = signal<StatsTrendBucket>('month');
  protected readonly fromDate = signal(this.buildDefaultFromDate());
  protected readonly toDate = signal(this.buildDefaultToDate());
  protected readonly trend = signal<StatsTrendResponse | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

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

  constructor() {
    this.loadStandorte();
  }

  ngAfterViewInit(): void {
    this.renderTrendChart();
  }

  ngOnDestroy(): void {
    this.destroyTrendChart();
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
    this.renderTrendChart();
  }

  protected getSeriesMax(series: StatsTrendSeries): number {
    return series.values.reduce((highest, value) => Math.max(highest, value), 0);
  }

  protected getChartColor(index: number): string {
    return this.chartColors[index % this.chartColors.length];
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
      this.renderTrendChart();
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
          this.renderTrendChart();
        },
        error: () => {
          this.trend.set(null);
          this.isLoading.set(false);
          this.errorMessage.set('Trenddaten konnten nicht geladen werden.');
          this.renderTrendChart();
        },
      });
  }

  private buildDefaultFromDate(): string {
    return this.formatDateInput(new Date(new Date().getFullYear(), 0, 1));
  }

  private buildDefaultToDate(): string {
    return this.formatDateInput(new Date(new Date().getFullYear(), 11, 31));
  }

  private formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private renderTrendChart(): void {
    const canvas = this.trendChartCanvas?.nativeElement;
    const trend = this.trend();

    if (!canvas || !trend) {
      this.destroyTrendChart();
      return;
    }

    this.destroyTrendChart();

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: trend.labels,
        datasets: trend.series.map((series, index) => ({
          label: series.standortName,
          data: series.values,
          borderColor: this.getChartColor(index),
          backgroundColor: this.getChartColor(index),
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBorderWidth: 2,
          pointBackgroundColor: this.getChartColor(index),
          pointBorderColor: '#FFFFFF',
          fill: false,
          tension: 0.4,
          cubicInterpolationMode: 'monotone',
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#475569',
              boxWidth: 14,
              boxHeight: 14,
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: '#F1F5F9',
            },
            ticks: {
              color: '#64748B',
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#E5E9F0',
            },
            ticks: {
              color: '#64748B',
              precision: 0,
            },
          },
        },
      },
    };

    this.trendChart = new Chart(canvas, config);
  }

  private destroyTrendChart(): void {
    if (this.trendChart) {
      this.trendChart.destroy();
      this.trendChart = null;
    }
  }
}
