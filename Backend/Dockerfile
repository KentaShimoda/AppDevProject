# STAGE 1: Build using .NET 10 SDK
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy project files and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy all files and publish for .NET 10
COPY . ./
RUN dotnet publish -c Release -o out

# STAGE 2: Run using .NET 10 ASP.NET Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/out .

# Cloud Port Protocol
EXPOSE 80
ENV ASPNETCORE_URLS=http://+:80

# Replace 'YourProjectName' with the name of your .csproj file
ENTRYPOINT ["dotnet", "Backend.dll"]