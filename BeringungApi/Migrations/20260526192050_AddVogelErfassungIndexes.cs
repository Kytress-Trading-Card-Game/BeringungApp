using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BeringungApi.Migrations
{
    /// <inheritdoc />
    public partial class AddVogelErfassungIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_VogelErfassungen_Beringungsdatum",
                table: "VogelErfassungen",
                column: "Beringungsdatum");

            migrationBuilder.CreateIndex(
                name: "IX_VogelErfassungen_Beringungsdatum_Beringungsort_Koordinaten",
                table: "VogelErfassungen",
                columns: new[] { "Beringungsdatum", "Beringungsort", "Koordinaten" });

            migrationBuilder.CreateIndex(
                name: "IX_VogelErfassungen_Beringungsdatum_Wiederfang",
                table: "VogelErfassungen",
                columns: new[] { "Beringungsdatum", "Wiederfang" });

            migrationBuilder.CreateIndex(
                name: "IX_VogelErfassungen_Beringungsort_Koordinaten",
                table: "VogelErfassungen",
                columns: new[] { "Beringungsort", "Koordinaten" });

            migrationBuilder.CreateIndex(
                name: "IX_VogelErfassungen_Ringnummer",
                table: "VogelErfassungen",
                column: "Ringnummer");

            migrationBuilder.CreateIndex(
                name: "IX_VogelErfassungen_Vogelart",
                table: "VogelErfassungen",
                column: "Vogelart");

            migrationBuilder.CreateIndex(
                name: "IX_VogelErfassungen_Wiederfang",
                table: "VogelErfassungen",
                column: "Wiederfang");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_VogelErfassungen_Beringungsdatum",
                table: "VogelErfassungen");

            migrationBuilder.DropIndex(
                name: "IX_VogelErfassungen_Beringungsdatum_Beringungsort_Koordinaten",
                table: "VogelErfassungen");

            migrationBuilder.DropIndex(
                name: "IX_VogelErfassungen_Beringungsdatum_Wiederfang",
                table: "VogelErfassungen");

            migrationBuilder.DropIndex(
                name: "IX_VogelErfassungen_Beringungsort_Koordinaten",
                table: "VogelErfassungen");

            migrationBuilder.DropIndex(
                name: "IX_VogelErfassungen_Ringnummer",
                table: "VogelErfassungen");

            migrationBuilder.DropIndex(
                name: "IX_VogelErfassungen_Vogelart",
                table: "VogelErfassungen");

            migrationBuilder.DropIndex(
                name: "IX_VogelErfassungen_Wiederfang",
                table: "VogelErfassungen");
        }
    }
}
