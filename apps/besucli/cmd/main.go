package main

import (
	"os"

	"github.com/hubweb3/besucli/internal/app"
	"github.com/hubweb3/besucli/internal/commands"
	"github.com/hubweb3/besucli/pkg/logger"
)

var (
	Version    = "2.0.0"
	BuildTime  = "development"
	CommitHash = "dev"
)

func main() {
	// Set version information in commands package
	commands.SetVersionInfo(Version, BuildTime, CommitHash)

	// Initialize logger
	log := logger.New()

	// Create and execute application
	app := app.New(log)
	if err := app.Execute(); err != nil {
		log.Fatal("Failed to execute command", "error", err)
		os.Exit(1)
	}
}
