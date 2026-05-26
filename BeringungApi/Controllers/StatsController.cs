using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using BeringungApi.Data;
using BeringungApi.Dtos;
using BeringungApi.Models;
using BeringungApi.Services;
using System.Diagnostics;
using System.Globalization;

namespace BeringungApi.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class StatsController : ControllerBase
	{
		private readonly AppDbContext _context;
		private readonly IMemoryCache _cache;
		private readonly IStatsCacheService _statsCache;
		private readonly ILogger<StatsController> _logger;

		public StatsController(
			AppDbContext context,
			IMemoryCache cache,
			IStatsCacheService statsCache,
			ILogger<StatsController> logger)
		{
			_context = context;
			_cache = cache;
			_statsCache = statsCache;
			_logger = logger;
		}

		// GET: api/Stats?standortId=...&season=2026
		[HttpGet]
		public async Task<ActionResult<StatsSeasonResponse>> GetSeasonStats([FromQuery] Guid standortId, [FromQuery] int season)
		{
			var timer = Stopwatch.StartNew();
			var cacheKey = BuildCacheKey("season", standortId, season, _statsCache.GetVersion());
			if (_cache.TryGetValue(cacheKey, out StatsSeasonResponse? cachedResponse))
			{
				_logRequestDuration("stats-season", timer.ElapsedMilliseconds, true);
				return cachedResponse!;
			}

			var validation = await ValidateInputsAsync(standortId, season);
			if (validation.errorResult != null)
			{
				return validation.errorResult;
			}

			var standort = validation.standort!;

			var currentQuery = BuildStandortQuery(standort, season);
			var previousQuery = BuildStandortQuery(standort, season - 1);

			var totalCurrent = await currentQuery.CountAsync();
			var totalPrevious = await previousQuery.CountAsync();
			var deltaCount = totalCurrent - totalPrevious;
			double? deltaPercent = null;
			if (totalPrevious > 0)
			{
				deltaPercent = (double)deltaCount / totalPrevious * 100.0;
			}

			var wiederfangCount = await currentQuery.CountAsync(v => v.Wiederfang);
			var wiederfangPercent = totalCurrent > 0
				? (double)wiederfangCount / totalCurrent * 100.0
				: 0.0;

			var avgGewicht = await AverageIfAnyAsync(currentQuery.Where(v => v.Gewicht.HasValue), v => v.Gewicht!.Value);
			var avgFluegel = await AverageIfAnyAsync(currentQuery.Where(v => v.Fluegellaenge.HasValue), v => v.Fluegellaenge!.Value);

			var topArten = await currentQuery
				.Where(v => !string.IsNullOrWhiteSpace(v.Vogelart))
				.GroupBy(v => v.Vogelart!)
				.Select(g => new StatKeyValue { Key = g.Key, Count = g.Count() })
				.OrderByDescending(x => x.Count)
				.Take(5)
				.ToListAsync();

			var geschlechtVerteilung = await currentQuery
				.GroupBy(v => v.Geschlecht)
				.Select(g => new StatKeyValue { Key = g.Key.ToString(), Count = g.Count() })
				.OrderByDescending(x => x.Count)
				.ToListAsync();

			var alterVerteilung = await currentQuery
				.GroupBy(v => v.Alter)
				.Select(g => new StatKeyValue { Key = g.Key.ToString(), Count = g.Count() })
				.OrderByDescending(x => x.Count)
				.ToListAsync();

			var response = new StatsSeasonResponse
			{
				Season = season,
				StandortId = standort.Id,
				StandortName = standort.Standort,
				TotalCurrentSeason = totalCurrent,
				TotalPreviousSeason = totalPrevious,
				DeltaCount = deltaCount,
				DeltaPercent = deltaPercent,
				WiederfangCount = wiederfangCount,
				WiederfangPercent = wiederfangPercent,
				DurchschnittGewicht = avgGewicht,
				DurchschnittFluegellaenge = avgFluegel,
				TopArten = topArten,
				GeschlechtVerteilung = geschlechtVerteilung,
				AlterVerteilung = alterVerteilung
			};

			_cache.Set(cacheKey, response, BuildCacheOptions());
			_logRequestDuration("stats-season", timer.ElapsedMilliseconds, false);
			return response;
		}

		// GET: api/Stats/totals?standortId=...&season=2026
		[HttpGet("totals")]
		public async Task<ActionResult<StatsTotalsResponse>> GetTotals([FromQuery] Guid standortId, [FromQuery] int season)
		{
			var timer = Stopwatch.StartNew();
			var cacheKey = BuildCacheKey("totals", standortId, season, _statsCache.GetVersion());
			if (_cache.TryGetValue(cacheKey, out StatsTotalsResponse? cachedResponse))
			{
				_logRequestDuration("stats-totals", timer.ElapsedMilliseconds, true);
				return cachedResponse!;
			}

			var validation = await ValidateInputsAsync(standortId, season);
			if (validation.errorResult != null)
			{
				return validation.errorResult;
			}

			var standort = validation.standort!;
			var currentQuery = BuildStandortQuery(standort, season);
			var previousQuery = BuildStandortQuery(standort, season - 1);

			var totalCurrent = await currentQuery.CountAsync();
			var totalPrevious = await previousQuery.CountAsync();
			var deltaCount = totalCurrent - totalPrevious;
			double? deltaPercent = null;
			if (totalPrevious > 0)
			{
				deltaPercent = (double)deltaCount / totalPrevious * 100.0;
			}

			var response = new StatsTotalsResponse
			{
				Season = season,
				StandortId = standort.Id,
				StandortName = standort.Standort,
				TotalCurrentSeason = totalCurrent,
				TotalPreviousSeason = totalPrevious,
				DeltaCount = deltaCount,
				DeltaPercent = deltaPercent
			};

			_cache.Set(cacheKey, response, BuildCacheOptions());
			_logRequestDuration("stats-totals", timer.ElapsedMilliseconds, false);
			return response;
		}

		// GET: api/Stats/wiederfang?standortId=...&season=2026
		[HttpGet("wiederfang")]
		public async Task<ActionResult<StatsWiederfangResponse>> GetWiederfang([FromQuery] Guid standortId, [FromQuery] int season)
		{
			var timer = Stopwatch.StartNew();
			var cacheKey = BuildCacheKey("wiederfang", standortId, season, _statsCache.GetVersion());
			if (_cache.TryGetValue(cacheKey, out StatsWiederfangResponse? cachedResponse))
			{
				_logRequestDuration("stats-wiederfang", timer.ElapsedMilliseconds, true);
				return cachedResponse!;
			}

			var validation = await ValidateInputsAsync(standortId, season);
			if (validation.errorResult != null)
			{
				return validation.errorResult;
			}

			var standort = validation.standort!;
			var currentQuery = BuildStandortQuery(standort, season);
			var totalCurrent = await currentQuery.CountAsync();
			var wiederfangCount = await currentQuery.CountAsync(v => v.Wiederfang);
			var wiederfangPercent = totalCurrent > 0
				? (double)wiederfangCount / totalCurrent * 100.0
				: 0.0;

			var response = new StatsWiederfangResponse
			{
				Season = season,
				StandortId = standort.Id,
				StandortName = standort.Standort,
				TotalCurrentSeason = totalCurrent,
				WiederfangCount = wiederfangCount,
				WiederfangPercent = wiederfangPercent
			};

			_cache.Set(cacheKey, response, BuildCacheOptions());
			_logRequestDuration("stats-wiederfang", timer.ElapsedMilliseconds, false);
			return response;
		}

		// GET: api/Stats/averages?standortId=...&season=2026
		[HttpGet("averages")]
		public async Task<ActionResult<StatsAveragesResponse>> GetAverages([FromQuery] Guid standortId, [FromQuery] int season)
		{
			var timer = Stopwatch.StartNew();
			var cacheKey = BuildCacheKey("averages", standortId, season, _statsCache.GetVersion());
			if (_cache.TryGetValue(cacheKey, out StatsAveragesResponse? cachedResponse))
			{
				_logRequestDuration("stats-averages", timer.ElapsedMilliseconds, true);
				return cachedResponse!;
			}

			var validation = await ValidateInputsAsync(standortId, season);
			if (validation.errorResult != null)
			{
				return validation.errorResult;
			}

			var standort = validation.standort!;
			var currentQuery = BuildStandortQuery(standort, season);
			var avgGewicht = await AverageIfAnyAsync(currentQuery.Where(v => v.Gewicht.HasValue), v => v.Gewicht!.Value);
			var avgFluegel = await AverageIfAnyAsync(currentQuery.Where(v => v.Fluegellaenge.HasValue), v => v.Fluegellaenge!.Value);

			var response = new StatsAveragesResponse
			{
				Season = season,
				StandortId = standort.Id,
				StandortName = standort.Standort,
				DurchschnittGewicht = avgGewicht,
				DurchschnittFluegellaenge = avgFluegel
			};

			_cache.Set(cacheKey, response, BuildCacheOptions());
			_logRequestDuration("stats-averages", timer.ElapsedMilliseconds, false);
			return response;
		}

		// GET: api/Stats/top-arten?standortId=...&season=2026
		[HttpGet("top-arten")]
		public async Task<ActionResult<StatsListResponse>> GetTopArten([FromQuery] Guid standortId, [FromQuery] int season)
		{
			var timer = Stopwatch.StartNew();
			var cacheKey = BuildCacheKey("top-arten", standortId, season, _statsCache.GetVersion());
			if (_cache.TryGetValue(cacheKey, out StatsListResponse? cachedResponse))
			{
				_logRequestDuration("stats-top-arten", timer.ElapsedMilliseconds, true);
				return cachedResponse!;
			}

			var validation = await ValidateInputsAsync(standortId, season);
			if (validation.errorResult != null)
			{
				return validation.errorResult;
			}

			var standort = validation.standort!;
			var currentQuery = BuildStandortQuery(standort, season);
			var items = await currentQuery
				.Where(v => !string.IsNullOrWhiteSpace(v.Vogelart))
				.GroupBy(v => v.Vogelart!)
				.Select(g => new StatKeyValue { Key = g.Key, Count = g.Count() })
				.OrderByDescending(x => x.Count)
				.Take(5)
				.ToListAsync();

			var response = new StatsListResponse
			{
				Season = season,
				StandortId = standort.Id,
				StandortName = standort.Standort,
				Items = items
			};

			_cache.Set(cacheKey, response, BuildCacheOptions());
			_logRequestDuration("stats-top-arten", timer.ElapsedMilliseconds, false);
			return response;
		}

		// GET: api/Stats/geschlecht?standortId=...&season=2026
		[HttpGet("geschlecht")]
		public async Task<ActionResult<StatsListResponse>> GetGeschlechtVerteilung([FromQuery] Guid standortId, [FromQuery] int season)
		{
			var timer = Stopwatch.StartNew();
			var cacheKey = BuildCacheKey("geschlecht", standortId, season, _statsCache.GetVersion());
			if (_cache.TryGetValue(cacheKey, out StatsListResponse? cachedResponse))
			{
				_logRequestDuration("stats-geschlecht", timer.ElapsedMilliseconds, true);
				return cachedResponse!;
			}

			var validation = await ValidateInputsAsync(standortId, season);
			if (validation.errorResult != null)
			{
				return validation.errorResult;
			}

			var standort = validation.standort!;
			var currentQuery = BuildStandortQuery(standort, season);
			var items = await currentQuery
				.GroupBy(v => v.Geschlecht)
				.Select(g => new StatKeyValue { Key = g.Key.ToString(), Count = g.Count() })
				.OrderByDescending(x => x.Count)
				.ToListAsync();

			var response = new StatsListResponse
			{
				Season = season,
				StandortId = standort.Id,
				StandortName = standort.Standort,
				Items = items
			};

			_cache.Set(cacheKey, response, BuildCacheOptions());
			_logRequestDuration("stats-geschlecht", timer.ElapsedMilliseconds, false);
			return response;
		}

		// GET: api/Stats/alter?standortId=...&season=2026
		[HttpGet("alter")]
		public async Task<ActionResult<StatsListResponse>> GetAlterVerteilung([FromQuery] Guid standortId, [FromQuery] int season)
		{
			var timer = Stopwatch.StartNew();
			var cacheKey = BuildCacheKey("alter", standortId, season, _statsCache.GetVersion());
			if (_cache.TryGetValue(cacheKey, out StatsListResponse? cachedResponse))
			{
				_logRequestDuration("stats-alter", timer.ElapsedMilliseconds, true);
				return cachedResponse!;
			}

			var validation = await ValidateInputsAsync(standortId, season);
			if (validation.errorResult != null)
			{
				return validation.errorResult;
			}

			var standort = validation.standort!;
			var currentQuery = BuildStandortQuery(standort, season);
			var items = await currentQuery
				.GroupBy(v => v.Alter)
				.Select(g => new StatKeyValue { Key = g.Key.ToString(), Count = g.Count() })
				.OrderByDescending(x => x.Count)
				.ToListAsync();

			var response = new StatsListResponse
			{
				Season = season,
				StandortId = standort.Id,
				StandortName = standort.Standort,
				Items = items
			};

			_cache.Set(cacheKey, response, BuildCacheOptions());
			_logRequestDuration("stats-alter", timer.ElapsedMilliseconds, false);
			return response;
		}

		// GET: api/Stats/trend?fromDate=2026-01-01&toDate=2026-05-26&bucket=month&standortIds=...
		[HttpGet("trend")]
		public async Task<ActionResult<StatsTrendResponse>> GetTrend(
			[FromQuery] DateTime? fromDate,
			[FromQuery] DateTime? toDate,
			[FromQuery] string? bucket,
			[FromQuery] List<Guid>? standortIds)
		{
			var timer = Stopwatch.StartNew();
			var cacheKey = BuildCacheKey("trend", fromDate, toDate, bucket, standortIds, _statsCache.GetVersion());
			if (_cache.TryGetValue(cacheKey, out StatsTrendResponse? cachedResponse))
			{
				_logRequestDuration("stats-trend", timer.ElapsedMilliseconds, true);
				return cachedResponse!;
			}

			var bucketMode = string.IsNullOrWhiteSpace(bucket)
				? "month"
				: bucket.Trim().ToLowerInvariant();

			if (bucketMode is not ("month" or "year"))
			{
				return BadRequest("Ungueltige Zeitauflösung.");
			}

			var startDate = (fromDate ?? new DateTime(DateTime.UtcNow.Year, 1, 1)).Date;
			var endDate = (toDate ?? DateTime.UtcNow.Date).Date;

			if (endDate < startDate)
			{
				return BadRequest("Das Enddatum muss nach dem Startdatum liegen.");
			}

			var selectedStandorteQuery = _context.StandortDaten
				.AsNoTracking()
				.OrderBy(s => s.Standort)
				.AsQueryable();

			if (standortIds is { Count: > 0 })
			{
				selectedStandorteQuery = selectedStandorteQuery.Where(s => standortIds.Contains(s.Id));
			}

			var standorte = await selectedStandorteQuery.ToListAsync();
			if (standorte.Count == 0)
			{
				return Ok(new StatsTrendResponse
				{
					FromDate = startDate,
					ToDate = endDate,
					Bucket = bucketMode,
					MaxValue = 0,
					Labels = new List<string>(),
					Series = new List<StatsTrendSeriesResponse>()
				});
			}

			var buckets = BuildTrendBuckets(startDate, endDate, bucketMode);
			var labels = buckets.Select(bucketStart => FormatTrendLabel(bucketStart, bucketMode)).ToList();
			var series = new List<StatsTrendSeriesResponse>();
			var maxValue = 0;
			var endExclusive = endDate.AddDays(1);
			var standortNames = standorte.Select(s => s.Standort).Distinct().ToList();
			var countsByOrtBucket = new Dictionary<(string Ort, DateTime Bucket), int>();
			var countsByOrtKoordBucket = new Dictionary<(string Ort, string? Koord, DateTime Bucket), int>();

			if (standortNames.Count > 0)
			{
				if (bucketMode == "year")
				{
					var counts = await _context.VogelErfassungen
						.AsNoTracking()
						.Where(v => v.Beringungsdatum >= startDate && v.Beringungsdatum < endExclusive)
						.Where(v => standortNames.Contains(v.Beringungsort))
						.GroupBy(v => new { v.Beringungsort, v.Koordinaten, v.Beringungsdatum.Year })
						.Select(g => new { g.Key.Beringungsort, g.Key.Koordinaten, g.Key.Year, Count = g.Count() })
						.ToListAsync();

					foreach (var item in counts)
					{
						var bucketStart = new DateTime(item.Year, 1, 1);
						countsByOrtBucket[(item.Beringungsort, bucketStart)] =
							(countsByOrtBucket.TryGetValue((item.Beringungsort, bucketStart), out var value) ? value : 0)
							+ item.Count;
						countsByOrtKoordBucket[(item.Beringungsort, item.Koordinaten, bucketStart)] = item.Count;
					}
				}
				else
				{
					var counts = await _context.VogelErfassungen
						.AsNoTracking()
						.Where(v => v.Beringungsdatum >= startDate && v.Beringungsdatum < endExclusive)
						.Where(v => standortNames.Contains(v.Beringungsort))
						.GroupBy(v => new { v.Beringungsort, v.Koordinaten, v.Beringungsdatum.Year, v.Beringungsdatum.Month })
						.Select(g => new { g.Key.Beringungsort, g.Key.Koordinaten, g.Key.Year, g.Key.Month, Count = g.Count() })
						.ToListAsync();

					foreach (var item in counts)
					{
						var bucketStart = new DateTime(item.Year, item.Month, 1);
						countsByOrtBucket[(item.Beringungsort, bucketStart)] =
							(countsByOrtBucket.TryGetValue((item.Beringungsort, bucketStart), out var value) ? value : 0)
							+ item.Count;
						countsByOrtKoordBucket[(item.Beringungsort, item.Koordinaten, bucketStart)] = item.Count;
					}
				}
			}

			foreach (var standort in standorte)
			{
				var values = new List<int>(buckets.Count);
				foreach (var bucketStart in buckets)
				{
					int count;
					if (!string.IsNullOrWhiteSpace(standort.Koordinaten))
					{
						countsByOrtKoordBucket.TryGetValue(
							(standort.Standort, standort.Koordinaten, bucketStart),
							out count);
					}
					else
					{
						countsByOrtBucket.TryGetValue((standort.Standort, bucketStart), out count);
					}

					values.Add(count);
				}

				if (values.Count > 0)
				{
					maxValue = Math.Max(maxValue, values.Max());
				}

				series.Add(new StatsTrendSeriesResponse
				{
					StandortId = standort.Id,
					StandortName = standort.Standort,
					Values = values
				});
			}

			var response = new StatsTrendResponse
			{
				FromDate = startDate,
				ToDate = endDate,
				Bucket = bucketMode,
				MaxValue = maxValue,
				Labels = labels,
				Series = series
			};

			_cache.Set(cacheKey, response, BuildCacheOptions());
			_logRequestDuration("stats-trend", timer.ElapsedMilliseconds, false);
			return Ok(response);
		}

		private IQueryable<VogelErfassung> BuildStandortQuery(StandortDaten standort, int season)
		{
			var query = _context.VogelErfassungen
				.AsNoTracking()
				.Where(v => v.Beringungsdatum.Year == season)
				.Where(v => v.Beringungsort == standort.Standort);

			if (!string.IsNullOrWhiteSpace(standort.Koordinaten))
			{
				query = query.Where(v => v.Koordinaten == standort.Koordinaten);
			}

			return query;
		}

		private IQueryable<VogelErfassung> BuildStandortQuery(StandortDaten standort, DateTime startDate, DateTime endExclusive)
		{
			var query = _context.VogelErfassungen
				.AsNoTracking()
				.Where(v => v.Beringungsdatum >= startDate && v.Beringungsdatum < endExclusive)
				.Where(v => v.Beringungsort == standort.Standort);

			if (!string.IsNullOrWhiteSpace(standort.Koordinaten))
			{
				query = query.Where(v => v.Koordinaten == standort.Koordinaten);
			}

			return query;
		}

		private MemoryCacheEntryOptions BuildCacheOptions()
		{
			return new MemoryCacheEntryOptions
			{
				SlidingExpiration = TimeSpan.FromMinutes(5),
				AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(20)
			};
		}

		private static string BuildCacheKey(string prefix, Guid standortId, int season, string version)
		{
			return $"stats:{prefix}:{version}:{standortId}:{season}";
		}

		private static string BuildCacheKey(
			string prefix,
			DateTime? fromDate,
			DateTime? toDate,
			string? bucket,
			IReadOnlyCollection<Guid>? standortIds,
			string version)
		{
			var from = fromDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "auto";
			var to = toDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "auto";
			var bucketKey = string.IsNullOrWhiteSpace(bucket) ? "auto" : bucket.Trim().ToLowerInvariant();
			var standortKey = standortIds is { Count: > 0 }
				? string.Join(',', standortIds.OrderBy(id => id))
				: "all";
			return $"stats:{prefix}:{version}:{from}:{to}:{bucketKey}:{standortKey}";
		}

		private void _logRequestDuration(string name, long elapsedMs, bool cached)
		{
			_logger.LogInformation("Stats {Name} responded in {ElapsedMs}ms (cached: {Cached})", name, elapsedMs, cached);
		}

		private static List<DateTime> BuildTrendBuckets(DateTime startDate, DateTime endDate, string bucketMode)
		{
			var buckets = new List<DateTime>();
			var current = bucketMode == "year"
				? new DateTime(startDate.Year, 1, 1)
				: new DateTime(startDate.Year, startDate.Month, 1);
			var endBucket = bucketMode == "year"
				? new DateTime(endDate.Year, 1, 1)
				: new DateTime(endDate.Year, endDate.Month, 1);

			while (current <= endBucket)
			{
				buckets.Add(current);
				current = bucketMode == "year" ? current.AddYears(1) : current.AddMonths(1);
			}

			return buckets;
		}

		private static string FormatTrendLabel(DateTime bucketStart, string bucketMode)
		{
			var culture = CultureInfo.GetCultureInfo("de-DE");
			return bucketMode == "year"
				? bucketStart.ToString("yyyy", culture)
				: bucketStart.ToString("MMM yyyy", culture);
		}

		private async Task<(StandortDaten? standort, ActionResult? errorResult)> ValidateInputsAsync(Guid standortId, int season)
		{
			if (season < 1900 || season > 3000)
			{
				return (null, BadRequest("Ungueltiges Saison-Jahr."));
			}

			var standort = await _context.StandortDaten.FindAsync(standortId);
			if (standort == null)
			{
				return (null, NotFound());
			}

			return (standort, null);
		}

		private static async Task<double?> AverageIfAnyAsync<T>(IQueryable<T> query, System.Linq.Expressions.Expression<Func<T, double>> selector)
		{
			var count = await query.CountAsync();
			if (count == 0)
			{
				return null;
			}

			return await query.AverageAsync(selector);
		}
	}
}
