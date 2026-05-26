import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, concatMap, finalize, from, of, take, toArray } from 'rxjs';

import {
  ArtenInfos,
  ArtenInfosCreateDto,
  ArtenInfosUpdateDto,
} from '../models/arten-infos.models';
import { ArtenInfosService } from '../services/arten-infos.service';

@Component({
  selector: 'app-arten-verwalten',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './arten-verwalten.html',
  styleUrl: './arten-verwalten.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtenVerwalten {
  private readonly artenInfosService = inject(ArtenInfosService);

  protected readonly arten = signal<ArtenInfos[]>([]);
  protected readonly selectedArt = signal('');
  protected readonly isLoading = signal(true);
  protected readonly isCreating = signal(false);
  protected readonly isUpdating = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly isImporting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly importError = signal<string | null>(null);
  protected readonly importMessage = signal<string | null>(null);
  protected readonly importPreview = signal<ArtenInfosCreateDto[]>([]);
  protected readonly importFileName = signal<string | null>(null);
  protected readonly isImportPreviewOpen = signal(false);

  protected readonly createForm = new FormGroup({
    Artbezeichnung: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    RingnummerTyp: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(10)],
    }),
    MinGewicht: new FormControl<string | null>(null),
    MaxGewicht: new FormControl<string | null>(null),
    MinFluegellaenge: new FormControl<string | null>(null),
    MaxFluegellaenge: new FormControl<string | null>(null),
  });

  protected readonly updateForm = new FormGroup({
    RingnummerTyp: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(10)],
    }),
    MinGewicht: new FormControl<string | null>(null),
    MaxGewicht: new FormControl<string | null>(null),
    MinFluegellaenge: new FormControl<string | null>(null),
    MaxFluegellaenge: new FormControl<string | null>(null),
  });

  constructor() {
    this.loadArten();
  }

  protected onSelectArt(value: string): void {
    this.selectedArt.set(value);
    const selected = this.arten().find((item) => item.artbezeichnung === value);
    if (!selected) {
      this.updateForm.reset();
      return;
    }

    this.updateForm.setValue({
      RingnummerTyp: selected.ringnummerTyp ?? '',
      MinGewicht: this.formatNumber(selected.minGewicht),
      MaxGewicht: this.formatNumber(selected.maxGewicht),
      MinFluegellaenge: this.formatNumber(selected.minFluegellaenge),
      MaxFluegellaenge: this.formatNumber(selected.maxFluegellaenge),
    });
  }

  protected submitCreate(): void {
    if (this.isCreating()) {
      return;
    }

    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const raw = this.createForm.getRawValue();
    const dto: ArtenInfosCreateDto = {
      artbezeichnung: raw.Artbezeichnung.trim(),
      ringnummerTyp: this.parseRingnummerTyp(raw.RingnummerTyp),
      minGewicht: this.parseNumber(raw.MinGewicht),
      maxGewicht: this.parseNumber(raw.MaxGewicht),
      minFluegellaenge: this.parseNumber(raw.MinFluegellaenge),
      maxFluegellaenge: this.parseNumber(raw.MaxFluegellaenge),
    };

    this.isCreating.set(true);
    this.errorMessage.set(null);

    this.artenInfosService
      .create(dto)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isCreating.set(false);
          this.resetCreateForm();
          this.loadArten();
        },
        error: () => {
          this.isCreating.set(false);
          this.errorMessage.set('Art konnte nicht gespeichert werden.');
        },
      });
  }

  protected submitUpdate(): void {
    if (this.isUpdating()) {
      return;
    }

    const artbezeichnung = this.selectedArt().trim();
    if (!artbezeichnung) {
      this.errorMessage.set('Bitte zuerst eine Art auswaehlen.');
      return;
    }

    const raw = this.updateForm.getRawValue();
    const dto: ArtenInfosUpdateDto = {
      ringnummerTyp: this.parseRingnummerTyp(raw.RingnummerTyp),
      minGewicht: this.parseNumber(raw.MinGewicht),
      maxGewicht: this.parseNumber(raw.MaxGewicht),
      minFluegellaenge: this.parseNumber(raw.MinFluegellaenge),
      maxFluegellaenge: this.parseNumber(raw.MaxFluegellaenge),
    };

    this.isUpdating.set(true);
    this.errorMessage.set(null);

    this.artenInfosService
      .update(artbezeichnung, dto)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isUpdating.set(false);
          this.loadArten();
        },
        error: () => {
          this.isUpdating.set(false);
          this.errorMessage.set('Aenderungen konnten nicht gespeichert werden.');
        },
      });
  }

  protected deleteSelectedArt(): void {
    if (this.isDeleting()) {
      return;
    }

    const artbezeichnung = this.selectedArt().trim();
    if (!artbezeichnung) {
      this.errorMessage.set('Bitte zuerst eine Art auswählen.');
      return;
    }

    const confirmed = window.confirm(
      `Möchtest du die Art "${artbezeichnung}" wirklich löschen?`,
    );
    if (!confirmed) {
      return;
    }

    this.isDeleting.set(true);
    this.errorMessage.set(null);

    this.artenInfosService
      .delete(artbezeichnung)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.selectedArt.set('');
          this.resetUpdateForm();
          this.loadArten();
        },
        error: () => {
          this.isDeleting.set(false);
          this.errorMessage.set('Art konnte nicht gelöscht werden.');
        },
      });
  }

  protected onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.importError.set(null);
    this.importMessage.set(null);
    this.importPreview.set([]);
    this.importFileName.set(file.name);
    this.isImporting.set(true);

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const { dtos, errors } = this.parseImportText(text);

      if (errors.length > 0) {
        this.isImporting.set(false);
        this.importError.set(errors.join(' '));
        input.value = '';
        return;
      }

      if (dtos.length === 0) {
        this.isImporting.set(false);
        this.importError.set('Keine gültigen Zeilen gefunden.');
        input.value = '';
        return;
      }

      this.importPreview.set(dtos);
      this.importMessage.set(`Vorschau geladen: ${dtos.length} Zeilen.`);
      this.isImportPreviewOpen.set(true);
      this.isImporting.set(false);
      input.value = '';
    };

    reader.onerror = () => {
      this.isImporting.set(false);
      this.importError.set('Datei konnte nicht gelesen werden.');
      input.value = '';
    };

    reader.readAsText(file);
  }

  protected exportArten(): void {
    const lines = this.arten().map((art) => {
      const ringnummerTyp = (art.ringnummerTyp ?? '-').trim() || '-';
      const minG = this.exportNumber(art.minGewicht);
      const maxG = this.exportNumber(art.maxGewicht);
      const minF = this.exportNumber(art.minFluegellaenge);
      const maxF = this.exportNumber(art.maxFluegellaenge);
      return `${art.artbezeichnung} ${ringnummerTyp} ${minG} ${maxG} ${minF} ${maxF}`;
    });

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'arten-infos.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  protected startImport(): void {
    if (this.isImporting()) {
      return;
    }

    const dtos = this.importPreview();
    if (dtos.length === 0) {
      this.importError.set('Keine Vorschau zum Import vorhanden.');
      return;
    }

    this.isImporting.set(true);
    this.importError.set(null);

    let failedCount = 0;

    from(dtos)
      .pipe(
        concatMap((dto) =>
          this.artenInfosService.create(dto).pipe(
            catchError(() => {
              failedCount += 1;
              return of(null);
            }),
          ),
        ),
        toArray(),
        finalize(() => {
          this.isImporting.set(false);
        }),
      )
      .subscribe({
        next: (results) => {
          const createdCount = results.filter((item) => item !== null).length;
          this.importMessage.set(
            `Import abgeschlossen: ${createdCount} gespeichert, ${failedCount} uebersprungen.`,
          );
          this.importPreview.set([]);
          this.importFileName.set(null);
          this.isImportPreviewOpen.set(false);
          this.loadArten();
        },
        error: () => {
          this.importError.set('Import fehlgeschlagen.');
        },
      });
  }

  protected openImportPreview(): void {
    if (this.importPreview().length === 0) {
      return;
    }

    this.isImportPreviewOpen.set(true);
  }

  protected closeImportPreview(): void {
    if (this.isImporting()) {
      return;
    }

    this.isImportPreviewOpen.set(false);
  }

  private loadArten(): void {
    this.isLoading.set(true);
    this.artenInfosService
      .getAll()
      .pipe(take(1))
      .subscribe({
        next: (items) => {
          const sorted = [...items].sort((a, b) =>
            a.artbezeichnung.localeCompare(b.artbezeichnung),
          );
          this.arten.set(sorted);
          this.isLoading.set(false);
          const selected = this.selectedArt();
          if (selected) {
            this.onSelectArt(selected);
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('Arten konnten nicht geladen werden.');
        },
      });
  }

  private resetCreateForm(): void {
    this.createForm.reset({
      Artbezeichnung: '',
      RingnummerTyp: '',
      MinGewicht: null,
      MaxGewicht: null,
      MinFluegellaenge: null,
      MaxFluegellaenge: null,
    });
    this.createForm.markAsPristine();
    this.createForm.markAsUntouched();
  }

  private resetUpdateForm(): void {
    this.updateForm.reset({
      RingnummerTyp: '',
      MinGewicht: null,
      MaxGewicht: null,
      MinFluegellaenge: null,
      MaxFluegellaenge: null,
    });
    this.updateForm.markAsPristine();
    this.updateForm.markAsUntouched();
  }

  private parseImportText(text: string): {
    dtos: ArtenInfosCreateDto[];
    errors: string[];
  } {
    const rawLines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (rawLines.length === 0) {
      return { dtos: [], errors: [] };
    }

    const lines = rawLines[0].toLowerCase().startsWith('art ')
      ? rawLines.slice(1)
      : rawLines;

    const dtos: ArtenInfosCreateDto[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const parts = line.split(/\s+/);
      if (parts.length < 5) {
        errors.push(`Zeile ${index + 1} ist unvollstaendig.`);
        return;
      }

      const [art, ringnummerTypToken, minGToken, maxGToken, minFToken, maxFToken] = parts;
      if (!art) {
        errors.push(`Zeile ${index + 1} enthaelt keine Art.`);
        return;
      }

      const hasRingnummerTyp = parts.length >= 6;
      const minG = hasRingnummerTyp ? minGToken : ringnummerTypToken;
      const maxG = hasRingnummerTyp ? maxGToken : minGToken;
      const minF = hasRingnummerTyp ? minFToken : maxGToken;
      const maxF = hasRingnummerTyp ? maxFToken : minFToken;

      const dto: ArtenInfosCreateDto = {
        artbezeichnung: art,
        ringnummerTyp: hasRingnummerTyp ? this.parseRingnummerTyp(ringnummerTypToken) : null,
        minGewicht: this.parseTokenNumber(minG, index + 1),
        maxGewicht: this.parseTokenNumber(maxG, index + 1),
        minFluegellaenge: this.parseTokenNumber(minF, index + 1),
        maxFluegellaenge: this.parseTokenNumber(maxF, index + 1),
      };

      if (dto.minGewicht === undefined || dto.maxGewicht === undefined) {
        errors.push(`Zeile ${index + 1} enthaelt ungueltige Gewichtsangaben.`);
        return;
      }

      if (dto.minFluegellaenge === undefined || dto.maxFluegellaenge === undefined) {
        errors.push(`Zeile ${index + 1} enthaelt ungueltige Fluegellaengen.`);
        return;
      }

      dtos.push(dto);
    });

    return { dtos, errors };
  }

  private parseTokenNumber(value: string, _line: number): number | null | undefined {
    if (!value || value === '-') {
      return null;
    }

    const normalized = value.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseNumber(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const normalized = value.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private formatNumber(value: number | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    return value.toString().replace('.', ',');
  }

  private exportNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return value.toString().replace('.', ',');
  }

  private parseRingnummerTyp(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
