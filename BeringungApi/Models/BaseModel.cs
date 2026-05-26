namespace BeringungApi.Models
{
	public abstract class BaseModel
	{
		public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
		public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
		public DateTime? SyncedAt { get; set; }
	}
}
