package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type File struct {
	ID                    string         `json:"id" gorm:"type:uuid;primaryKey"`
	FolderID              string         `json:"folder_id" gorm:"type:uuid;not null;index"`
	UserID                string         `json:"user_id" gorm:"type:uuid;not null;index"`
	OriginalName          string         `json:"original_name" gorm:"not null"`
	StoredName            string         `json:"stored_name" gorm:"not null"`
	MimeType              string         `json:"mime_type"`
	Size                  int64          `json:"size"`
	DiscordMessageID      string         `json:"discord_message_id" gorm:"type:varchar(64)"`
	DiscordAttachmentURL  string         `json:"discord_attachment_url" gorm:"type:text"`
	CreatedAt             time.Time      `json:"created_at"`
	UpdatedAt             time.Time      `json:"updated_at"`
	DeletedAt             gorm.DeletedAt `json:"-" gorm:"index"`
}

func (f *File) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.New().String()
	}
	return nil
}
