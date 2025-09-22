package main

import (
	"os"

	"github.com/hubweb3/besucli/internal/app"
	"github.com/hubweb3/besucli/pkg/logger"
)

func main() {
	// Initialize logger
	log := logger.New()

	// Create and execute application
	app := app.New(log)
	if err := app.Execute(); err != nil {
		log.Fatal("Failed to execute command", "error", err)
		os.Exit(1)
	}
}
