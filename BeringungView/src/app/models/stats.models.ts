export interface StatKeyValue {
  key: string;
  count: number;
}

export interface StatsSeasonResponse {
  season: number;
  standortId: string;
  standortName: string;
  totalCurrentSeason: number;
  totalPreviousSeason: number;
  deltaCount: number;
  deltaPercent?: number | null;
  wiederfangCount: number;
  wiederfangPercent: number;
  durchschnittGewicht?: number | null;
  durchschnittFluegellaenge?: number | null;
  topArten: StatKeyValue[];
  geschlechtVerteilung: StatKeyValue[];
  alterVerteilung: StatKeyValue[];
}

export interface StatsTotalsResponse {
  season: number;
  standortId: string;
  standortName: string;
  totalCurrentSeason: number;
  totalPreviousSeason: number;
  deltaCount: number;
  deltaPercent?: number | null;
}

export interface StatsWiederfangResponse {
  season: number;
  standortId: string;
  standortName: string;
  totalCurrentSeason: number;
  wiederfangCount: number;
  wiederfangPercent: number;
}

export interface StatsAveragesResponse {
  season: number;
  standortId: string;
  standortName: string;
  durchschnittGewicht?: number | null;
  durchschnittFluegellaenge?: number | null;
}

export interface StatsListResponse {
  season: number;
  standortId: string;
  standortName: string;
  items: StatKeyValue[];
}
