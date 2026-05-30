package model

import "time"

type AppSetting struct {
	Key       string    `json:"key" gorm:"primaryKey;type:varchar(100)"`
	Value     string    `json:"value" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
