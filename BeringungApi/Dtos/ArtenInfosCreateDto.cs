using System.ComponentModel.DataAnnotations;

namespace BeringungApi.Dtos
{
	public class ArtenInfosCreateDto
	{
		[Required(ErrorMessage = "Die Artbezeichnung ist erforderlich.")]
		public string Artbezeichnung { get; set; } = string.Empty;

		public double? MinGewicht { get; set; }
		public double? MaxGewicht { get; set; }
		public double? MinFluegellaenge { get; set; }
		public double? MaxFluegellaenge { get; set; }
	}
}
