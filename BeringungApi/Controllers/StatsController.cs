using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BeringungApi.Data;
using BeringungApi.Dtos;
using BeringungApi.Models;

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
