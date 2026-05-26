using System.ComponentModel.DataAnnotations;

namespace BeringungApi.Models
{
	public class ArtenInfos : BaseModel
	{
		[Key]
		[Required]
		public string Artbezeichnung { get; set; } = string.Empty;
		[MaxLength(10)]
		public string? RingnummerTyp { get; set; }
		public double? MinGewicht { get; set; }
		public double? MaxGewicht { get; set; }
		public double? MinFluegellaenge { get; set; }
		public double? MaxFluegellaenge { get; set; }
	}
}