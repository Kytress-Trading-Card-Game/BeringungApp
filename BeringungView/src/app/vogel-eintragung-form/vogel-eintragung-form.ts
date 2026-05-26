import { AfterViewInit, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { take } from 'rxjs';
import { RouterLink } from '@angular/router';

import {
  VogelAlter,
  VogelErfassung,
  VogelErfassungCreateDto,
  VogelGeschlecht,
} from '../models/vogel-erfassung.models';
import { ArtenInfos } from '../models/arten-infos.models';
import { VogelErfassungService } from '../services/vogel-erfassung.service';
import { VogelEintragungModalService } from '../services/vogel-eintragung-modal.service';
import { ToastService } from '../services/toast-message.service';
import { AppSettingsService } from '../services/app-settings.service';
import { AppSettings } from '../models/app-settings.models';
import { ArtenInfosService } from '../services/arten-infos.service';
import { StatKeyValue } from '../models/stats.models';

@Component({
  selector: 'app-vogel-eintragung-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './vogel-eintragung-form.html',
  styleUrl: './vogel-eintragung-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VogelEintragungForm implements AfterViewInit {
  private readonly vogelErfassungService = inject(VogelErfassungService);
  private readonly modalService = inject(VogelEintragungModalService);
  private readonly toastService = inject(ToastService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly artenInfosService = inject(ArtenInfosService);

  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly serverIssues = signal<string[]>([]);
  protected readonly isServerIssuesOpen = signal(false);
  protected readonly isLoadingSettings = signal(true);
  protected readonly settings = signal<AppSettings | null>(null);
  protected readonly topArten = signal<StatKeyValue[]>([]);
  protected readonly isLoadingArten = signal(false);
  protected readonly showArtSuggestions = signal(false);
  protected readonly vogelartQuery = signal('');
  protected readonly artenInfos = signal<ArtenInfos[]>([]);
  private lastRingnummerValue = '';
  private suppressRingnummerLookup = false;
  private retryDto: VogelErfassungCreateDto | null = null;

  protected readonly geschlechter = [
    { value: VogelGeschlecht.Unbekannt, label: 'Unbekannt' },
    { value: VogelGeschlecht.Männlich, label: 'Männlich' },
    { value: VogelGeschlecht.Weiblich, label: 'Weiblich' },
  ];

  protected readonly alterStufen = [
    { value: VogelAlter.Unbekannt, label: 'Unbekannt' },
    { value: VogelAlter.Diesjährig, label: 'Diesjährig' },
    { value: VogelAlter.Nichtdiesjährig, label: 'Nichtdiesjährig' },
  ];

  protected readonly form = new FormGroup({
    Ringnummer: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30)],
    }),
    Beringungsdatum: new FormControl(this.todayDate(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    Wiederfang: new FormControl(false, { nonNullable: true }),
    Vogelart: new FormControl<string | null>(null, {
      validators: [Validators.maxLength(100)],
    }),
    Gewicht: new FormControl<string | null>(null, {
      validators: [Validators.required, Validators.maxLength(10)],
    }),
    Fluegellaenge: new FormControl<string | null>(null, {
      validators: [Validators.required, Validators.maxLength(10)],
    }),
    Geschlecht: new FormControl(VogelGeschlecht.Unbekannt, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    Alter: new FormControl(VogelAlter.Unbekannt, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    Bemerkungen: new FormControl<string | null>(null, {
      validators: [Validators.maxLength(500)],
    }),
  });

  constructor() {
    this.loadSettings();
    this.loadArtenInfos();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.focusField('ringnummer'), 0);
  }

  protected submit(): void {
    if (this.isSaving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const gewichtValue = this.normalizeNumber(this.form.controls.Gewicht.value);
    const fluegelValue = this.normalizeNumber(this.form.controls.Fluegellaenge.value);

    if (!this.validateNumericRange('Gewicht', gewichtValue, 0.1, 5000)) {
      return;
    }

    if (!this.validateNumericRange('Fluegellaenge', fluegelValue, 0.1, 1000)) {
      return;
    }

    const dto: VogelErfassungCreateDto = {
      ringnummer: raw.Ringnummer.trim(),
      beringungsdatum: this.toIsoDate(raw.Beringungsdatum),
      wiederfang: raw.Wiederfang,
      vogelart: raw.Vogelart?.trim() || null,
      gewicht: gewichtValue,
      fluegellaenge: fluegelValue,
      geschlecht: raw.Geschlecht,
      alter: raw.Alter,
      bemerkungen: raw.Bemerkungen?.trim() || null,
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);

    this.vogelErfassungService
      .create(dto)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.incrementArtCount(dto.vogelart);
          this.toastService.success('Vogel erfolgreich eingetragen.');
          this.resetForm();
          this.focusField('ringnummer');
        },
        error: (err) => {
          this.isSaving.set(false);
          console.log('Error: ', err);
          const issues = this.extractServerIssues(err);
          if (issues && issues.length > 0) {
            this.retryDto = dto;
            this.serverIssues.set(issues);
            this.isServerIssuesOpen.set(true);
            this.openServerIssuesPortal();
            return;
          }

          this.errorMessage.set('Speichern fehlgeschlagen. Bitte prüfe die Eingaben.');
        },
      });
  }

  protected closeServerIssues(): void {
    this.serverIssues.set([]);
    this.isServerIssuesOpen.set(false);
    this.retryDto = null;
    this.closeServerIssuesPortal();
  }

  protected forceSave(): void {
    if (!this.retryDto) {
      return;
    }

    const dto = { ...this.retryDto, plausibilitaetUeberspringen: true } as VogelErfassungCreateDto;
    this.isSaving.set(true);
    this.errorMessage.set(null);

    this.vogelErfassungService
      .create(dto)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeServerIssues();
          this.incrementArtCount(dto.vogelart);
          this.toastService.success('Vogel erfolgreich eingetragen.');
          this.resetForm();
          this.focusField('ringnummer');
        },
        error: (err) => {
          this.isSaving.set(false);
          const issues = this.extractServerIssues(err);
          if (issues && issues.length > 0) {
            this.serverIssues.set(issues);
            this.isServerIssuesOpen.set(true);
            this.openServerIssuesPortal();
            return;
          }

          this.errorMessage.set('Speichern fehlgeschlagen. Bitte pruefe die Eingaben.');
        },
      });
  }

  protected onRingnummerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }

    event.preventDefault();
    this.focusField('vogelart');
  }

  protected onRingnummerInput(value: string): void {
    const trimmed = value.trim();
    const wasEmpty = this.lastRingnummerValue.trim().length === 0;
    this.lastRingnummerValue = value;

    if (!wasEmpty || trimmed.length !== 1) {
      return;
    }

    const prefix = trimmed.toUpperCase();
    this.suppressRingnummerLookup = true;
    this.vogelErfassungService
      .getNextRingnummer(prefix)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.form.controls.Ringnummer.setValue(response.ringnummer);
          this.lastRingnummerValue = response.ringnummer;
          this.focusField('vogelart');
        },
        error: () => {
          this.suppressRingnummerLookup = false;
        },
      });
  }

  protected onRingnummerBlur(value: string): void {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    if (this.suppressRingnummerLookup) {
      this.suppressRingnummerLookup = false;
      return;
    }

    this.vogelErfassungService
      .getByRingnummer(trimmed)
      .pipe(take(1))
      .subscribe({
        next: (entries) => {
          const latest = entries?.[0];
          if (!latest) {
            return;
          }
          this.applyExistingErfassung(latest);
        },
        error: () => undefined,
      });
  }

  protected cancel(): void {
    this.resetForm();
    this.modalService.close();
  }

  private loadSettings(): void {
    this.isLoadingSettings.set(true);
    this.appSettingsService
      .getSettings()
      .pipe(take(1))
      .subscribe({
        next: (settings) => {
          this.settings.set(settings);
          this.isLoadingSettings.set(false);
          if (settings.activeStandortId) {
            this.loadTopArten(settings.activeStandortId);
          } else {
            this.topArten.set([]);
          }
        },
        error: () => {
          this.isLoadingSettings.set(false);
        },
      });
  }

  protected onVogelartInput(value: string): void {
    this.vogelartQuery.set(value);
    this.showArtSuggestions.set(true);
  }

  protected onVogelartFocus(): void {
    this.showArtSuggestions.set(true);
  }

  protected onVogelartBlur(): void {
    this.showArtSuggestions.set(false);
    this.tryAutoRingnummerForArt(this.form.controls.Vogelart.value ?? '');
  }

  protected onVogelartKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }

    const suggestion = this.filteredArtSuggestions()[0];
    if (!suggestion) {
      return;
    }

    event.preventDefault();
    this.applyArtSuggestion(suggestion.key);
    this.focusField('gewicht');
  }

  protected applyArtSuggestion(value: string): void {
    this.form.controls.Vogelart.setValue(value);
    this.vogelartQuery.set(value);
    this.showArtSuggestions.set(false);
    this.tryAutoRingnummerForArt(value);
  }

  protected onGeschlechtChange(): void {
    this.focusField('alter');
  }

  protected onGeschlechtKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.form.controls.Geschlecht.setValue(VogelGeschlecht.Männlich);
      this.focusField('alter');
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.form.controls.Geschlecht.setValue(VogelGeschlecht.Weiblich);
      this.focusField('alter');
      return;
    }

    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusField('alter');
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusField('vogelart');
    }
  }

  protected onAlterChange(): void {
    this.focusField('save-button');
  }

  protected onAlterKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusField('save-button');
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusField('geschlecht');
    }
  }

  protected onFluegellaengeInput(value: string): void {
    const leadingDigits = this.getAutoCommaLeadingDigits('Fluegellaenge');
    const formatted = this.formatDecimalInput(
      value,
      true,
      leadingDigits,
    );
    if (formatted !== value) {
      this.form.controls.Fluegellaenge.setValue(formatted, { emitEvent: false });
    }

    if (formatted.trim().length >= leadingDigits + 1) {
      this.focusField('geschlecht');
    }
  }

  protected onFluegellaengeKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusField('geschlecht');
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusField('gewicht');
    }
  }

  protected onGewichtInput(value: string): void {
    const leadingDigits = this.getAutoCommaLeadingDigits('Gewicht');
    const formatted = this.formatDecimalInput(
      value,
      true,
      leadingDigits,
    );
    if (formatted !== value) {
      this.form.controls.Gewicht.setValue(formatted, { emitEvent: false });
    }

    if (formatted.trim().length >= leadingDigits + 1) {
      this.focusField('fluegellaenge');
    }
  }

  protected onGewichtKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusField('fluegellaenge');
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusField('vogelart');
    }
  }

  protected onSaveKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusField('ringnummer');
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusField('alter');
    }
  }

  protected filteredArtSuggestions(): StatKeyValue[] {
    const query = this.vogelartQuery().trim().toLowerCase();
    const items = this.topArten();
    if (!query) {
      return items;
    }

    return items.filter((item) => item.key.toLowerCase().startsWith(query));
  }

  private loadTopArten(standortId: string): void {
    this.isLoadingArten.set(true);
    this.artenInfosService
      .getTopArten(standortId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.topArten.set(response.items ?? []);
          this.isLoadingArten.set(false);
        },
        error: () => {
          this.topArten.set([]);
          this.isLoadingArten.set(false);
        },
      });
  }

  private loadArtenInfos(): void {
    this.artenInfosService
      .getAll()
      .pipe(take(1))
      .subscribe({
        next: (items) => {
          this.artenInfos.set(items ?? []);
        },
        error: () => {
          this.artenInfos.set([]);
        },
      });
  }

  private todayDate(): string {
    return new Date().toISOString().slice(0, 16);
  }

  private resetForm(): void {
    this.form.reset({
      Ringnummer: '',
      Beringungsdatum: this.todayDate(),
      Wiederfang: false,
      Vogelart: null,
      Gewicht: null,
      Fluegellaenge: null,
      Geschlecht: VogelGeschlecht.Unbekannt,
      Alter: VogelAlter.Unbekannt,
      Bemerkungen: null,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.errorMessage.set(null);
    this.vogelartQuery.set('');
    this.showArtSuggestions.set(false);
    this.lastRingnummerValue = '';
    this.suppressRingnummerLookup = false;
  }

  private toIsoDate(value: string): string {
    return new Date(value).toISOString();
  }

  private toLocalDateTime(value: string | null | undefined): string {
    if (!value) {
      return this.todayDate();
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return this.todayDate();
    }

    return parsed.toISOString().slice(0, 16);
  }

  private formatNumberInput(value: number | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    return value.toString().replace('.', ',');
  }

  private applyExistingErfassung(entry: VogelErfassung): void {
    this.form.patchValue({
      Ringnummer: entry.ringnummer ?? '',
      Beringungsdatum: this.toLocalDateTime(entry.beringungsdatum),
      Wiederfang: true,
      Vogelart: entry.vogelart ?? null,
      Geschlecht: entry.geschlecht ?? VogelGeschlecht.Unbekannt,
      Alter: entry.alter ?? VogelAlter.Unbekannt,
      Bemerkungen: entry.bemerkungen ?? null,
    });
    this.vogelartQuery.set(entry.vogelart ?? '');
    this.showArtSuggestions.set(false);
    this.focusField('gewicht');
  }

  private incrementArtCount(vogelart: string | null): void {
    const artName = vogelart?.trim();
    if (!artName) {
      return;
    }

    const art = this.artenInfos().find(
      (item) => item.artbezeichnung.trim().toLowerCase() === artName.toLowerCase(),
    );

    if (!art) {
      return;
    }

    this.topArten.update((current) => {
      const normalized = art.artbezeichnung.trim().toLowerCase();
      const index = current.findIndex((item) => item.key.trim().toLowerCase() === normalized);

      if (index < 0) {
        return [...current, { key: art.artbezeichnung, count: 1 }];
      }

      const next = [...current];
      next[index] = { ...next[index], count: next[index].count + 1 };
      return next;
    });
  }

  private tryAutoRingnummerForArt(value: string): void {
    const currentRingnummer = this.form.controls.Ringnummer.value.trim();
    if (currentRingnummer.length > 0 || this.suppressRingnummerLookup) {
      return;
    }

    const artName = value.trim();
    if (!artName) {
      return;
    }

    const art = this.artenInfos().find(
      (item) => item.artbezeichnung.trim().toLowerCase() === artName.toLowerCase(),
    );
    const prefix = art?.ringnummerTyp?.trim().toUpperCase() ?? '';
    const letter = prefix.length > 0 ? prefix[0] : '';

    if (!/^[A-Z]$/.test(letter)) {
      return;
    }

    this.suppressRingnummerLookup = true;
    this.vogelErfassungService
      .getNextRingnummer(letter)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.form.controls.Ringnummer.setValue(response.ringnummer);
          this.lastRingnummerValue = response.ringnummer;
        },
        error: () => {
          this.suppressRingnummerLookup = false;
        },
      });
  }

  private normalizeNumber(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const normalized = value.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private sanitizeNumericInput(value: string): string {
    const cleaned = value.replace(/[^0-9,]/g, '');
    const parts = cleaned.split(',');
    if (parts.length <= 2) {
      return cleaned;
    }

    return `${parts[0]},${parts.slice(1).join('')}`;
  }

  private formatDecimalInput(value: string, autoComma: boolean, leadingDigits: number): string {
    const digitsOnly = value.replace(/\D/g, '');
    const hasComma = value.includes(',');
    const normalizedLeadingDigits = Math.max(1, leadingDigits);

    if (autoComma && !hasComma && digitsOnly.length === normalizedLeadingDigits + 1) {
      return `${digitsOnly.slice(0, normalizedLeadingDigits)},${digitsOnly.slice(normalizedLeadingDigits)}`;
    }

    return this.sanitizeNumericInput(value);
  }

  private getAutoCommaLeadingDigits(controlName: 'Gewicht' | 'Fluegellaenge'): number {
    const artName = this.form.controls.Vogelart.value?.trim().toLowerCase() ?? '';
    if (!artName) {
      return 2;
    }

    const art = this.artenInfos().find(
      (item) => item.artbezeichnung.trim().toLowerCase() === artName,
    );

    if (!art) {
      return 2;
    }

    if (controlName === 'Gewicht') {
      return (art.minGewicht ?? 0) > 99 ? 3 : 2;
    }

    return (art.minFluegellaenge ?? 0) > 99 ? 3 : 2;
  }

  private validateNumericRange(
    controlName: 'Gewicht' | 'Fluegellaenge',
    value: number | null,
    min: number,
    max: number,
  ): boolean {
    const control = this.form.controls[controlName];
    if (value === null) {
      control.setErrors({ required: true });
      control.markAsTouched();
      this.errorMessage.set('Bitte gültige Zahlenwerte eingeben.');
      return false;
    }

    if (value < min || value > max) {
      control.setErrors({ range: true });
      control.markAsTouched();
      this.errorMessage.set('Messwerte liegen ausserhalb der erlaubten Bereiche.');
      return false;
    }

    control.setErrors(null);
    return true;
  }

  private focusField(id: string): void {
    const target = document.getElementById(id) as HTMLElement | null;
    target?.focus();
  }

  private extractServerIssues(err: any): string[] | null {
    if (!err) return null;
    const payload = err.error ?? err;

    // Direct array of strings
    if (Array.isArray(payload) && payload.every((p: any) => typeof p === 'string')) {
      return payload as string[];
    }

    // Shape: { errors: [ ... ] }
    if (payload && Array.isArray(payload.errors) && payload.errors.every((p: any) => typeof p === 'string')) {
      return payload.errors as string[];
    }

    // Shape: { errors: { field: ["msg"] } }
    if (payload && payload.errors && typeof payload.errors === 'object' && !Array.isArray(payload.errors)) {
      const flattened: string[] = [];
      Object.values(payload.errors).forEach((v) => {
        if (Array.isArray(v)) {
          v.forEach((it) => {
            if (typeof it === 'string') flattened.push(it);
          });
        } else if (typeof v === 'string') {
          flattened.push(v);
        }
      });
      if (flattened.length > 0) return flattened;
    }

    return null;
  }

  // Portal rendering to attach the modal to document.body and avoid nesting/stacking issues
  private portalBackdrop: HTMLElement | null = null;
  private portalShell: HTMLElement | null = null;

  private openServerIssuesPortal(): void {
    this.closeServerIssuesPortal();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('role', 'presentation');
    backdrop.addEventListener('click', () => this.closeServerIssues());

    const shell = document.createElement('div');
    shell.className = 'modal-shell';
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-modal', 'true');
    shell.setAttribute('aria-labelledby', 'server-issues-title');

    const card = document.createElement('div');
    card.className = 'modal-card';

    // header
    const header = document.createElement('div');
    header.className = 'modal-header';
    const headerLeft = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.id = 'server-issues-title';
    h3.className = 'text-xl font-semibold text-[color:var(--ink-900)] mt-4';
    h3.textContent = 'Plausibilitätsprüfung fehlgeschlagen';
    const p = document.createElement('p');
    p.className = 'mt-1 text-sm text-[color:var(--ink-500)]';
    p.textContent = 'Es wurden Probleme gefunden. Möchtest du den Vogel trotzdem speichern?';
    headerLeft.appendChild(h3);
    headerLeft.appendChild(p);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6l-12 12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" /></svg>';
    closeBtn.addEventListener('click', () => this.closeServerIssues());

    header.appendChild(headerLeft);
    header.appendChild(closeBtn);

    card.appendChild(header);

    // issues list
    const list = document.createElement('div');
    list.className = 'mt-5 grid gap-2';
    const issues = this.serverIssues();
    issues.forEach((issue) => {
      const item = document.createElement('div');
      item.className = 'rounded-2xl border border-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--ink-700)]';
      item.textContent = issue;
      list.appendChild(item);
    });

    card.appendChild(list);

    // actions
    const actions = document.createElement('div');
    actions.className = 'mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'rounded-xl border border-[color:var(--surface-muted)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink-700)] cursor-pointer';
    cancelBtn.textContent = 'Abbrechen';
    cancelBtn.addEventListener('click', () => this.closeServerIssues());

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'rounded-xl bg-[color:var(--accent-500)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--accent-700)] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer';
    saveBtn.textContent = this.isSaving() ? 'Speichern...' : 'Trotzdem speichern';
    saveBtn.addEventListener('click', () => this.forceSave());

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    card.appendChild(actions);

    shell.appendChild(card);

    // If there's an existing modal-card (we're inside a modal), attach overlay inside it
    const modalCards = Array.from(document.querySelectorAll('.modal-card')) as HTMLElement[];
    if (modalCards.length > 0) {
      const topCard = modalCards[modalCards.length - 1];
      // create an absolute overlay inside the top modal-card
      const overlay = document.createElement('div');
      overlay.className = 'server-issues-overlay';
      overlay.appendChild(card);
      topCard.style.position = topCard.style.position || 'relative';
      topCard.appendChild(overlay);
      this.portalBackdrop = backdrop; // still keep backdrop for clicks (not attached)
      this.portalShell = overlay;
    } else {
      const body = document.body;
      body.appendChild(backdrop);
      body.appendChild(shell);
      shell.appendChild(card);
      this.portalBackdrop = backdrop;
      this.portalShell = shell;
    }
  }

  private closeServerIssuesPortal(): void {
    if (this.portalBackdrop) {
      this.portalBackdrop.remove();
      this.portalBackdrop = null;
    }
    if (this.portalShell) {
      this.portalShell.remove();
      this.portalShell = null;
    }
  }
}
