using System.Collections.Generic;

namespace BeringungApi.Models
{
	public enum VogelAlter
	{
		Unbekannt = 0,
		Dj = 1,
		Ndj = 2
	}

	public enum VogelGeschlecht
	{
		Unbekannt = 0,
		Männlich = 1,
		Weiblich = 2,
		Unbestimmt = 3
	}

	public static class VogelErfassungLookups
	{
		public static readonly IReadOnlyDictionary<VogelAlter, string> AlterLabels =
			new Dictionary<VogelAlter, string>
			{
				[VogelAlter.Unbekannt] = "Unbekannt",
				[VogelAlter.Dj] = "Diesjährig",
				[VogelAlter.Ndj] = "Nicht diesjährig"
			};

		public static readonly IReadOnlyDictionary<VogelGeschlecht, string> GeschlechtLabels =
			new Dictionary<VogelGeschlecht, string>
			{
				[VogelGeschlecht.Unbekannt] = "Unbekannt",
				[VogelGeschlecht.Männlich] = "Männlich",
				[VogelGeschlecht.Weiblich] = "Weiblich",
				[VogelGeschlecht.Unbestimmt] = "Unbestimmt"
			};
	}
}
