namespace BeringungApi.Dtos
{
	public class ArtenInfosTopArtenResponse
	{
		public Guid StandortId { get; set; }
		public string StandortName { get; set; } = string.Empty;
		public List<StatKeyValue> Items { get; set; } = new();
	}
}
