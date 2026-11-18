FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["UptimeStudentApp.csproj", "./"]
RUN dotnet restore "UptimeStudentApp.csproj"

COPY . .
RUN dotnet publish "UptimeStudentApp.csproj" \
    --configuration Release \
    --output /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 10000
ENTRYPOINT ["dotnet", "UptimeStudentApp.dll"]
