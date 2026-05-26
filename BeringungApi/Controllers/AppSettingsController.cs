using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BeringungApi.Data;
using BeringungApi.Models;

namespace BeringungApi.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class AppSettingsController : ControllerBase
	{
		private readonly AppDbContext _context;

		public AppSettingsController(AppDbContext context)
		{
			_context = context;
		}

		[HttpGet]
		public async Task<ActionResult<AppSettings>> GetSettings()
		{
			var settings = await GetOrCreateSettingsAsync();
			return settings;
		}

		[HttpPut("active-standort/{standortId}")]
		public async Task<ActionResult<AppSettings>> SetActiveStandort(Guid standortId)
		{
			var standort = await _context.StandortDaten.FindAsync(standortId);
			if (standort == null)
			{
				return NotFound();
			}

			var settings = await GetOrCreateSettingsAsync();
			settings.ActiveStandortId = standortId;

			await _context.SaveChangesAsync();

			return settings;
		}

		private async Task<AppSettings> GetOrCreateSettingsAsync()
		{
			var settings = await _context.AppSettings.FirstOrDefaultAsync();
			if (settings != null)
			{
				return settings;
			}

			settings = new AppSettings();
			_context.AppSettings.Add(settings);
			await _context.SaveChangesAsync();

			return settings;
		}
	}
}
