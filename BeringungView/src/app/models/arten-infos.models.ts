export interface ArtenInfos {
  artbezeichnung: string;
  minGewicht?: number | null;
  maxGewicht?: number | null;
  minFluegellaenge?: number | null;
  maxFluegellaenge?: number | null;
}

export interface ArtenInfosCreateDto {
  artbezeichnung: string;
  minGewicht?: number | null;
  maxGewicht?: number | null;
  minFluegellaenge?: number | null;
  maxFluegellaenge?: number | null;
}

export interface ArtenInfosUpdateDto {
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
