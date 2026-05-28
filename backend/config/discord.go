package config

import (
	"fmt"
	"log"

	"balStorage/backend/utils"

	"github.com/bwmarrin/discordgo"
)

type DiscordConfig struct {
	Session    *discordgo.Session
	GuildID    string
	CategoryID string
}

var Discord *DiscordConfig

func InitDiscord() *DiscordConfig {
	token := utils.GetEnv("DISCORD_BOT_TOKEN", "")
	if token == "" {
		log.Println("DISCORD_BOT_TOKEN not set, discord features disabled")
		return &DiscordConfig{}
	}

	session, err := discordgo.New("Bot " + token)
	if err != nil {
		log.Printf("failed to create discord session: %v", err)
		return &DiscordConfig{}
	}

	session.Identify.Intents = discordgo.IntentsGuildMessages | discordgo.IntentsGuilds

	if err := session.Open(); err != nil {
		log.Printf("failed to open discord connection: %v", err)
		return &DiscordConfig{}
	}

	guildID := utils.GetEnv("DISCORD_GUILD_ID", "")
	categoryID := utils.GetEnv("DISCORD_STORAGE_CATEGORY_ID", "")

	if guildID != "" {
		_, err := session.Guild(guildID)
		if err != nil {
			log.Printf("warning: cannot access guild %s: %v", guildID, err)
		}
	}

	if guildID != "" && categoryID != "" {
		channels, err := session.GuildChannels(guildID)
		if err == nil {
			found := false
			for _, ch := range channels {
				if ch.ID == categoryID && ch.Type == discordgo.ChannelTypeGuildCategory {
					found = true
					break
				}
			}
			if !found {
				log.Printf("warning: category %s not found in guild %s", categoryID, guildID)
			}
		}
	}

	cfg := &DiscordConfig{
		Session:    session,
		GuildID:    guildID,
		CategoryID: categoryID,
	}
	Discord = cfg

	log.Printf("discord bot connected as %s", session.State.User.Username)
	return cfg
}

func DiscordEnabled() bool {
	return Discord != nil && Discord.Session != nil
}

func (d *DiscordConfig) Validate() error {
	if d.Session == nil {
		return fmt.Errorf("discord bot not connected")
	}
	if d.GuildID == "" {
		return fmt.Errorf("DISCORD_GUILD_ID not configured")
	}
	if d.CategoryID == "" {
		return fmt.Errorf("DISCORD_STORAGE_CATEGORY_ID not configured")
	}
	return nil
}
