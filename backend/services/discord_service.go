package services

import (
	"fmt"
	"io"
	"log"
	"os"

	"balStorage/backend/config"

	"github.com/bwmarrin/discordgo"
)

type DiscordService interface {
	CreateChannel(name string) (string, error)
	DeleteChannel(channelID string) error
	RenameChannel(channelID, newName string) error
	SendFile(channelID, folderLabel, filename, filepath string) (messageID string, attachmentURL string, err error)
	DeleteMessage(channelID, messageID string) error
	GetMessageAttachment(channelID, messageID string) (string, error)
}

type discordService struct {
	cfg *config.DiscordConfig
}

func NewDiscordService(cfg *config.DiscordConfig) DiscordService {
	return &discordService{cfg: cfg}
}

func (s *discordService) CreateChannel(name string) (string, error) {
	if err := s.cfg.Validate(); err != nil {
		return "", err
	}

	channel, err := s.cfg.Session.GuildChannelCreateComplex(
		s.cfg.GuildID,
		discordgo.GuildChannelCreateData{
			Name:     name,
			Type:     discordgo.ChannelTypeGuildText,
			ParentID: s.cfg.CategoryID,
		},
	)
	if err != nil {
		return "", fmt.Errorf("failed to create discord channel: %w", err)
	}

	log.Printf("discord channel created: %s (%s)", channel.Name, channel.ID)
	return channel.ID, nil
}

func (s *discordService) DeleteChannel(channelID string) error {
	if err := s.cfg.Validate(); err != nil {
		return err
	}

	_, err := s.cfg.Session.ChannelDelete(channelID)
	if err != nil {
		return fmt.Errorf("failed to delete discord channel: %w", err)
	}

	log.Printf("discord channel deleted: %s", channelID)
	return nil
}

func (s *discordService) RenameChannel(channelID, newName string) error {
	if err := s.cfg.Validate(); err != nil {
		return err
	}

	_, err := s.cfg.Session.ChannelEdit(channelID, &discordgo.ChannelEdit{
		Name: newName,
	})
	if err != nil {
		return fmt.Errorf("failed to rename discord channel: %w", err)
	}

	log.Printf("discord channel renamed: %s -> %s", channelID, newName)
	return nil
}

func (s *discordService) SendFile(channelID, folderLabel, filename, filepath string) (string, string, error) {
	if err := s.cfg.Validate(); err != nil {
		return "", "", err
	}

	file, err := os.Open(filepath)
	if err != nil {
		return "", "", fmt.Errorf("failed to open file for upload: %w", err)
	}
	defer file.Close()

	reader := io.NewSectionReader(file, 0, fileSize(file))

	msg, err := s.cfg.Session.ChannelMessageSendComplex(channelID, &discordgo.MessageSend{
		Content: fmt.Sprintf("[%s] %s", folderLabel, filename),
		Files: []*discordgo.File{
			{
				Name:   filename,
				Reader: reader,
			},
		},
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to send file to discord: %w", err)
	}

	if len(msg.Attachments) == 0 {
		return "", "", fmt.Errorf("discord message sent but no attachment found")
	}

	attachmentURL := msg.Attachments[0].URL
	log.Printf("file uploaded to discord: %s (message: %s, channel: %s)", filename, msg.ID, channelID)
	return msg.ID, attachmentURL, nil
}

func (s *discordService) DeleteMessage(channelID, messageID string) error {
	if err := s.cfg.Validate(); err != nil {
		return err
	}

	err := s.cfg.Session.ChannelMessageDelete(channelID, messageID)
	if err != nil {
		return fmt.Errorf("failed to delete discord message: %w", err)
	}

	log.Printf("discord message deleted: %s from channel %s", messageID, channelID)
	return nil
}

func (s *discordService) GetMessageAttachment(channelID, messageID string) (string, error) {
	if err := s.cfg.Validate(); err != nil {
		return "", err
	}

	msg, err := s.cfg.Session.ChannelMessage(channelID, messageID)
	if err != nil {
		return "", fmt.Errorf("failed to get discord message: %w", err)
	}

	if len(msg.Attachments) == 0 {
		return "", fmt.Errorf("no attachment found in message")
	}

	return msg.Attachments[0].URL, nil
}

func fileSize(file *os.File) int64 {
	stat, err := file.Stat()
	if err != nil {
		return 0
	}
	return stat.Size()
}

// Ensure TempDir exists for file uploads
func EnsureUploadDir(uploadDir string) error {
	return os.MkdirAll(uploadDir, 0755)
}

func CleanupTempFile(filepath string) {
	if err := os.Remove(filepath); err != nil {
		log.Printf("failed to cleanup temp file %s: %v", filepath, err)
	}
}
