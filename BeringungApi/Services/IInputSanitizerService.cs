using System.Collections.Generic;
using BeringungApi.Dtos;

namespace BeringungApi.Services
{
	public interface IInputSanitizerService
	{
		IReadOnlyList<string> ValidateVogelErfassungCreate(VogelErfassungCreateDto dto);
	}
}
