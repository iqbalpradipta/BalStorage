package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Folder struct {
	ID               string         `json:"id" gorm:"type:uuid;primaryKey"`
	UserID           string         `json:"user_id" gorm:"type:uuid;not null;index"`
	ParentID         *string        `json:"parent_id" gorm:"type:uuid;index"`
	Name             string         `json:"name" gorm:"not null"`
	DiscordChannelID string         `json:"discord_channel_id" gorm:"type:varchar(64);uniqueIndex"`
	FileCount        int64          `json:"file_count" gorm:"-"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `json:"-" gorm:"index"`
}

func (f *Folder) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.New().String()
	}
	return nil
}

type CreateFolderInput struct {
	Name     string  `json:"name"`
	ParentID *string `json:"parent_id"`
}

type UpdateFolderInput struct {
	Name string `json:"name"`
}
