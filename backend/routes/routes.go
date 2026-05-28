package routes

import (
	"balStorage/backend/config"
	"balStorage/backend/controllers"
	"balStorage/backend/middlewares"
	"balStorage/backend/repository"
	"balStorage/backend/services"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func Register(e *echo.Echo, db *gorm.DB) {
	api := e.Group("/api/v1")

	// Health
	healthController := controllers.NewHealthController(db)
	api.GET("/health", healthController.Check)

	// Auth
	userRepo := repository.NewUserRepository(db)
	authService := services.NewAuthService(userRepo)
	authController := controllers.NewAuthController(authService)

	api.POST("/register", authController.Register)
	api.POST("/login", authController.Login)

	// Shared dependencies
	discordSvc := services.NewDiscordService(config.Discord)

	// Folder
	folderRepo := repository.NewFolderRepository(db)
	fileRepo := repository.NewFileRepository(db)
	folderService := services.NewFolderService(folderRepo, fileRepo, discordSvc)
	folderController := controllers.NewFolderController(folderService)

	// Protected routes
	protected := api.Group("")
	protected.Use(middlewares.JWTAuth)

	protected.GET("/profile", authController.Profile)

	protected.GET("/folders", folderController.List)
	protected.POST("/folders", folderController.Create)
	protected.GET("/folders/:id", folderController.GetByID)
	protected.PUT("/folders/:id", folderController.Update)
	protected.DELETE("/folders/:id", folderController.Delete)

	// File
	storageSvc := services.NewStorageService(userRepo, folderRepo, fileRepo)
	fileService := services.NewFileService(fileRepo, folderRepo, folderService, discordSvc, storageSvc)
	fileController := controllers.NewFileController(fileService)

	protected.GET("/folders/:id/files", fileController.ListByFolder)
	protected.POST("/folders/:id/files", fileController.Upload)
	protected.GET("/files/:id", fileController.GetByID)
	protected.DELETE("/files/:id", fileController.Delete)

	// Storage
	storageController := controllers.NewStorageController(storageSvc)
	protected.GET("/stats", storageController.GetStats)

	// Admin
	adminService := services.NewAdminService(userRepo)
	adminController := controllers.NewAdminController(adminService)

	admin := protected.Group("/admin")
	admin.Use(middlewares.AdminOnly)
	admin.GET("/users", adminController.ListUsers)
	admin.PUT("/users/:id/tier", adminController.UpdateTier)
}
