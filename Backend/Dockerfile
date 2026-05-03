# 1. Build Stage: Use the .NET SDK to compile the code
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy the project file and restore any dependencies (NuGet packages)
COPY *.csproj ./
RUN dotnet restore

# Copy the rest of the backend code and publish it in Release mode
COPY . ./
RUN dotnet publish -c Release -o out

# 2. Runtime Stage: Use a smaller image to run the compiled app
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Copy the compiled files from the build stage
COPY --from=build /app/out .

# Tell the cloud which port to listen on (Render defaults to 80 or 10000)
EXPOSE 80
ENV ASPNETCORE_URLS=http://+:80

# Start the application
# IMPORTANT: Replace 'FilipinoScholarArchive.dll' with your actual project DLL name
ENTRYPOINT ["dotnet", "Backend.dll"]