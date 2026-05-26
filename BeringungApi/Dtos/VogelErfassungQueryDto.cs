using BeringungApi.Models;

namespace BeringungApi.Dtos
{
	public class VogelErfassungQueryDto
	{
		public int Page { get; set; } = 1;
		public int PageSize { get; set; } = 25;

		public bool? Wiederfang { get; set; }

		public string? Standort { get; set; }

		public double? MinGewicht { get; set; }
		public double? MaxGewicht { get; set; }

		public double? MinFluegellaenge { get; set; }
		public double? MaxFluegellaenge { get; set; }

		public VogelGeschlecht? Geschlecht { get; set; }
		public VogelAlter? Alter { get; set; }

		public string? RingnummerPrefix { get; set; }

		public string? Vogelart { get; set; }

		public DateTime? VonDatum { get; set; }
		public DateTime? BisDatum { get; set; }

		public string SortBy { get; set; } = "beringungsdatum";

		public string SortDirection { get; set; } = "desc";
	}
}