using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BeringungApi.Data;
using BeringungApi.Dtos;
using BeringungApi.Models;
using BeringungApi.Services;

namespace BeringungApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VogelErfassungController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IInputSanitizerService _inputSanitizer;

        public VogelErfassungController(AppDbContext context, IInputSanitizerService inputSanitizer)
        {
            _context = context;
            _inputSanitizer = inputSanitizer;
        }

		// GET: api/VogelErfassung
		[HttpGet]
		public async Task<ActionResult<object>> GetVogelErfassungen(
				[FromQuery] VogelErfassungQueryDto query)
		{
			var vogelQuery = _context.VogelErfassungen.AsQueryable();

			// =========================
			// FILTER
			// =========================

            // Default: no filter unless query param is provided
			if (query.Wiederfang.HasValue)
			{
				vogelQuery = vogelQuery.Where(v => v.Wiederfang == query.Wiederfang.Value);
			}

			if (!string.IsNullOrWhiteSpace(query.Vogelart))
			{
				vogelQuery = vogelQuery.Where(v =>
						v.Vogelart != null &&
						v.Vogelart.ToLower().Contains(query.Vogelart.ToLower()));
			}

            if (!string.IsNullOrWhiteSpace(query.Standort))
            {
                vogelQuery = vogelQuery.Where(v =>
                        v.Beringungsort != null &&
                        v.Beringungsort.ToLower() == query.Standort.ToLower());
            }

            if (query.MinGewicht.HasValue)
            {
                vogelQuery = vogelQuery.Where(v =>
                        v.Gewicht.HasValue &&
                        v.Gewicht.Value >= query.MinGewicht.Value);
            }

            if (query.MaxGewicht.HasValue)
            {
                vogelQuery = vogelQuery.Where(v =>
                        v.Gewicht.HasValue &&
                        v.Gewicht.Value <= query.MaxGewicht.Value);
            }

            if (query.MinFluegellaenge.HasValue)
            {
                vogelQuery = vogelQuery.Where(v =>
                        v.Fluegellaenge.HasValue &&
                        v.Fluegellaenge.Value >= query.MinFluegellaenge.Value);
            }

            if (query.MaxFluegellaenge.HasValue)
            {
                vogelQuery = vogelQuery.Where(v =>
                        v.Fluegellaenge.HasValue &&
                        v.Fluegellaenge.Value <= query.MaxFluegellaenge.Value);
            }

            if (query.Geschlecht.HasValue)
            {
                vogelQuery = vogelQuery.Where(v => v.Geschlecht == query.Geschlecht.Value);
            }

            if (query.Alter.HasValue)
            {
                vogelQuery = vogelQuery.Where(v => v.Alter == query.Alter.Value);
            }

            if (!string.IsNullOrWhiteSpace(query.RingnummerPrefix))
            {
                vogelQuery = vogelQuery.Where(v =>
                        v.Ringnummer != null &&
                        v.Ringnummer.ToLower().StartsWith(query.RingnummerPrefix.ToLower()));
            }

			if (query.VonDatum.HasValue)
			{
				vogelQuery = vogelQuery.Where(v =>
						v.Beringungsdatum >= query.VonDatum.Value);
			}

			if (query.BisDatum.HasValue)
			{
				vogelQuery = vogelQuery.Where(v =>
						v.Beringungsdatum <= query.BisDatum.Value);
			}

			// =========================
			// SORTIERUNG
			// =========================

			query.SortBy = query.SortBy.ToLower();
			query.SortDirection = query.SortDirection.ToLower();

			vogelQuery = (query.SortBy, query.SortDirection) switch
			{
				("gewicht", "asc") => vogelQuery.OrderBy(v => v.Gewicht),
				("gewicht", "desc") => vogelQuery.OrderByDescending(v => v.Gewicht),

				("fluegellaenge", "asc") => vogelQuery.OrderBy(v => v.Fluegellaenge),
				("fluegellaenge", "desc") => vogelQuery.OrderByDescending(v => v.Fluegellaenge),

				("vogelart", "asc") => vogelQuery.OrderBy(v => v.Vogelart),
				("vogelart", "desc") => vogelQuery.OrderByDescending(v => v.Vogelart),

				("beringungsdatum", "asc") => vogelQuery.OrderBy(v => v.Beringungsdatum),

				// DEFAULT
				_ => vogelQuery.OrderByDescending(v => v.Beringungsdatum)
			};

			// =========================
			// PAGING
			// =========================

			query.Page = query.Page <= 0 ? 1 : query.Page;
			query.PageSize = query.PageSize <= 0 ? 25 : query.PageSize;

			var totalCount = await vogelQuery.CountAsync();

			var items = await vogelQuery
					.Skip((query.Page - 1) * query.PageSize)
					.Take(query.PageSize)
					.ToListAsync();

			return Ok(new
			{
				page = query.Page,
				pageSize = query.PageSize,
				totalCount,
				totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize),
				data = items
			});
		}

		// GET: api/VogelErfassung/ringnummer/ABC123
		[HttpGet("ringnummer/{ringnummer}")]
		public async Task<ActionResult<IEnumerable<VogelErfassung>>> GetByRingnummer(string ringnummer)
		{
			var result = await _context.VogelErfassungen
					.Where(v => v.Ringnummer == ringnummer)
					.OrderByDescending(v => v.Beringungsdatum)
					.ToListAsync();

			return Ok(result);
		}

        // GET: api/VogelErfassung/ringnummer/next/A
        [HttpGet("ringnummer/next/{anfangsbuchstabe}")]
        public async Task<ActionResult<object>> GetNextRingnummer(string anfangsbuchstabe)
        {
            if (string.IsNullOrWhiteSpace(anfangsbuchstabe) || anfangsbuchstabe.Length != 1)
            {
                return BadRequest(new { error = "anfangsbuchstabe muss genau 1 Zeichen lang sein." });
            }

            var prefix = anfangsbuchstabe.ToUpper();
            var latestRingnummer = await _context.VogelErfassungen
                .Where(v => v.Ringnummer != null && v.Ringnummer.ToUpper().StartsWith(prefix))
                .OrderByDescending(v => v.Ringnummer)
                .Select(v => v.Ringnummer)
                .FirstOrDefaultAsync();

            var currentRingnummer = string.IsNullOrWhiteSpace(latestRingnummer)
                ? $"{prefix}0A0000"
                : latestRingnummer;

            if (currentRingnummer.Length < 7)
            {
                return BadRequest(new { error = "Ringnummer Format ist ungueltig." });
            }

            var nextRingnummer = CalculateNextRingnummer(currentRingnummer);
            return Ok(new { ringnummer = nextRingnummer });
        }

		// GET: api/VogelErfassung/5
		[HttpGet("{id}")]
        public async Task<ActionResult<VogelErfassung>> GetVogelErfassung(Guid id)
        {
            var vogelErfassung = await _context.VogelErfassungen.FindAsync(id);

            if (vogelErfassung == null)
            {
                return NotFound();
            }

            return vogelErfassung;
        }

        // PUT: api/VogelErfassung/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutVogelErfassung(Guid id, VogelErfassung vogelErfassung)
        {
            if (id != vogelErfassung.Id)
            {
                return BadRequest();
            }

            _context.Entry(vogelErfassung).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!VogelErfassungExists(id))
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

        // POST: api/VogelErfassung
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<VogelErfassung>> PostVogelErfassung(VogelErfassungCreateDto dto)
        {
            if (!dto.PlausibilitaetUeberspringen)
            {
                var issues = _inputSanitizer.ValidateVogelErfassungCreate(dto);
                if (issues.Count > 0)
                {
                    return BadRequest(new { errors = issues });
                }
            }

            var settings = await _context.AppSettings
                .Include(s => s.ActiveStandort)
                .FirstOrDefaultAsync();

            var beringungsort = "AUTO";
            var koordinaten = "AUTO";

            if (settings?.ActiveStandort != null)
            {
                beringungsort = settings.ActiveStandort.Standort;
                koordinaten = settings.ActiveStandort.Koordinaten ?? koordinaten;
            }

            var vogelErfassung = new VogelErfassung
            {
                Ringnummer = dto.Ringnummer,
                Beringungsdatum = dto.Beringungsdatum,
                Beringungsort = beringungsort,
                Koordinaten = koordinaten,
                Wiederfang = dto.Wiederfang,
                Vogelart = dto.Vogelart,
                Gewicht = dto.Gewicht,
                Fluegellaenge = dto.Fluegellaenge,
                Geschlecht = dto.Geschlecht,
                Alter = dto.Alter,
                Bemerkungen = dto.Bemerkungen
            };

            _context.VogelErfassungen.Add(vogelErfassung);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetVogelErfassung), new { id = vogelErfassung.Id }, vogelErfassung);
        }

        // DELETE: api/VogelErfassung/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVogelErfassung(Guid id)
        {
            var vogelErfassung = await _context.VogelErfassungen.FindAsync(id);
            if (vogelErfassung == null)
            {
                return NotFound();
            }

            _context.VogelErfassungen.Remove(vogelErfassung);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool VogelErfassungExists(Guid id)
        {
            return _context.VogelErfassungen.Any(e => e.Id == id);
        }

        private string CalculateNextRingnummer(string currentRingnummer)
        {
            // Format: A0A0000
            char hauptBuchstabe = currentRingnummer[0];
            char ziffer = currentRingnummer[1];
            char nebenBuchstabe = currentRingnummer[2];
            string nummer = currentRingnummer.Substring(3);

            int nummerInt = int.Parse(nummer);

            // Increase the four-digit number
            nummerInt++;

            if (nummerInt <= 9999)
            {
                return $"{hauptBuchstabe}{ziffer}{nebenBuchstabe}{nummerInt:D4}";
            }

            // Over 9999, increase side letter
            nummerInt = 1;
            nebenBuchstabe++;

            if (nebenBuchstabe <= 'Z')
            {
                return $"{hauptBuchstabe}{ziffer}{nebenBuchstabe}{nummerInt:D4}";
            }

            // Side letter over Z, increase digit
            nebenBuchstabe = 'A';
            int zifferInt = int.Parse(ziffer.ToString());
            zifferInt++;
            nummerInt = 1;

            if (zifferInt <= 9)
            {
                return $"{hauptBuchstabe}{zifferInt}{nebenBuchstabe}{nummerInt:D4}";
            }

            // A9Z9999 is max
            throw new InvalidOperationException("Maximale Ringnummer fuer diesen Buchstaben erreicht");
        }
    }
}
