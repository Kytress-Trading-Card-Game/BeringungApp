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
import { forkJoin, take } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { StandortDaten } from '../models/standort-daten.models';
import {
  StatsTrendBucket,
  StatsTrendResponse,
  StatsTrendSeries,
  StatsSeasonResponse,
} from '../models/stats.models';
import { AppSettingsService } from '../services/app-settings.service';
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
  private readonly appSettingsService = inject(AppSettingsService);
  @ViewChild('trendChartCanvas') private trendChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('wiederfangChartCanvas') private wiederfangChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('seasonChartCanvas') private seasonChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('topArtenChartCanvas') private topArtenChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('alterChartCanvas') private alterChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('geschlechtChartCanvas')
  private geschlechtChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthChartCanvas') private monthChartCanvas?: ElementRef<HTMLCanvasElement>;
  private trendChart: Chart<'line'> | null = null;
  private wiederfangChart: Chart | null = null;
  private seasonChart: Chart | null = null;
  private topArtenChart: Chart | null = null;
  private alterChart: Chart | null = null;
  private geschlechtChart: Chart | null = null;
  private monthChart: Chart | null = null;
  private pendingDetailStandortId: string | null = null;
  private readonly currentSeason = new Date().getFullYear();

  protected readonly standorte = signal<StandortDaten[]>([]);
  protected readonly selectedStandortIds = signal<string[]>([]);
  protected readonly bucket = signal<StatsTrendBucket>('month');
  protected readonly fromDate = signal(this.buildDefaultFromDate());
  protected readonly toDate = signal(this.buildDefaultToDate());
  protected readonly trend = signal<StatsTrendResponse | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly activePanel = signal<'vergleich' | 'standort'>('vergleich');
  protected readonly detailStandortId = signal<string | null>(null);
  protected readonly detailStats = signal<StatsSeasonResponse | null>(null);
  protected readonly detailTrend = signal<StatsTrendResponse | null>(null);
  protected readonly isDetailLoading = signal(false);
  protected readonly detailErrorMessage = signal<string | null>(null);

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
    this.loadActiveStandort();
  }

  ngAfterViewInit(): void {
    this.renderTrendChart();
    this.renderDetailCharts();
  }

  ngOnDestroy(): void {
    this.destroyTrendChart();
    this.destroyDetailCharts();
  }

  protected showStandortPanel(): void {
    this.activePanel.set('standort');
    this.renderDetailCharts();
  }

  protected showVergleichPanel(): void {
    this.activePanel.set('vergleich');
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

  protected selectDetailStandort(standortId: string): void {
    if (standortId && standortId !== this.detailStandortId()) {
      this.detailStandortId.set(standortId);
      this.loadDetailStats();
    }
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
          this.ensureDetailStandort();
        },
        error: () => {
          this.errorMessage.set('Standorte konnten nicht geladen werden.');
          this.trend.set(null);
        },
      });
  }

  private loadActiveStandort(): void {
    this.appSettingsService
      .getSettings()
      .pipe(take(1))
      .subscribe({
        next: (settings) => {
          this.ensureDetailStandort(settings.activeStandortId ?? null);
        },
        error: () => {
          this.ensureDetailStandort(null);
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

  private ensureDetailStandort(preferredId?: string | null): void {
    if (preferredId !== undefined) {
      this.pendingDetailStandortId = preferredId;
    }

    const standorte = this.standorte();
    if (standorte.length === 0) {
      return;
    }

    const candidate = this.pendingDetailStandortId;
    const validPreferred = candidate && standorte.some((standort) => standort.id === candidate);
    const nextId = validPreferred ? candidate : standorte[0].id;

    if (nextId && nextId !== this.detailStandortId()) {
      this.detailStandortId.set(nextId);
      this.loadDetailStats();
    }
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

  private loadDetailStats(): void {
    const standortId = this.detailStandortId();
    if (!standortId) {
      this.detailStats.set(null);
      this.detailTrend.set(null);
      this.renderDetailCharts();
      return;
    }

    this.isDetailLoading.set(true);
    this.detailErrorMessage.set(null);

    const seasonStart = `${this.currentSeason}-01-01`;
    const seasonEnd = `${this.currentSeason}-12-31`;

    forkJoin({
      season: this.statsService.getSeasonStats(standortId, this.currentSeason),
      trend: this.statsService.getTrend({
        fromDate: seasonStart,
        toDate: seasonEnd,
        bucket: 'month',
        standortIds: [standortId],
      }),
    })
      .pipe(take(1))
      .subscribe({
        next: ({ season, trend }) => {
          this.detailStats.set(season);
          this.detailTrend.set(trend);
          this.isDetailLoading.set(false);
          this.renderDetailCharts();
        },
        error: () => {
          this.detailStats.set(null);
          this.detailTrend.set(null);
          this.isDetailLoading.set(false);
          this.detailErrorMessage.set('Standort-Statistiken konnten nicht geladen werden.');
          this.renderDetailCharts();
        },
      });
  }

  private renderDetailCharts(): void {
    const stats = this.detailStats();
    if (!stats) {
      this.destroyDetailCharts();
      return;
    }

    this.destroyDetailCharts();

    const wiederfangCanvas = this.wiederfangChartCanvas?.nativeElement;
    const seasonCanvas = this.seasonChartCanvas?.nativeElement;
    const topArtenCanvas = this.topArtenChartCanvas?.nativeElement;
    const alterCanvas = this.alterChartCanvas?.nativeElement;
    const geschlechtCanvas = this.geschlechtChartCanvas?.nativeElement;
    const monthCanvas = this.monthChartCanvas?.nativeElement;

    const erstfangCount = Math.max(stats.totalCurrentSeason - stats.wiederfangCount, 0);
    const topArtenLabels = stats.topArten.map((item) => item.key);
    const topArtenValues = stats.topArten.map((item) => item.count);
    const alterLabels = stats.alterVerteilung.map((item) => item.key);
    const alterValues = stats.alterVerteilung.map((item) => item.count);
    const geschlechtLabels = stats.geschlechtVerteilung.map((item) => item.key);
    const geschlechtValues = stats.geschlechtVerteilung.map((item) => item.count);
    const trend = this.detailTrend();
    const trendLabels = trend?.labels ?? [];
    const trendValues = trend?.series?.[0]?.values ?? [];

    if (wiederfangCanvas) {
      this.wiederfangChart = new Chart(wiederfangCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Erstfund', 'Wiederfund'],
          datasets: [
            {
              data: [erstfangCount, stats.wiederfangCount],
              backgroundColor: ['#2563EB', '#F97316'],
            },
          ],
        },
        options: {
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#475569' },
            },
          },
        },
      });
    }

    if (seasonCanvas) {
      this.seasonChart = new Chart(seasonCanvas, {
        type: 'bar',
        data: {
          labels: [`${this.currentSeason - 1}`, `${this.currentSeason}`],
          datasets: [
            {
              label: 'Beringungen',
              data: [stats.totalPreviousSeason, stats.totalCurrentSeason],
              backgroundColor: ['#CBD5F5', '#2563EB'],
            },
          ],
        },
        options: {
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: { ticks: { color: '#64748B' } },
            y: { beginAtZero: true, ticks: { color: '#64748B', precision: 0 } },
          },
        },
      });
    }

    if (topArtenCanvas) {
      this.topArtenChart = new Chart(topArtenCanvas, {
        type: 'bar',
        data: {
          labels: topArtenLabels,
          datasets: [
            {
              label: 'Anzahl',
              data: topArtenValues,
              backgroundColor: this.chartColors.slice(0, Math.max(topArtenLabels.length, 1)),
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#64748B' } },
            y: { beginAtZero: true, ticks: { color: '#64748B', precision: 0 } },
          },
        },
      });
    }

    if (alterCanvas) {
      this.alterChart = new Chart(alterCanvas, {
        type: 'pie',
        data: {
          labels: alterLabels,
          datasets: [
            {
              data: alterValues,
              backgroundColor: ['#2563EB', '#10B981', '#F97316', '#64748B'],
            },
          ],
        },
        options: {
          plugins: { legend: { position: 'bottom', labels: { color: '#475569' } } },
        },
      });
    }

    if (geschlechtCanvas) {
      this.geschlechtChart = new Chart(geschlechtCanvas, {
        type: 'polarArea',
        data: {
          labels: geschlechtLabels,
          datasets: [
            {
              data: geschlechtValues,
              backgroundColor: ['#2563EB', '#F97316', '#CBD5F5', '#6B7280'],
            },
          ],
        },
        options: {
          plugins: { legend: { position: 'bottom', labels: { color: '#475569' } } },
        },
      });
    }

    if (monthCanvas) {
      this.monthChart = new Chart(monthCanvas, {
        type: 'line',
        data: {
          labels: trendLabels,
          datasets: [
            {
              label: 'Beringungen',
              data: trendValues,
              borderColor: '#2563EB',
              backgroundColor: 'rgba(37, 99, 235, 0.15)',
              tension: 0.4,
              fill: true,
              pointRadius: 3,
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#64748B' } },
            y: { beginAtZero: true, ticks: { color: '#64748B', precision: 0 } },
          },
        },
      });
    }
  }

  private destroyTrendChart(): void {
    if (this.trendChart) {
      this.trendChart.destroy();
      this.trendChart = null;
    }
  }

  private destroyDetailCharts(): void {
    if (this.wiederfangChart) {
      this.wiederfangChart.destroy();
      this.wiederfangChart = null;
    }
    if (this.seasonChart) {
      this.seasonChart.destroy();
      this.seasonChart = null;
    }
    if (this.topArtenChart) {
      this.topArtenChart.destroy();
      this.topArtenChart = null;
    }
    if (this.alterChart) {
      this.alterChart.destroy();
      this.alterChart = null;
    }
    if (this.geschlechtChart) {
      this.geschlechtChart.destroy();
      this.geschlechtChart = null;
    }
    if (this.monthChart) {
      this.monthChart.destroy();
      this.monthChart = null;
    }
  }
}
