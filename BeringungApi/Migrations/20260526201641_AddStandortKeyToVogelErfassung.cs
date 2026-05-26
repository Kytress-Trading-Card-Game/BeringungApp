using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BeringungApi.Migrations
{
    /// <inheritdoc />
    public partial class AddStandortKeyToVogelErfassung : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StandortKey",
                table: "VogelErfassungen",
                type: "TEXT",
                maxLength: 36,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_VogelErfassungen_StandortKey",
                table: "VogelErfassungen",
                column: "StandortKey");

            migrationBuilder.CreateIndex(
                name: "IX_VogelErfassungen_StandortKey_Beringungsdatum",
                table: "VogelErfassungen",
                columns: new[] { "StandortKey", "Beringungsdatum" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_VogelErfassungen_StandortKey",
                table: "VogelErfassungen");

            migrationBuilder.DropIndex(
                name: "IX_VogelErfassungen_StandortKey_Beringungsdatum",
                table: "VogelErfassungen");

            migrationBuilder.DropColumn(
                name: "StandortKey",
                table: "VogelErfassungen");
        }
    }
}
