export interface StandortDatenBase {
  createdAt?: string;
  updatedAt?: string;
  syncedAt?: string | null;
}

export interface StandortDaten extends StandortDatenBase {
  id: string;
  standort: string;
  koordinaten?: string | null;
}

export interface StandortDatenCreateDto {
  standort: string;
  koordinaten?: string | null;
}
