using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BeringungApi.Data;
using BeringungApi.Dtos;
using BeringungApi.Models;
using System.Globalization;

namespace BeringungApi.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class StatsController : ControllerBase
	{
		private readonly AppDbContext _context;

		public StatsController(AppDbContext context)
		{
			_context = context;
		}

		// GET: api/Stats?standortId=...&season=2026
		[HttpGet]
		public async Task<ActionResult<StatsSeasonResponse>> GetSeasonStats([FromQuery] Guid standortId, [FromQuery] int season)
		{
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

			return response;
		}

		// GET: api/Stats/totals?standortId=...&season=2026
		[HttpGet("totals")]
		public async Task<ActionResult<StatsTotalsResponse>> GetTotals([FromQuery] Guid standortId, [FromQuery] int season)
		{
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

			return new StatsTotalsResponse
			{
				Season = season,
				StandortId = standort.Id,
				StandortName = standort.Standort,
				TotalCurrentSeason = totalCurrent,
				TotalPreviousSeason = totalPrevious,
				DeltaCount = deltaCount,
				DeltaPercent = deltaPercent
			};
		}

		// GET: api/Stats/wiederfang?standortId=...&season=2026
		[HttpGet("wiederfang")]
		public async Task<ActionResult<StatsWiederfangResponse>> GetWiederfang([FromQuery] Guid standortId, [FromQuery] int season)
		{
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

			return new StatsWiederfangResponse
			{
				Season = season,
				StandortId = standort.Id,
				StandortName = standort.Standort,
				TotalCurrentSeason = totalCurrent,
				WiederfangCount = wiederfangCount,
				WiederfangPercent = wiederfangPercent
			};
		}

		// GET: api/Stats/averages?standortId=...&season=2026
		[HttpGet("averages")]
		public async Task<ActionResult<StatsAveragesResponse>> GetAverages([FromQuery] Guid standortId, [FromQuery] int season)
		{
			var validation = await ValidateInputsAsync(standortId, season);
			if (validation.errorResult != null)
			{
				return validation.errorResult;
			}

			var standort = validation.standort!;
			var currentQuery = BuildStandortQuery(standort, season);
			var avgGewicht = await AverageIfAnyAsync(currentQuery.Where(v => v.Gewicht.HasValue), v => v.Gewicht!.Value);
			var avgFluegel = await AverageIfAnyAsync(currentQuery.Where(v => v.Fluegellaenge.HasValue), v => v.Fluegellaenge!.Value);

			return new StatsAveragesResponse
			{
				Season = season,
				StandortId = standort.Id,
				StandortName = standort.Standort,
				DurchschnittGewicht = avgGewicht,
				DurchschnittFluegellaenge = avgFluegel
			};
		}

		// GET: api/Stats/top-arten?standortId=...&season=2026
		[HttpGet("top-arten")]
		public async Task<ActionResult<StatsListResponse>> GetTopArten([FromQuery] Guid standortId, [FromQuery] int season)
		{
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

			return new StatsListResponse
			{
				Season = season,
				StandortId = standort.Id,
				StandortName = standort.Standort,
				Items = items
			};
		}

		// GET: api/Stats/geschlecht?standortId=...&season=2026
		[HttpGet("geschlecht")]
		public async Task<ActionResult<StatsListResponse>> GetGeschlechtVerteilung([FromQuery] Guid standortId, [FromQuery] int season)
		{
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

			return new StatsListResponse
			{
				Season = season,
				StandortId = standort.Id,
				StandortName = standort.Standort,
				Items = items
			};
		}

		// GET: api/Stats/alter?standortId=...&season=2026
		[HttpGet("alter")]
		public async Task<ActionResult<StatsListResponse>> GetAlterVerteilung([FromQuery] Guid standortId, [FromQuery] int season)
		{
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

			return new StatsListResponse
			{
				Season = season,
				StandortId = standort.Id,
				StandortName = standort.Standort,
				Items = items
			};
		}

		// GET: api/Stats/trend?fromDate=2026-01-01&toDate=2026-05-26&bucket=month&standortIds=...
		[HttpGet("trend")]
		public async Task<ActionResult<StatsTrendResponse>> GetTrend(
			[FromQuery] DateTime? fromDate,
			[FromQuery] DateTime? toDate,
			[FromQuery] string? bucket,
			[FromQuery] List<Guid>? standortIds)
		{
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

			foreach (var standort in standorte)
			{
				var query = BuildStandortQuery(standort, startDate, endExclusive);
				var countsByBucket = new Dictionary<DateTime, int>();

				if (bucketMode == "year")
				{
					var counts = await query
						.GroupBy(v => v.Beringungsdatum.Year)
						.Select(g => new { Year = g.Key, Count = g.Count() })
						.ToListAsync();

					foreach (var item in counts)
					{
						countsByBucket[new DateTime(item.Year, 1, 1)] = item.Count;
					}
				}
				else
				{
					var counts = await query
						.GroupBy(v => new { v.Beringungsdatum.Year, v.Beringungsdatum.Month })
						.Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
						.ToListAsync();

					foreach (var item in counts)
					{
						countsByBucket[new DateTime(item.Year, item.Month, 1)] = item.Count;
					}
				}

				var values = buckets
					.Select(bucketStart => countsByBucket.TryGetValue(bucketStart, out var count) ? count : 0)
					.ToList();

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

			return Ok(new StatsTrendResponse
			{
				FromDate = startDate,
				ToDate = endDate,
				Bucket = bucketMode,
				MaxValue = maxValue,
				Labels = labels,
				Series = series
			});
		}

		private IQueryable<VogelErfassung> BuildStandortQuery(StandortDaten standort, int season)
		{
			var query = _context.VogelErfassungen
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
