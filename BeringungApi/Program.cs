using Microsoft.EntityFrameworkCore;
using BeringungApi.Data;
using BeringungApi.Services;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://+:3003");
// builder.WebHost.UseUrls("http://127.0.0.1:5000");
// Add services to the container.


// var sqliteConnectionString = builder.Configuration.GetConnectionString("BeringungDb")
// 	?? "Data Source=beringung.db";
// prodSqliteString!:
var appDataPath = "/data";
// var appDataPath = Environment.GetFolderPath(
// 		Environment.SpecialFolder.ApplicationData);

var appFolder = Path.Combine(appDataPath, "BeringungApp");

Directory.CreateDirectory(appFolder);

var databasePath = Path.Combine(appFolder, "beringung.db");

var sqliteConnectionString = $"Data Source={databasePath}";

builder.Services.AddDbContext<AppDbContext>(options =>
		options.UseSqlite(sqliteConnectionString));

builder.Services.AddMemoryCache();
builder.Services.AddSingleton<IStatsCacheService, StatsCacheService>();

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
	options.AddPolicy("ElectronCors", policy =>
			policy.AllowAnyOrigin()
						.AllowAnyHeader()
						.AllowAnyMethod());
});
builder.Services.AddScoped<IInputSanitizerService, InputSanitizerService>();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApiDocument(config =>
{
	config.Title = "Beringung API";
	config.Version = "v1";
	config.DocumentName = "BeringungApi-v1";
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
	var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
	dbContext.Database.EnsureCreated();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseOpenApi();
		app.UseSwaggerUi();
}

app.UseCors("ElectronCors");

app.UseAuthorization();

app.MapControllers();

app.Run();
