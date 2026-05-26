using System.ComponentModel.DataAnnotations;

namespace BeringungApi.Models
{
	public class StandortDaten : BaseModel
	{
		[Key]
		public Guid Id { get; set; } = Guid.NewGuid();

		[Required(ErrorMessage = "Der Standort ist erforderlich.")]
		[MaxLength(200, ErrorMessage = "Der Standort darf maximal 200 Zeichen lang sein.")]
		public string Standort { get; set; } = string.Empty;

		[MaxLength(100, ErrorMessage = "Die Koordinaten duerfen maximal 100 Zeichen lang sein.")]
		public string? Koordinaten { get; set; }
	}
}