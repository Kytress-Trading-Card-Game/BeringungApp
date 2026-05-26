using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using BeringungApi.Dtos;
using BeringungApi.Data;
using BeringungApi.Models;

namespace BeringungApi.Services
{
	public class InputSanitizerService : IInputSanitizerService
	{
		private readonly AppDbContext _context;

		public InputSanitizerService(AppDbContext context)
		{
			_context = context;
		}

		public IReadOnlyList<string> ValidateVogelErfassungCreate(VogelErfassungCreateDto dto)
		{
			var issues = new List<string>();

			// basic hard limits
			if (dto.Gewicht is not null && (dto.Gewicht < 0.1 || dto.Gewicht > 5000.0))
			{
				issues.Add("Gewicht wirkt unplausibel. Bitte prüfen.");
			}

			if (dto.Fluegellaenge is not null && (dto.Fluegellaenge < 0.1 || dto.Fluegellaenge > 1000.0))
			{
				issues.Add("Flügellaenge wirkt unplausibel. Bitte prüfen.");
			}

			// Validate Vogelart against ArtenInfos
			if (!string.IsNullOrWhiteSpace(dto.Vogelart))
			{
				var art = _context.ArtenInfos
					.AsNoTracking()
					.FirstOrDefault(a => a.Artbezeichnung.ToLower() == dto.Vogelart!.Trim().ToLower());

				if (art == null)
				{
					issues.Add("Die angegebene Art ist in den Arteninformationen nicht vorhanden.");
				}
				else
				{
					// use ArtenInfos min/max to validate measurements
					if (dto.Gewicht.HasValue && art.MinGewicht.HasValue && dto.Gewicht < art.MinGewicht)
					{
						issues.Add($"Gewicht liegt unter Mindestwert für {art.Artbezeichnung} ({art.MinGewicht}g).");
					}
					if (dto.Gewicht.HasValue && art.MaxGewicht.HasValue && dto.Gewicht > art.MaxGewicht)
					{
						issues.Add($"Gewicht liegt über Maximalwert für {art.Artbezeichnung} ({art.MaxGewicht}g).");
					}
					if (dto.Fluegellaenge.HasValue && art.MinFluegellaenge.HasValue && dto.Fluegellaenge < art.MinFluegellaenge)
					{
						issues.Add($"Flügellänge liegt unter Mindestwert für {art.Artbezeichnung} ({art.MinFluegellaenge}mm).");
					}
					if (dto.Fluegellaenge.HasValue && art.MaxFluegellaenge.HasValue && dto.Fluegellaenge > art.MaxFluegellaenge)
					{
						issues.Add($"Flügellänge liegt über Maximalwert für {art.Artbezeichnung} ({art.MaxFluegellaenge}mm).");
					}
				}
			}

			// Validate ringnummer pattern: A0A0000 (length 7, char positions)
			if (!string.IsNullOrWhiteSpace(dto.Ringnummer))
			{
				var rn = dto.Ringnummer.Trim();
				// pattern: letter digit letter 4digits
				var match = Regex.IsMatch(rn, "^[A-Za-z][0-9][A-Za-z][0-9]{4}$");
				if (!match)
				{
					issues.Add("Ringnummer hat nicht das erwartete Format (z.B. A0A0001).");
				}
			}

			return issues;
		}
	}
}
