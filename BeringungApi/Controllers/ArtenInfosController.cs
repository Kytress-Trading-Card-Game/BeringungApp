using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BeringungApi.Data;
using BeringungApi.Dtos;
using BeringungApi.Models;

namespace BeringungApi.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class ArtenInfosController : ControllerBase
	{
		private readonly AppDbContext _context;

		public ArtenInfosController(AppDbContext context)
		{
			_context = context;
		}

		// GET: api/ArtenInfos
		[HttpGet]
		public async Task<ActionResult<IEnumerable<ArtenInfos>>> GetArtenInfos()
		{
			var result = await _context.ArtenInfos
					.OrderBy(a => a.Artbezeichnung)
					.ToListAsync();

			return Ok(result);
		}

		// GET: api/ArtenInfos/top-arten?standortId=...
		[HttpGet("top-arten")]
		public async Task<ActionResult<ArtenInfosTopArtenResponse>> GetTopArten([FromQuery] Guid standortId)
		{
			var standort = await _context.StandortDaten.FindAsync(standortId);
			if (standort == null)
			{
				return NotFound();
			}

			var standortQuery = _context.VogelErfassungen
				.Where(v => v.Beringungsort == standort.Standort)
				.Where(v => !string.IsNullOrWhiteSpace(v.Vogelart));

			if (!string.IsNullOrWhiteSpace(standort.Koordinaten))
			{
				standortQuery = standortQuery.Where(v => v.Koordinaten == standort.Koordinaten);
			}

			var counts = standortQuery
				.GroupBy(v => v.Vogelart!.ToLower())
				.Select(g => new { Key = g.Key, Count = g.Count() });

			var items = await _context.ArtenInfos
				.Select(a => new { a.Artbezeichnung, Key = a.Artbezeichnung.ToLower() })
				.GroupJoin(
					counts,
					a => a.Key,
					c => c.Key,
					(a, c) => new StatKeyValue
					{
						Key = a.Artbezeichnung,
						Count = c.Select(x => x.Count).FirstOrDefault()
					})
				.OrderByDescending(x => x.Count)
				.ThenBy(x => x.Key)
				.ToListAsync();

			return new ArtenInfosTopArtenResponse
			{
				StandortId = standort.Id,
				StandortName = standort.Standort,
				Items = items
			};
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

			return NoContent();
		}
	}
}
