package migration

import (
	"log"

	"balStorage/backend/model"

	"gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) {
	log.Println("running auto migration...")

	if err := db.AutoMigrate(
		&model.User{},
		&model.Folder{},
		&model.File{},
	); err != nil {
		log.Fatalf("auto migration failed: %v", err)
	}

	log.Println("auto migration completed")
}
