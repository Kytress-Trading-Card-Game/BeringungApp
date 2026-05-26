using Microsoft.EntityFrameworkCore;
using BeringungApi.Models;

namespace BeringungApi.Data;

public class AppDbContext : DbContext
{
		public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
		{
		}

		public DbSet<VogelErfassung> VogelErfassungen { get; set; }
		public DbSet<StandortDaten> StandortDaten { get; set; }
		public DbSet<AppSettings> AppSettings { get; set; }
		public DbSet<ArtenInfos> ArtenInfos { get; set; }

		protected override void OnModelCreating(ModelBuilder modelBuilder)
		{
			modelBuilder.Entity<AppSettings>()
				.Navigation(s => s.ActiveStandort)
				.AutoInclude();

			base.OnModelCreating(modelBuilder);
		}

		public override int SaveChanges()
		{
			UpdateTimestamps();
			return base.SaveChanges();
		}

		public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
		{
			UpdateTimestamps();
			return base.SaveChangesAsync(cancellationToken);
		}

		private void UpdateTimestamps()
		{
			var utcNow = DateTime.UtcNow;
			foreach (var entry in ChangeTracker.Entries<BaseModel>())
			{
				if (entry.State == EntityState.Added)
				{
					entry.Entity.CreatedAt = utcNow;
					entry.Entity.UpdatedAt = utcNow;
				}
				else if (entry.State == EntityState.Modified)
				{
					entry.Entity.UpdatedAt = utcNow;
				}
			}
		}
}