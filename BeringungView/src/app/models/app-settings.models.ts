import { StandortDaten } from './standort-daten.models';

export interface AppSettingsBase {
  createdAt?: string;
  updatedAt?: string;
  syncedAt?: string | null;
}

export interface AppSettings extends AppSettingsBase {
  id: string;
  activeStandortId?: string | null;
  activeStandort?: StandortDaten | null;
}
