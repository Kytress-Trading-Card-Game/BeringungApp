using System.ComponentModel.DataAnnotations;
using BeringungApi.Models;

namespace BeringungApi.Dtos
{
	public class VogelErfassungCreateDto
	{
		[Required(ErrorMessage = "Die Ringnummer ist erforderlich.")]
		[MaxLength(30, ErrorMessage = "Die Ringnummer darf maximal 30 Zeichen lang sein.")]
		public string Ringnummer { get; set; } = string.Empty;

		[Required(ErrorMessage = "Das Datum der Beringung ist erforderlich.")]
		public DateTime Beringungsdatum { get; set; } = DateTime.UtcNow;

		[Required]
		public bool Wiederfang { get; set; }

		[MaxLength(100, ErrorMessage = "Die Artbezeichnung darf maximal 100 Zeichen lang sein.")]
		public string? Vogelart { get; set; }

		[Required(ErrorMessage = "Das Gewicht des Vogels ist erforderlich.")]
		[Range(0.1, 5000.0, ErrorMessage = "Das Gewicht muss zwischen 0.1g und 5000g liegen.")]
		public double? Gewicht { get; set; }

		[Required(ErrorMessage = "Die Fluegellaenge des Vogels ist erforderlich.")]
		[Range(0.1, 1000.0, ErrorMessage = "Die Fluegellaenge muss zwischen 0.1mm und 1000mm liegen.")]
		public double? Fluegellaenge { get; set; }

		[Required(ErrorMessage = "Das Geschlecht des Vogels ist erforderlich.")]
		[EnumDataType(typeof(VogelGeschlecht), ErrorMessage = "Ungueltiger Wert fuer Geschlecht.")]
		public VogelGeschlecht Geschlecht { get; set; } = VogelGeschlecht.Unbekannt;

		[Required(ErrorMessage = "Das Alter des Vogels ist erforderlich.")]
		[EnumDataType(typeof(VogelAlter), ErrorMessage = "Ungueltiger Wert fuer Alter.")]
		public VogelAlter Alter { get; set; } = VogelAlter.Unbekannt;

		[MaxLength(500, ErrorMessage = "Die Bemerkungen duerfen maximal 500 Zeichen lang sein.")]
		public string? Bemerkungen { get; set; }

		public bool PlausibilitaetUeberspringen { get; set; }
	}
}
