using System.ComponentModel.DataAnnotations;

namespace BeringungApi.Models
{
	public class AppSettings : BaseModel
	{
		[Key]
		public Guid Id { get; set; } = Guid.NewGuid();

		public Guid? ActiveStandortId { get; set; }
		public StandortDaten? ActiveStandort { get; set; }
	}
}
