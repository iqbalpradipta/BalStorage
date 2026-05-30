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
		&model.AppSetting{},
		&model.Folder{},
		&model.File{},
	); err != nil {
		log.Fatalf("auto migration failed: %v", err)
	}

	if err := db.Model(&model.Folder{}).
		Where("discord_channel_id = ?", "").
		Update("discord_channel_id", nil).Error; err != nil {
		log.Fatalf("folder channel cleanup failed: %v", err)
	}

	log.Println("auto migration completed")
}
