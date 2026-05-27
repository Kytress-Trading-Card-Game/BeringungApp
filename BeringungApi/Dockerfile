# =========================
# Build stage
# =========================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj first for better layer caching
COPY BeringungApi.csproj ./
RUN dotnet restore --disable-parallel

# Copy everything else and publish
COPY . ./
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# =========================
# Runtime stage
# =========================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Container runtime settings
ENV ASPNETCORE_URLS=http://+:80
ENV ASPNETCORE_ENVIRONMENT=Production

# Create non-root user (best practice)
RUN useradd -r -u 1001 appuser || adduser --system --uid 1001 appuser
USER 1001

# Copy published output
COPY --from=build /app/publish ./

# Default port for Kestrel
EXPOSE 80

# Start the app
ENTRYPOINT ["dotnet", "BeringungApi.dll"]

