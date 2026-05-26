import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, take } from 'rxjs';
import { RouterLink } from '@angular/router';

import { AppSettingsService } from '../services/app-settings.service';
import { StandortDatenService } from '../services/standort-daten.service';
import { AppSettings } from '../models/app-settings.models';
import { StandortDaten, StandortDatenCreateDto } from '../models/standort-daten.models';

@Component({
  selector: 'app-app-einstellungen',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './app-einstellungen.html',
  styleUrl: './app-einstellungen.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppEinstellungen {
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly standortService = inject(StandortDatenService);

  protected readonly settings = signal<AppSettings | null>(null);
  protected readonly standorte = signal<StandortDaten[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isCreating = signal(false);
  protected readonly isUpdatingActive = signal(false);
  protected readonly deletingId = signal<string | null>(null);

  protected readonly standortForm = new FormGroup({
    standort: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    koordinaten: new FormControl<string | null>(null, {
      validators: [Validators.maxLength(100)],
    }),
  });

  constructor() {
    this.loadData();
  }

  protected setActiveStandort(id: string): void {
    if (this.isUpdatingActive()) {
      return;
    }

    this.isUpdatingActive.set(true);
    this.errorMessage.set(null);

    this.appSettingsService
      .setActiveStandort(id)
      .pipe(take(1))
      .subscribe({
        next: (settings) => {
          this.settings.set(settings);
          this.isUpdatingActive.set(false);
        },
        error: () => {
          this.isUpdatingActive.set(false);
          this.errorMessage.set('Aktiver Standort konnte nicht gesetzt werden.');
        },
      });
  }

  protected createStandort(): void {
    if (this.isCreating()) {
      return;
    }

    if (this.standortForm.invalid) {
      this.standortForm.markAllAsTouched();
      return;
    }

    const raw = this.standortForm.getRawValue();
    const dto: StandortDatenCreateDto = {
      standort: raw.standort.trim(),
      koordinaten: raw.koordinaten?.trim() || null,
    };

    this.isCreating.set(true);
    this.errorMessage.set(null);

    this.standortService
      .create(dto)
      .pipe(take(1))
      .subscribe({
        next: (created) => {
          this.standorte.set([...this.standorte(), created]);
          this.isCreating.set(false);
          this.standortForm.reset({ standort: '', koordinaten: null });
          this.standortForm.markAsPristine();
          this.standortForm.markAsUntouched();
        },
        error: () => {
          this.isCreating.set(false);
          this.errorMessage.set('Standort konnte nicht gespeichert werden.');
        },
      });
  }

  protected deleteStandort(id: string): void {
    if (this.deletingId()) {
      return;
    }

    this.deletingId.set(id);
    this.errorMessage.set(null);

    this.standortService
      .remove(id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.standorte.set(this.standorte().filter((item) => item.id !== id));
          if (this.settings()?.activeStandortId === id) {
            this.settings.set({
              ...(this.settings() as AppSettings),
              activeStandortId: null,
              activeStandort: null,
            });
          }
          this.deletingId.set(null);
        },
        error: () => {
          this.deletingId.set(null);
          this.errorMessage.set('Standort konnte nicht geloescht werden.');
        },
      });
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      settings: this.appSettingsService.getSettings(),
      standorte: this.standortService.getAll(),
    })
      .pipe(take(1))
      .subscribe({
        next: ({ settings, standorte }) => {
          this.settings.set(settings);
          this.standorte.set(standorte);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('Daten konnten nicht geladen werden.');
        },
      });
  }
}
