package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"balStorage/backend/config"
	"balStorage/backend/migration"
	"balStorage/backend/routes"
	"balStorage/backend/services"
	"balStorage/backend/utils"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, using system env vars")
	}

	db := config.InitDB()
	migration.AutoMigrate(db)

	discordCfg := config.InitDiscord()
	if config.DiscordEnabled() {
		log.Println("discord bot enabled")
		defer discordCfg.Session.Close()
	}

	uploadDir := utils.GetEnv("UPLOAD_DIR", "uploads")
	if err := services.EnsureUploadDir(uploadDir); err != nil {
		log.Printf("warning: failed to create upload dir: %v", err)
	}
	services.NewDeletedItemCleanupService(db, services.NewDiscordService(discordCfg)).Start(context.Background())
	services.NewThumbnailCacheCleanupService().Start(context.Background())

	e := echo.New()
	e.HideBanner = true

	// Global middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.RequestID())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{utils.GetEnv("FRONTEND_ORIGIN", "*")},
		AllowMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodPatch,
			http.MethodDelete,
			http.MethodOptions,
		},
		AllowHeaders: []string{
			echo.HeaderOrigin,
			echo.HeaderContentType,
			echo.HeaderAccept,
			echo.HeaderAuthorization,
		},
	}))

	routes.Register(e, db)

	port := utils.GetEnv("APP_PORT", "8000")
	addr := fmt.Sprintf(":%s", port)
	log.Printf("server starting on %s", addr)

	if err := e.Start(addr); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
