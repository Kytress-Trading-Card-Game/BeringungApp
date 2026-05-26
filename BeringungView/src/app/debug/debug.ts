import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AppSettingsService } from '../services/app-settings.service';
import { ArtenInfosService } from '../services/arten-infos.service';
import { StandortDatenService } from '../services/standort-daten.service';
import { ToastService } from '../services/toast-message.service';
import { VogelErfassungService } from '../services/vogel-erfassung.service';
import { ArtenInfos } from '../models/arten-infos.models';
import { StandortDaten } from '../models/standort-daten.models';
import { VogelAlter, VogelErfassung, VogelErfassungCreateDto, VogelGeschlecht } from '../models/vogel-erfassung.models';
import { PagedResponse } from '../models/Paging';

interface GeneratedBirdPreview {
  ringnummer: string;
  vogelart: string;
  beringungsdatum: string;
  standort: string;
}

interface CatchPlanEntry {
  date: Date;
  count: number;
  startMinutes: number;
}

@Component({
  selector: 'app-debug',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './debug.html',
  styleUrl: './debug.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Debug implements OnInit {
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly artenInfosService = inject(ArtenInfosService);
  private readonly standortDatenService = inject(StandortDatenService);
  private readonly toastService = inject(ToastService);
  private readonly vogelErfassungService = inject(VogelErfassungService);

  protected readonly isLoading = signal(true);
  protected readonly isGenerating = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly statusMessage = signal('Bereit zum Generieren.');
  protected readonly generatedCount = signal(0);
  protected readonly failedCount = signal(0);
  protected readonly progress = signal(0);
  protected readonly generatedPreview = signal<GeneratedBirdPreview[]>([]);
  protected readonly standorte = signal<StandortDaten[]>([]);
  protected readonly artenInfos = signal<ArtenInfos[]>([]);
  protected readonly selectedArtIds = signal<string[]>([]);
  protected readonly selectedArtCount = computed(() => this.selectedArtIds().length);

  protected readonly form = new FormGroup({
    year: new FormControl(new Date().getFullYear(), {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1990), Validators.max(2100)],
    }),
    count: new FormControl(120, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(5000)],
    }),
    standortId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  protected toggleArt(artbezeichnung: string): void {
    const next = this.selectedArtIds().includes(artbezeichnung)
      ? this.selectedArtIds().filter((value) => value !== artbezeichnung)
      : [...this.selectedArtIds(), artbezeichnung];

    this.selectedArtIds.set(next);
  }

  protected selectAllArten(): void {
    this.selectedArtIds.set(this.artenInfos().map((item) => item.artbezeichnung));
  }

  protected clearArten(): void {
    this.selectedArtIds.set([]);
  }

  protected async generate(): Promise<void> {
    if (this.isGenerating()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const standortId = this.form.controls.standortId.value;
    const selectedStandort = this.standorte().find((item) => item.id === standortId);

    if (!selectedStandort) {
      this.errorMessage.set('Bitte einen Standort auswählen.');
      return;
    }

    const year = this.form.controls.year.value;
    const targetCount = this.form.controls.count.value;
    const selectedArten = this.resolveSelectedArten();

    this.isGenerating.set(true);
    this.errorMessage.set(null);
    this.statusMessage.set(`Starte Generierung fuer ${selectedStandort.standort}.`);
    this.generatedCount.set(0);
    this.failedCount.set(0);
    this.progress.set(0);
    this.generatedPreview.set([]);

    const settings = await firstValueFrom(this.appSettingsService.getSettings());
    const previousStandortId = settings.activeStandortId ?? null;
    let nextRingnummer = await this.resolveStartingRingnummer();

    try {
      if (previousStandortId !== standortId) {
        await firstValueFrom(this.appSettingsService.setActiveStandort(standortId));
      }

      const plans = this.buildCatchPlans(year, targetCount);
      let generated = 0;
      let failed = 0;

      for (const plan of plans) {
        for (let index = 0; index < plan.count; index += 1) {
          const selectedArt = selectedArten.length > 0
            ? selectedArten[this.randomInt(0, selectedArten.length - 1)]
            : null;

          const dto = this.createBirdDto(nextRingnummer, plan.date, plan.startMinutes, index, selectedArt);

          try {
            await firstValueFrom(this.vogelErfassungService.create({ ...dto, plausibilitaetUeberspringen: true }));
            generated += 1;
            this.generatedCount.set(generated);
            this.progress.set(Math.round((generated / targetCount) * 100));
            this.generatedPreview.update((current) => [
              ...current,
              {
                ringnummer: dto.ringnummer,
                vogelart: dto.vogelart ?? 'Ohne Art',
                beringungsdatum: this.formatPreviewDate(dto.beringungsdatum),
                standort: selectedStandort.standort,
              },
            ].slice(-8));
          } catch (error) {
            failed += 1;
            this.failedCount.set(failed);
            this.logGenerationFailure(error, {
              ringnummer: dto.ringnummer,
              standort: selectedStandort.standort,
              vogelart: dto.vogelart ?? null,
              planDate: plan.date,
              plannedCount: plan.count,
              birdIndex: index,
            });
          }

          nextRingnummer = this.incrementRingnummer(nextRingnummer);
          this.statusMessage.set(`Generiere Daten: ${generated}/${targetCount}`);
        }
      }

      this.toastService.success(`${generated} Vogel-Datensätze fuer ${selectedStandort.standort} erzeugt.`);
      this.statusMessage.set(`Fertig. ${generated} Eintraege erzeugt.`);

      if (previousStandortId && previousStandortId !== standortId) {
        await firstValueFrom(this.appSettingsService.setActiveStandort(previousStandortId));
      }
    } catch (error) {
      this.errorMessage.set('Die Generierung ist fehlgeschlagen. Bitte pruefe die Datenbasis.');
      this.statusMessage.set('Generierung abgebrochen.');
      console.error(error);

      if (previousStandortId && previousStandortId !== standortId) {
        try {
          await firstValueFrom(this.appSettingsService.setActiveStandort(previousStandortId));
        } catch {
          // Ignore restore errors in debug tooling.
        }
      }
    } finally {
      this.isGenerating.set(false);
    }
  }

  private async loadData(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const [settings, standorte, artenInfos, birdPage] = await Promise.all([
        firstValueFrom(this.appSettingsService.getSettings()),
        firstValueFrom(this.standortDatenService.getAll()),
        firstValueFrom(this.artenInfosService.getAll()),
        firstValueFrom(this.vogelErfassungService.getAll({ page: 1, pageSize: 50000 }))
          .catch(() => null),
      ]);

      const sortedStandorte = [...standorte].sort((left, right) => left.standort.localeCompare(right.standort, 'de'));
      const sortedArten = [...artenInfos].sort((left, right) => left.artbezeichnung.localeCompare(right.artbezeichnung, 'de'));

      this.standorte.set(sortedStandorte);
      this.artenInfos.set(sortedArten);
      this.selectedArtIds.set(sortedArten.map((item) => item.artbezeichnung));

      const defaultStandortId = settings.activeStandortId
        ?? sortedStandorte[0]?.id
        ?? '';

      this.form.controls.standortId.setValue(defaultStandortId);
      this.form.controls.year.setValue(new Date().getFullYear());

      const highestRingnummer = this.findHighestRingnummer(birdPage?.data ?? []);
      this.generatedPreview.set(highestRingnummer ? [{
        ringnummer: highestRingnummer,
        vogelart: 'Vorhandene Basis',
        beringungsdatum: '-',
        standort: settings.activeStandort?.standort ?? 'Unbekannt',
      }] : []);
    } catch (error) {
      console.error(error);
      this.errorMessage.set('Die Debug-Daten konnten nicht geladen werden.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private resolveSelectedArten(): ArtenInfos[] {
    const selected = new Set(this.selectedArtIds());
    const items = this.artenInfos();

    if (selected.size === 0) {
      return items;
    }

    return items.filter((item) => selected.has(item.artbezeichnung));
  }

  private buildCatchPlans(year: number, targetCount: number): CatchPlanEntry[] {
    const candidates: Array<Omit<CatchPlanEntry, 'count'>> = [];

    for (let week = 0; week < 53; week += 1) {
      const weekStart = new Date(year, 0, 1 + (week * 7));
      const dayCount = this.randomInt(0, 2);
      const days = this.pickRandomDays(weekStart, dayCount);

      for (const day of days) {
        candidates.push({
          date: day,
          startMinutes: this.randomStepInt(14 * 60, 18 * 60, 10),
        });
      }
    }

    const shuffledCandidates = this.shuffle(candidates);
    const plans: CatchPlanEntry[] = [];
    let remaining = targetCount;

    for (const candidate of shuffledCandidates) {
      if (remaining <= 0) {
        break;
      }

      const count = remaining < 20 ? remaining : Math.min(remaining, this.randomInt(20, 50));
      plans.push({
        ...candidate,
        count,
      });
      remaining -= count;
    }

    while (remaining > 0) {
      const count = remaining < 20 ? remaining : Math.min(remaining, this.randomInt(20, 50));
      plans.push({
        date: this.randomDateInYear(year),
        count,
        startMinutes: this.randomStepInt(14 * 60, 18 * 60, 10),
      });
      remaining -= count;
    }

    return plans;
  }

  private pickRandomDays(weekStart: Date, count: number): Date[] {
    const days = new Set<number>();

    while (days.size < count) {
      days.add(this.randomInt(0, 6));
    }

    return [...days].map((offset) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + offset);
      return date;
    }).filter((date) => date.getFullYear() === weekStart.getFullYear());
  }

  private randomDateInYear(year: number): Date {
    const date = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 0);
    const dayCount = Math.max(1, Math.floor((endOfYear.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)));
    date.setDate(date.getDate() + this.randomInt(0, dayCount - 1));
    return date;
  }

  private createBirdDto(
    ringnummer: string,
    catchDate: Date,
    startMinutes: number,
    index: number,
    artenInfo: ArtenInfos | null,
  ): VogelErfassungCreateDto {
    const vogelart = artenInfo?.artbezeichnung ?? null;
    const [gewichtMinRaw, gewichtMaxRaw] = this.resolveRange(
      artenInfo?.minGewicht,
      artenInfo?.maxGewicht,
      [6, 120],
    );
    const [gewichtMin, gewichtMax] = this.constrainRange(gewichtMinRaw, gewichtMaxRaw, 0.1, 5000);
    const [fluegelMin, fluegelMax] = this.resolveRange(
      artenInfo?.minFluegellaenge,
      artenInfo?.maxFluegellaenge,
      [20, 260],
    );

    const timeOffset = index === 0
      ? 0
      : index * this.randomStepInt(30, 60, 10);

    const birdDate = new Date(catchDate);
    birdDate.setHours(0, 0, 0, 0);
    birdDate.setMinutes(Math.min(startMinutes + timeOffset, (23 * 60) + 50));

    return {
      ringnummer,
      beringungsdatum: birdDate.toISOString(),
      wiederfang: this.randomChance(18),
      vogelart,
      gewicht: this.randomNumericRange(gewichtMin, gewichtMax),
      fluegellaenge: this.randomNumericRange(fluegelMin, fluegelMax),
      geschlecht: this.randomChoice([
        VogelGeschlecht.Unbekannt,
        VogelGeschlecht.Männlich,
        VogelGeschlecht.Weiblich,
      ], [12, 44, 44]),
      alter: this.randomChoice([
        VogelAlter.Unbekannt,
        VogelAlter.Diesjährig,
        VogelAlter.Nichtdiesjährig,
      ], [16, 52, 32]),
      bemerkungen: this.randomChance(8)
        ? this.randomChoice([
          'Gefieder leicht feucht.',
          'Kurze Kontrollmessung ohne Auffaelligkeiten.',
          'Vogel wirkte ruhig und in guter Verfassung.',
          'Zusatzkontrolle beim zweiten Fang.',
        ])
        : null,
    };
  }

  private resolveRange(
    minValue: number | null | undefined,
    maxValue: number | null | undefined,
    fallback: [number, number],
  ): [number, number] {
    const min = typeof minValue === 'number' && Number.isFinite(minValue) ? minValue : fallback[0];
    const max = typeof maxValue === 'number' && Number.isFinite(maxValue) ? maxValue : fallback[1];

    if (max < min) {
      return fallback;
    }

    return [min, max];
  }

  private randomNumericRange(min: number, max: number): number {
    const scale = 10;
    const minScaled = Math.round(min * scale);
    const maxScaled = Math.round(max * scale);
    return Number((this.randomInt(minScaled, maxScaled) / scale).toFixed(1));
  }

  private constrainRange(min: number, max: number, hardMin: number, hardMax: number): [number, number] {
    const boundedMin = Math.max(min, hardMin);
    const boundedMax = Math.min(max, hardMax);

    if (boundedMax < boundedMin) {
      return [hardMin, hardMax];
    }

    return [boundedMin, boundedMax];
  }

  private randomChoice<T>(items: T[], weights?: number[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty list.');
    }

    if (!weights || weights.length !== items.length) {
      return items[this.randomInt(0, items.length - 1)];
    }

    const total = weights.reduce((sum, value) => sum + value, 0);
    let cursor = Math.random() * total;

    for (let index = 0; index < items.length; index += 1) {
      cursor -= weights[index];
      if (cursor <= 0) {
        return items[index];
      }
    }

    return items[items.length - 1];
  }

  private shuffle<T>(items: T[]): T[] {
    const clone = [...items];

    for (let index = clone.length - 1; index > 0; index -= 1) {
      const swapIndex = this.randomInt(0, index);
      [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
    }

    return clone;
  }

  private randomStepInt(min: number, max: number, step: number): number {
    const normalizedStep = Math.max(1, Math.floor(step));
    const first = Math.ceil(min / normalizedStep) * normalizedStep;
    const last = Math.floor(max / normalizedStep) * normalizedStep;
    const values: number[] = [];

    for (let value = first; value <= last; value += normalizedStep) {
      values.push(value);
    }

    return values.length > 0 ? values[this.randomInt(0, values.length - 1)] : min;
  }

  private logGenerationFailure(
    error: unknown,
    context: {
      ringnummer: string;
      standort: string;
      vogelart: string | null;
      planDate: Date;
      plannedCount: number;
      birdIndex: number;
    },
  ): void {
    const errorMessages = this.extractErrorMessages(error);

    console.groupCollapsed(
      `[Debug] Speichern fehlgeschlagen fuer ${context.ringnummer} (${errorMessages.length || 1} Fehler)`,
    );
    console.log('Kontext', {
      ...context,
      planDate: this.formatPreviewDate(context.planDate),
    });
    console.log('Fehlermeldungen', errorMessages.length > 0 ? errorMessages : ['Unbekannter Fehler']);
    console.error('Originalfehler', error);
    console.groupEnd();
  }

  private extractErrorMessages(error: unknown): string[] {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error ?? null;

      if (Array.isArray(payload?.errors)) {
        return payload.errors
          .flatMap((item: unknown) => this.normalizeErrorValue(item))
          .filter((item: string) => item.length > 0);
      }

      if (payload?.errors && typeof payload.errors === 'object') {
        return Object.values(payload.errors)
          .flatMap((value) => this.normalizeErrorValue(value))
          .filter((item: string) => item.length > 0);
      }

      return this.normalizeErrorValue(payload?.message ?? error.message ?? error.statusText);
    }

    return this.normalizeErrorValue(error);
  }

  private normalizeErrorValue(value: unknown): string[] {
    if (typeof value === 'string') {
      return [value];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.normalizeErrorValue(item));
    }

    if (value && typeof value === 'object') {
      return Object.values(value).flatMap((item) => this.normalizeErrorValue(item));
    }

    if (value === null || value === undefined) {
      return [];
    }

    return [String(value)];
  }

  private randomChance(percent: number): boolean {
    return Math.random() * 100 < percent;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private formatPreviewDate(value: string | Date): string {
    return new Date(value).toLocaleString('de-DE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  private findHighestRingnummer(vogels: VogelErfassung[]): string | null {
    const valid = vogels
      .map((item) => item.ringnummer?.trim().toUpperCase() ?? '')
      .filter((value) => /^[A-Z][0-9][A-Z][0-9]{4}$/.test(value))
      .sort((left, right) => left.localeCompare(right));

    return valid[valid.length - 1] ?? null;
  }

  private async resolveStartingRingnummer(): Promise<string> {
    const response: PagedResponse<VogelErfassung> = await firstValueFrom(
      this.vogelErfassungService.getAll({ page: 1, pageSize: 50000 }),
    ).catch(() => ({
      page: 1,
      pageSize: 0,
      totalCount: 0,
      totalPages: 0,
      data: [],
    }));

    const highest = this.findHighestRingnummer(response.data);
    return highest ? this.incrementRingnummer(highest) : 'A0A0001';
  }

  private incrementRingnummer(currentRingnummer: string): string {
    if (!/^[A-Z][0-9][A-Z][0-9]{4}$/.test(currentRingnummer)) {
      return 'A0A0001';
    }

    const hauptBuchstabe = currentRingnummer[0];
    const ziffer = currentRingnummer[1];
    let nebenBuchstabe = currentRingnummer[2];
    let nummer = Number.parseInt(currentRingnummer.slice(3), 10);

    nummer += 1;

    if (nummer <= 9999) {
      return `${hauptBuchstabe}${ziffer}${nebenBuchstabe}${nummer.toString().padStart(4, '0')}`;
    }

    nummer = 1;
    nebenBuchstabe = String.fromCharCode(nebenBuchstabe.charCodeAt(0) + 1);

    if (nebenBuchstabe <= 'Z') {
      return `${hauptBuchstabe}${ziffer}${nebenBuchstabe}${nummer.toString().padStart(4, '0')}`;
    }

    nebenBuchstabe = 'A';
    const zifferInt = Number.parseInt(ziffer, 10) + 1;

    if (zifferInt <= 9) {
      return `${hauptBuchstabe}${zifferInt}${nebenBuchstabe}${nummer.toString().padStart(4, '0')}`;
    }

    throw new Error('Maximale Ringnummer fuer diesen Buchstaben erreicht');
  }
}
