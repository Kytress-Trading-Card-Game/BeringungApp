using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using BeringungApi.Data;
using BeringungApi.Dtos;
using BeringungApi.Models;
using BeringungApi.Services;
using System.Diagnostics;

namespace BeringungApi.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class ArtenInfosController : ControllerBase
	{
		private readonly AppDbContext _context;
		private readonly IMemoryCache _cache;
		private readonly IStatsCacheService _statsCache;
		private readonly ILogger<ArtenInfosController> _logger;

		public ArtenInfosController(
			AppDbContext context,
			IMemoryCache cache,
			IStatsCacheService statsCache,
			ILogger<ArtenInfosController> logger)
		{
			_context = context;
			_cache = cache;
			_statsCache = statsCache;
			_logger = logger;
		}

		// GET: api/ArtenInfos
		[HttpGet]
		public async Task<ActionResult<IEnumerable<ArtenInfos>>> GetArtenInfos()
		{
			var result = await _context.ArtenInfos
					.AsNoTracking()
					.OrderBy(a => a.Artbezeichnung)
					.ToListAsync();

			return Ok(result);
		}

		// GET: api/ArtenInfos/top-arten?standortId=...&limit=25
		[HttpGet("top-arten")]
		public async Task<ActionResult<ArtenInfosTopArtenResponse>> GetTopArten(
			[FromQuery] Guid standortId,
			[FromQuery] int? limit)
		{
			var timer = Stopwatch.StartNew();
			var take = Math.Clamp(limit ?? 25, 1, 100);
			var cacheKey = BuildCacheKey("top-arten", standortId, take, _statsCache.GetVersion());
			if (_cache.TryGetValue(cacheKey, out ArtenInfosTopArtenResponse? cachedResponse))
			{
				_logRequestDuration("arten-top-arten", timer.ElapsedMilliseconds, true);
				return cachedResponse!;
			}

			var standort = await _context.StandortDaten.FindAsync(standortId);
			if (standort == null)
			{
				return NotFound();
			}

			var standortKey = standort.Id.ToString();
			var standortQuery = _context.VogelErfassungen
				.AsNoTracking()
				.Where(v =>
					v.StandortKey == standortKey
					|| (string.IsNullOrEmpty(v.StandortKey) && v.Beringungsort == standort.Standort))
				.Where(v => !string.IsNullOrWhiteSpace(v.Vogelart));

			if (!string.IsNullOrWhiteSpace(standort.Koordinaten))
			{
				standortQuery = standortQuery.Where(v =>
					v.StandortKey == standortKey
					|| (string.IsNullOrEmpty(v.StandortKey) && v.Koordinaten == standort.Koordinaten));
			}

			var counts = await standortQuery
				.GroupBy(v => v.Vogelart!.ToLower())
				.Select(g => new { Key = g.Key, Count = g.Count() })
				.OrderByDescending(x => x.Count)
				.ThenBy(x => x.Key)
				.Take(take)
				.ToListAsync();

			var keyList = counts.Select(c => c.Key).ToList();
			var nameMap = await _context.ArtenInfos
				.AsNoTracking()
				.Where(a => keyList.Contains(a.Artbezeichnung.ToLower()))
				.Select(a => new { Key = a.Artbezeichnung.ToLower(), Name = a.Artbezeichnung })
				.ToListAsync();

			var nameLookup = nameMap
				.GroupBy(x => x.Key)
				.ToDictionary(x => x.Key, x => x.First().Name);

			var items = counts
				.Select(item => new StatKeyValue
				{
					Key = nameLookup.TryGetValue(item.Key, out var name) ? name : item.Key,
					Count = item.Count
				})
				.ToList();

			var response = new ArtenInfosTopArtenResponse
			{
				StandortId = standort.Id,
				StandortName = standort.Standort,
				Items = items
			};

			_cache.Set(cacheKey, response, BuildCacheOptions());
			_logRequestDuration("arten-top-arten", timer.ElapsedMilliseconds, false);
			return response;
		}

		// POST: api/ArtenInfos
		[HttpPost]
		public async Task<ActionResult<ArtenInfos>> CreateArt(ArtenInfosCreateDto dto)
		{
			if (!ModelState.IsValid)
			{
				return BadRequest(ModelState);
			}

			var artbezeichnung = dto.Artbezeichnung?.Trim();
			if (string.IsNullOrWhiteSpace(artbezeichnung))
			{
				return BadRequest(new { error = "Artbezeichnung ist erforderlich." });
			}

			var exists = await _context.ArtenInfos
					.AnyAsync(a => a.Artbezeichnung.ToLower() == artbezeichnung.ToLower());

			if (exists)
			{
				return Conflict(new { error = "Artbezeichnung existiert bereits." });
			}

			var entity = new ArtenInfos
			{
				Artbezeichnung = artbezeichnung,
				RingnummerTyp = string.IsNullOrWhiteSpace(dto.RingnummerTyp) ? null : dto.RingnummerTyp.Trim(),
				MinGewicht = dto.MinGewicht,
				MaxGewicht = dto.MaxGewicht,
				MinFluegellaenge = dto.MinFluegellaenge,
				MaxFluegellaenge = dto.MaxFluegellaenge
			};

			_context.ArtenInfos.Add(entity);
			await _context.SaveChangesAsync();
			_statsCache.Invalidate();

			return Ok(entity);
		}

		// PUT: api/ArtenInfos/{artbezeichnung}
		[HttpPut("{artbezeichnung}")]
		public async Task<ActionResult<ArtenInfos>> UpdateArt(string artbezeichnung, ArtenInfosUpdateDto dto)
		{
			if (string.IsNullOrWhiteSpace(artbezeichnung))
			{
				return BadRequest(new { error = "Artbezeichnung ist erforderlich." });
			}

			var normalized = artbezeichnung.Trim();
			var entity = await _context.ArtenInfos
					.FirstOrDefaultAsync(a => a.Artbezeichnung.ToLower() == normalized.ToLower());

			if (entity == null)
			{
				return NotFound();
			}

			entity.MinGewicht = dto.MinGewicht;
			entity.MaxGewicht = dto.MaxGewicht;
			entity.MinFluegellaenge = dto.MinFluegellaenge;
			entity.MaxFluegellaenge = dto.MaxFluegellaenge;
			entity.RingnummerTyp = string.IsNullOrWhiteSpace(dto.RingnummerTyp) ? null : dto.RingnummerTyp.Trim();

			await _context.SaveChangesAsync();
			_statsCache.Invalidate();

			return Ok(entity);
		}

		// DELETE: api/ArtenInfos/{artbezeichnung}
		[HttpDelete("{artbezeichnung}")]
		public async Task<IActionResult> DeleteArt(string artbezeichnung)
		{
			if (string.IsNullOrWhiteSpace(artbezeichnung))
			{
				return BadRequest(new { error = "Artbezeichnung ist erforderlich." });
			}

			var normalized = artbezeichnung.Trim();
			var entity = await _context.ArtenInfos
					.FirstOrDefaultAsync(a => a.Artbezeichnung.ToLower() == normalized.ToLower());

			if (entity == null)
			{
				return NotFound();
			}

			_context.ArtenInfos.Remove(entity);
			await _context.SaveChangesAsync();
			_statsCache.Invalidate();

			return NoContent();
		}

		private MemoryCacheEntryOptions BuildCacheOptions()
		{
			return new MemoryCacheEntryOptions
			{
				SlidingExpiration = TimeSpan.FromMinutes(5),
				AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(20)
			};
		}

		private static string BuildCacheKey(string prefix, Guid standortId, int limit, string version)
		{
			return $"arten:{prefix}:{version}:{standortId}:{limit}";
		}

		private void _logRequestDuration(string name, long elapsedMs, bool cached)
		{
			_logger.LogInformation("ArtenInfos {Name} responded in {ElapsedMs}ms (cached: {Cached})", name, elapsedMs, cached);
		}
	}
}
