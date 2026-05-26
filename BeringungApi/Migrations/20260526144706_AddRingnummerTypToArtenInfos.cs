using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BeringungApi.Migrations
{
    /// <inheritdoc />
    public partial class AddRingnummerTypToArtenInfos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ArtenInfos",
                columns: table => new
                {
                    Artbezeichnung = table.Column<string>(type: "TEXT", nullable: false),
                    RingnummerTyp = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    MinGewicht = table.Column<double>(type: "REAL", nullable: true),
                    MaxGewicht = table.Column<double>(type: "REAL", nullable: true),
                    MinFluegellaenge = table.Column<double>(type: "REAL", nullable: true),
                    MaxFluegellaenge = table.Column<double>(type: "REAL", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArtenInfos", x => x.Artbezeichnung);
                });

            migrationBuilder.CreateTable(
                name: "StandortDaten",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Standort = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Koordinaten = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StandortDaten", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VogelErfassungen",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Ringnummer = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Beringungsdatum = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Beringungsort = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Koordinaten = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Wiederfang = table.Column<bool>(type: "INTEGER", nullable: false),
                    Vogelart = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Gewicht = table.Column<double>(type: "REAL", nullable: false),
                    Fluegellaenge = table.Column<double>(type: "REAL", nullable: false),
                    Geschlecht = table.Column<int>(type: "INTEGER", nullable: false),
                    Alter = table.Column<int>(type: "INTEGER", nullable: false),
                    Bemerkungen = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VogelErfassungen", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ActiveStandortId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppSettings_StandortDaten_ActiveStandortId",
                        column: x => x.ActiveStandortId,
                        principalTable: "StandortDaten",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppSettings_ActiveStandortId",
                table: "AppSettings",
                column: "ActiveStandortId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppSettings");

            migrationBuilder.DropTable(
                name: "ArtenInfos");

            migrationBuilder.DropTable(
                name: "VogelErfassungen");

            migrationBuilder.DropTable(
                name: "StandortDaten");
        }
    }
}
