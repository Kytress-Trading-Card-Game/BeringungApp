namespace BeringungApi.Dtos
{
	public class StatsSeasonResponse
	{
		public int Season { get; set; }
		public Guid StandortId { get; set; }
		public string StandortName { get; set; } = string.Empty;

		public int TotalCurrentSeason { get; set; }
		public int TotalPreviousSeason { get; set; }
		public int DeltaCount { get; set; }
		public double? DeltaPercent { get; set; }

		public int WiederfangCount { get; set; }
		public double WiederfangPercent { get; set; }

		public double? DurchschnittGewicht { get; set; }
		public double? DurchschnittFluegellaenge { get; set; }

		public List<StatKeyValue> TopArten { get; set; } = new();
		public List<StatKeyValue> GeschlechtVerteilung { get; set; } = new();
		public List<StatKeyValue> AlterVerteilung { get; set; } = new();
	}

	public class StatKeyValue
	{
		public string Key { get; set; } = string.Empty;
		public int Count { get; set; }
	}

	public class StatsTotalsResponse
	{
		public int Season { get; set; }
		public Guid StandortId { get; set; }
		public string StandortName { get; set; } = string.Empty;

		public int TotalCurrentSeason { get; set; }
		public int TotalPreviousSeason { get; set; }
		public int DeltaCount { get; set; }
		public double? DeltaPercent { get; set; }
	}

	public class StatsWiederfangResponse
	{
		public int Season { get; set; }
		public Guid StandortId { get; set; }
		public string StandortName { get; set; } = string.Empty;

		public int TotalCurrentSeason { get; set; }
		public int WiederfangCount { get; set; }
		public double WiederfangPercent { get; set; }
	}

	public class StatsAveragesResponse
	{
		public int Season { get; set; }
		public Guid StandortId { get; set; }
		public string StandortName { get; set; } = string.Empty;

		public double? DurchschnittGewicht { get; set; }
		public double? DurchschnittFluegellaenge { get; set; }
	}

	public class StatsListResponse
	{
		public int Season { get; set; }
		public Guid StandortId { get; set; }
		public string StandortName { get; set; } = string.Empty;

		public List<StatKeyValue> Items { get; set; } = new();
	}
}
