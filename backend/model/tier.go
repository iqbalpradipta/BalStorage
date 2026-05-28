package model

const (
	TierStandard = "standard"
	TierPremium  = "premium"
	TierPro      = "pro"
)

type TierInfo struct {
	Name  string `json:"name"`
	Label string `json:"label"`
	Limit int64  `json:"limit"` // bytes, 0 = unlimited
}

var Tiers = map[string]TierInfo{
	TierStandard: {Name: TierStandard, Label: "Standard Plan", Limit: 1 * 1024 * 1024 * 1024},     // 1 GB
	TierPremium:  {Name: TierPremium, Label: "Premium Plan", Limit: 50 * 1024 * 1024 * 1024},       // 50 GB
	TierPro:      {Name: TierPro, Label: "Pro Plan", Limit: 0},                                      // Unlimited
}

func GetTierLimit(tier string) int64 {
	if info, ok := Tiers[tier]; ok {
		return info.Limit
	}
	return Tiers[TierStandard].Limit
}

func IsUnlimited(tier string) bool {
	return tier == TierPro
}
