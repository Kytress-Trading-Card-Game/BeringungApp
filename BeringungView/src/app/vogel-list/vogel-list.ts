import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { AppSettingsService } from '../services/app-settings.service';
import { StandortDatenService } from '../services/standort-daten.service';
import { StatsService } from '../services/stats.service';
import { VogelErfassungService } from '../services/vogel-erfassung.service';
import {
  VogelAlter,
  VogelErfassung,
  VogelErfassungQuery,
  VogelGeschlecht,
} from '../models/vogel-erfassung.models';
import { PagedResponse } from '../models/Paging';
import { StandortDaten } from '../models/standort-daten.models';
import { StatKeyValue } from '../models/stats.models';

@Component({
  selector: 'app-vogel-list',
  imports: [RouterLink],
  templateUrl: './vogel-list.html',
  styleUrl: './vogel-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VogelList {
  private readonly vogelService = inject(VogelErfassungService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly standortService = inject(StandortDatenService);
  private readonly statsService = inject(StatsService);

  private readonly currentSeason = new Date().getFullYear();

  protected readonly vogels = signal<PagedResponse<VogelErfassung>>({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    data: [],
  });
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly standorte = signal<StandortDaten[]>([]);
  protected readonly topArten = signal<StatKeyValue[]>([]);
  protected readonly standorteError = signal<string | null>(null);
  protected readonly topArtenError = signal<string | null>(null);

  protected readonly vogelart = signal('');
  protected readonly standort = signal('');
  protected readonly ringnummerPrefix = signal('');
  protected readonly minGewicht = signal('');
  protected readonly maxGewicht = signal('');
  protected readonly minFluegellaenge = signal('');
  protected readonly maxFluegellaenge = signal('');
  protected readonly geschlecht = signal<'all' | '0' | '1' | '2'>('all');
  protected readonly alter = signal<'all' | '0' | '1' | '2'>('all');
  protected readonly wiederfang = signal<'all' | 'true' | 'false'>('false');
  protected readonly vonDatum = signal('');
  protected readonly bisDatum = signal('');
  protected readonly sortBy = signal('beringungsdatum');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);

  protected readonly canPrev = computed(() => this.page() > 1);
  protected readonly canNext = computed(() => this.page() < this.vogels().totalPages);

  protected readonly sortOptions = [
    { value: 'beringungsdatum', label: 'Beringungsdatum' },
    { value: 'ringnummer', label: 'Ringnummer' },
    { value: 'vogelart', label: 'Vogelart' },
    { value: 'gewicht', label: 'Gewicht' },
    { value: 'fluegellaenge', label: 'Flügellänge' },
  ];

  private readonly query = computed<VogelErfassungQuery>(() => {
    return {
      page: this.page(),
      pageSize: this.pageSize(),
      standort: this.standort() || undefined,
      ringnummerPrefix: this.ringnummerPrefix() || undefined,
      vogelart: this.vogelart() || undefined,
      wiederfang: this.wiederfang() === 'all' ? undefined : this.wiederfang() === 'true',
      minGewicht: this.parseNumber(this.minGewicht()),
      maxGewicht: this.parseNumber(this.maxGewicht()),
      minFluegellaenge: this.parseNumber(this.minFluegellaenge()),
      maxFluegellaenge: this.parseNumber(this.maxFluegellaenge()),
      geschlecht: this.parseEnumValue<VogelGeschlecht>(this.geschlecht()),
      alter: this.parseEnumValue<VogelAlter>(this.alter()),
      vonDatum: this.vonDatum() || undefined,
      bisDatum: this.bisDatum() || undefined,
      sortBy: this.sortBy(),
      sortDirection: this.sortDirection(),
    };
  });

  private readonly loadEffect = effect(() => {
    this.loadVogels(this.query());
  });

  constructor() {
    this.loadStandorte();
    this.loadTopArten();
  }

  protected updateVogelart(value: string): void {
    this.vogelart.set(value.trim());
    this.page.set(1);
  }

  protected updateStandort(value: string): void {
    this.standort.set(value.trim());
    this.page.set(1);
  }

  protected updateRingnummerPrefix(value: string): void {
    this.ringnummerPrefix.set(value.trim());
    this.page.set(1);
  }

  protected updateMinGewicht(value: string): void {
    this.minGewicht.set(value.trim());
    this.page.set(1);
  }

  protected updateMaxGewicht(value: string): void {
    this.maxGewicht.set(value.trim());
    this.page.set(1);
  }

  protected updateMinFluegellaenge(value: string): void {
    this.minFluegellaenge.set(value.trim());
    this.page.set(1);
  }

  protected updateMaxFluegellaenge(value: string): void {
    this.maxFluegellaenge.set(value.trim());
    this.page.set(1);
  }

  protected updateGeschlechtFromSelect(value: string): void {
    const normalized = value === '1' || value === '2' || value === '0' ? value : 'all';
    this.geschlecht.set(normalized);
    this.page.set(1);
  }

  protected updateAlterFromSelect(value: string): void {
    const normalized = value === '1' || value === '2' || value === '0' ? value : 'all';
    this.alter.set(normalized);
    this.page.set(1);
  }

  protected updateWiederfang(value: 'all' | 'true' | 'false'): void {
    this.wiederfang.set(value);
    this.page.set(1);
  }

  protected updateWiederfangFromSelect(value: string): void {
    const normalized = value === 'true' || value === 'false' ? value : 'all';
    this.updateWiederfang(normalized);
  }

  protected updateVonDatum(value: string): void {
    this.vonDatum.set(value);
    this.page.set(1);
  }

  protected updateBisDatum(value: string): void {
    this.bisDatum.set(value);
    this.page.set(1);
  }

  protected updateSortBy(value: string): void {
    this.sortBy.set(value);
    this.page.set(1);
  }

  protected updateSortDirection(value: 'asc' | 'desc'): void {
    this.sortDirection.set(value);
    this.page.set(1);
  }

  protected updateSortDirectionFromSelect(value: string): void {
    const normalized = value === 'asc' ? 'asc' : 'desc';
    this.updateSortDirection(normalized);
  }

  protected updatePageSize(value: string): void {
    const next = Number.parseInt(value, 10);
    this.pageSize.set(Number.isNaN(next) ? 25 : next);
    this.page.set(1);
  }

  protected getInputValue(event: Event): string {
    const target = event.target as HTMLInputElement | null;
    return target?.value ?? '';
  }

  protected getSelectValue(event: Event): string {
    const target = event.target as HTMLSelectElement | null;
    return target?.value ?? '';
  }

  protected setPage(next: number): void {
    if (next < 1 || next > this.vogels().totalPages) {
      return;
    }

    this.page.set(next);
  }

  protected resetFilters(): void {
    this.vogelart.set('');
    this.standort.set('');
    this.ringnummerPrefix.set('');
    this.minGewicht.set('');
    this.maxGewicht.set('');
    this.minFluegellaenge.set('');
    this.maxFluegellaenge.set('');
    this.geschlecht.set('all');
    this.alter.set('all');
    this.wiederfang.set('false');
    this.vonDatum.set('');
    this.bisDatum.set('');
    this.sortBy.set('beringungsdatum');
    this.sortDirection.set('desc');
    this.pageSize.set(25);
    this.page.set(1);
  }

  private parseNumber(value: string): number | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private parseEnumValue<T extends number>(value: string): T | undefined {
    if (value === 'all') {
      return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : (parsed as T);
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsed);
  }

  protected formatGeschlecht(value: VogelGeschlecht): string {
    switch (value) {
      case VogelGeschlecht.Männlich:
        return 'Männlich';
      case VogelGeschlecht.Weiblich:
        return 'Weiblich';
      default:
        return 'Unbekannt';
    }
  }

  protected formatAlter(value: VogelAlter): string {
    switch (value) {
      case VogelAlter.Diesjährig:
        return 'Diesjährig';
      case VogelAlter.Nichtdiesjährig:
        return 'Nichtdiesjährig';
      default:
        return 'Unbekannt';
    }
  }

  protected formatGewicht(value: number | null): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return `${this.formatDecimal(value)} g`;
  }

  protected formatFluegellaenge(value: number | null): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return `${this.formatDecimal(value)} mm`;
  }

  private formatDecimal(value: number): string {
    return value.toString().replace('.', ',');
  }

  private loadStandorte(): void {
    this.standorteError.set(null);

    this.standortService
      .getAll()
      .pipe(take(1))
      .subscribe({
        next: (response) => this.standorte.set(response),
        error: () => this.standorteError.set('Standorte konnten nicht geladen werden.'),
      });
  }

  private loadTopArten(): void {
    this.topArtenError.set(null);

    this.appSettingsService
      .getSettings()
      .pipe(take(1))
      .subscribe({
        next: (settings) => {
          if (!settings.activeStandortId) {
            this.topArten.set([]);
            return;
          }

          this.statsService
            .getTopArten(settings.activeStandortId, this.currentSeason)
            .pipe(take(1))
            .subscribe({
              next: (response) => this.topArten.set(response.items ?? []),
              error: () => this.topArtenError.set('Toparten konnten nicht geladen werden.'),
            });
        },
        error: () => this.topArtenError.set('Einstellungen konnten nicht geladen werden.'),
      });
  }

  private loadVogels(query: VogelErfassungQuery): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.vogelService
      .getAll(query)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.vogels.set(response);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.error.set('Vogelliste konnte nicht geladen werden.');
        },
      });
  }
}
