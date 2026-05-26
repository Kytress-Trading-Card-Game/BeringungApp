using System.ComponentModel.DataAnnotations;

namespace BeringungApi.Models
{
	public class VogelErfassung : BaseModel
	{
		[Key]
		public Guid Id { get; set; } = Guid.NewGuid();

		[Required(ErrorMessage = "Die Ringnummer ist erforderlich.")]
		[MaxLength(30, ErrorMessage = "Die Ringnummer darf maximal 30 Zeichen lang sein.")]
		public string Ringnummer { get; set; } = string.Empty;

		[Required(ErrorMessage = "Das Datum der Beringung ist erforderlich.")]
		public DateTime Beringungsdatum { get; set; } = DateTime.UtcNow;

		[Required(ErrorMessage = "Der Ort der Beringung ist erforderlich.")]
		[MaxLength(200, ErrorMessage = "Der Ortsname darf maximal 200 Zeichen lang sein.")]
		public string Beringungsort { get; set; } = string.Empty;

		[MaxLength(36, ErrorMessage = "Standort-Key darf maximal 36 Zeichen lang sein.")]
		public string? StandortKey { get; set; }

		[Required(ErrorMessage = "Die Koordinaten der Beringung sind erforderlich.")]
		[MaxLength(100, ErrorMessage = "Die Koordinaten dürfen maximal 100 Zeichen lang sein.")]
		public string? Koordinaten { get; set; }

		/// <summary>
		/// Das direkte Wissen des Beringers vor Ort:
		/// TRUE  = Der Vogel hatte bereits einen Ring (Ablesung / Wiederfund)
		/// FALSE = Dem Vogel wurde frisch ein NEUER Ring angelegt (Erstberingung)
		/// </summary>
		[Required]
		public bool Wiederfang { get; set; }

		[MaxLength(100, ErrorMessage = "Die Artbezeichnung darf maximal 100 Zeichen lang sein.")]
		public string? Vogelart { get; set; }

		[Required(ErrorMessage = "Das Gewicht des Vogels ist erforderlich.")]
		[Range(0.1, 5000.0, ErrorMessage = "Das Gewicht muss zwischen 0.1g und 5000g liegen.")]
		public double? Gewicht { get; set; }

		[Required(ErrorMessage = "Die Flügellänge des Vogels ist erforderlich.")]
		[Range(0.1, 1000.0, ErrorMessage = "Die Flügellänge muss zwischen 0.1mm und 1000mm liegen.")]
		public double? Fluegellaenge { get; set; }

		[Required(ErrorMessage = "Das Geschlecht des Vogels ist erforderlich.")]
		[EnumDataType(typeof(VogelGeschlecht), ErrorMessage = "Ungültiger Wert für Geschlecht.")]
		public VogelGeschlecht Geschlecht { get; set; } = VogelGeschlecht.Unbekannt;

		[Required(ErrorMessage = "Das Alter des Vogels ist erforderlich.")]
		[EnumDataType(typeof(VogelAlter), ErrorMessage = "Ungültiger Wert für Alter.")]
		public VogelAlter Alter { get; set; } = VogelAlter.Unbekannt;

		[MaxLength(500, ErrorMessage = "Die Bemerkungen dürfen maximal 500 Zeichen lang sein.")]
		public string? Bemerkungen { get; set; }
	}
}