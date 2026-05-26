using Microsoft.Extensions.Caching.Memory;

namespace BeringungApi.Services
{
	public class StatsCacheService : IStatsCacheService
	{
		private const string VersionKey = "stats:version";
		private readonly IMemoryCache _cache;
		private readonly object _lock = new();

		public StatsCacheService(IMemoryCache cache)
		{
			_cache = cache;
		}

		public string GetVersion()
		{
			if (_cache.TryGetValue(VersionKey, out string? version) && !string.IsNullOrWhiteSpace(version))
			{
				return version!;
			}

			lock (_lock)
			{
				if (_cache.TryGetValue(VersionKey, out version) && !string.IsNullOrWhiteSpace(version))
				{
					return version!;
				}

				version = Guid.NewGuid().ToString("N");
				_cache.Set(VersionKey, version);
				return version;
			}
		}

		public void Invalidate()
		{
			lock (_lock)
			{
				_cache.Set(VersionKey, Guid.NewGuid().ToString("N"));
			}
		}
	}
}
