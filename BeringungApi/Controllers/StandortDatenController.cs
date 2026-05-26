using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BeringungApi.Data;
using BeringungApi.Models;

namespace BeringungApi.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class StandortDatenController : ControllerBase
	{
		private readonly AppDbContext _context;

		public StandortDatenController(AppDbContext context)
		{
			_context = context;
		}

		[HttpGet]
		public async Task<ActionResult<IEnumerable<StandortDaten>>> GetStandorte()
		{
			return await _context.StandortDaten.ToListAsync();
		}

		[HttpGet("{id}")]
		public async Task<ActionResult<StandortDaten>> GetStandort(Guid id)
		{
			var standort = await _context.StandortDaten.FindAsync(id);
			if (standort == null)
			{
				return NotFound();
			}

			return standort;
		}

		[HttpPost]
		public async Task<ActionResult<StandortDaten>> PostStandort(StandortDaten standort)
		{
			_context.StandortDaten.Add(standort);
			await _context.SaveChangesAsync();

			return CreatedAtAction(nameof(GetStandort), new { id = standort.Id }, standort);
		}

		[HttpPut("{id}")]
		public async Task<IActionResult> PutStandort(Guid id, StandortDaten standort)
		{
			if (id != standort.Id)
			{
				return BadRequest();
			}

			_context.Entry(standort).State = EntityState.Modified;

			try
			{
				await _context.SaveChangesAsync();
			}
			catch (DbUpdateConcurrencyException)
			{
				if (!StandortExists(id))
				{
					return NotFound();
				}
				else
				{
					throw;
				}
			}

			return NoContent();
		}

		[HttpDelete("{id}")]
		public async Task<IActionResult> DeleteStandort(Guid id)
		{
			var standort = await _context.StandortDaten.FindAsync(id);
			if (standort == null)
			{
				return NotFound();
			}

			_context.StandortDaten.Remove(standort);
			await _context.SaveChangesAsync();

			return NoContent();
		}

		private bool StandortExists(Guid id)
		{
			return _context.StandortDaten.Any(e => e.Id == id);
		}
	}
}
