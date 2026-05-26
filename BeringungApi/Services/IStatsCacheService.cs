namespace BeringungApi.Services
{
	public interface IStatsCacheService
	{
		string GetVersion();
		void Invalidate();
	}
}
