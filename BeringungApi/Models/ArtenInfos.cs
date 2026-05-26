using System.ComponentModel.DataAnnotations;

namespace BeringungApi.Models
{
	public class ArtenInfos : BaseModel
	{
		[Key]
		[Required]
		public string Artbezeichnung { get; set; } = string.Empty;
		public double? MinGewicht { get; set; }
		public double? MaxGewicht { get; set; }
		public double? MinFluegellaenge { get; set; }
		public double? MaxFluegellaenge { get; set; }
	}
}