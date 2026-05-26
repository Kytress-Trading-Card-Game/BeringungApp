export interface ArtenInfos {
  artbezeichnung: string;
  ringnummerTyp?: string | null;
  minGewicht?: number | null;
  maxGewicht?: number | null;
  minFluegellaenge?: number | null;
  maxFluegellaenge?: number | null;
}

export interface ArtenInfosCreateDto {
  artbezeichnung: string;
  ringnummerTyp?: string | null;
  minGewicht?: number | null;
  maxGewicht?: number | null;
  minFluegellaenge?: number | null;
  maxFluegellaenge?: number | null;
}

export interface ArtenInfosUpdateDto {
  ringnummerTyp?: string | null;
  minGewicht?: number | null;
  maxGewicht?: number | null;
  minFluegellaenge?: number | null;
  maxFluegellaenge?: number | null;
}

export interface ArtenInfosTopArtenResponse {
  standortId: string;
  standortName: string;
  items: { key: string; count: number }[];
}
