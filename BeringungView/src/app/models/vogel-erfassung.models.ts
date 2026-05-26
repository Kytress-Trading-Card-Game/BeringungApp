export enum VogelGeschlecht {
  Unbekannt = 0,
  Männlich = 1,
  Weiblich = 2,
}

export enum VogelAlter {
  Unbekannt = 0,
  Diesjährig = 1,
  Nichtdiesjährig = 2,
}

export interface VogelErfassungCreateDto {
  ringnummer: string;
  beringungsdatum: string | Date;
  wiederfang: boolean;
  vogelart?: string | null;
  gewicht: number | null;
  fluegellaenge: number | null;
  geschlecht: VogelGeschlecht;
  alter: VogelAlter;
  bemerkungen?: string | null;
  plausibilitaetUeberspringen?: boolean;
}

export interface VogelErfassung {
  id: string;
  ringnummer: string;
  beringungsdatum: string;
  beringungsort: string;
  koordinaten?: string | null;
  wiederfang: boolean;
  vogelart?: string | null;
  gewicht: number | null;
  fluegellaenge: number | null;
  geschlecht: VogelGeschlecht;
  alter: VogelAlter;
  bemerkungen?: string | null;
}

export interface VogelErfassungQuery {
  page?: number;

  pageSize?: number;

  wiederfang?: boolean;

  standort?: string;

  minGewicht?: number;

  maxGewicht?: number;

  minFluegellaenge?: number;

  maxFluegellaenge?: number;

  geschlecht?: VogelGeschlecht;

  alter?: VogelAlter;

  ringnummerPrefix?: string;

  vogelart?: string;

  vonDatum?: string;

  bisDatum?: string;

  sortBy?: string;

  sortDirection?: 'asc' | 'desc';
}