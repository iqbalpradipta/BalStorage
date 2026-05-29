package controllers

import (
	"net/http"
	"net/mail"
	"strings"

	"balStorage/backend/helpers"
	"balStorage/backend/model"
	"balStorage/backend/services"
	"balStorage/backend/utils"

	"github.com/labstack/echo/v4"
)

type AuthController struct {
	authService services.AuthService
}

func NewAuthController(authService services.AuthService) *AuthController {
	return &AuthController{authService: authService}
}

func (c *AuthController) Register(ctx echo.Context) error {
	var input model.RegisterInput
	if err := ctx.Bind(&input); err != nil {
		return helpers.JSON(ctx, http.StatusBadRequest, false, "invalid request body", nil)
	}

	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	input.Phone = strings.TrimSpace(input.Phone)

	if err := validateRegisterInput(input); err != nil {
		return helpers.HandleError(ctx, err)
	}

	user, err := c.authService.Register(input)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusCreated, true, "user registered successfully", user)
}

func (c *AuthController) Login(ctx echo.Context) error {
	var input model.LoginInput
	if err := ctx.Bind(&input); err != nil {
		return helpers.JSON(ctx, http.StatusBadRequest, false, "invalid request body", nil)
	}

	input.Email = strings.ToLower(strings.TrimSpace(input.Email))

	if err := validateLoginInput(input); err != nil {
		return helpers.HandleError(ctx, err)
	}

	user, token, err := c.authService.Login(input)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusOK, true, "login successful", echo.Map{
		"user":  user,
		"token": token,
	})
}

func (c *AuthController) Profile(ctx echo.Context) error {
	userID := ctx.Get("user_id").(string)

	user, err := c.authService.GetProfile(userID)
	if err != nil {
		return helpers.HandleError(ctx, err)
	}

	return helpers.JSON(ctx, http.StatusOK, true, "profile fetched", user)
}

func validateRegisterInput(input model.RegisterInput) error {
	if len(input.Name) < 2 || len(input.Name) > 80 {
		return utils.ErrInvalidName
	}
	if !isValidEmail(input.Email) {
		return utils.ErrInvalidEmail
	}
	if len(input.Password) < 8 || len(input.Password) > 72 {
		return utils.ErrInvalidPassword
	}
	if len(input.Phone) > 32 {
		return utils.ErrInvalidPhone
	}
	return nil
}

func validateLoginInput(input model.LoginInput) error {
	if !isValidEmail(input.Email) || input.Password == "" {
		return utils.ErrInvalidCredentials
	}
	return nil
}

func isValidEmail(email string) bool {
	if len(email) > 254 || strings.Count(email, "@") != 1 {
		return false
	}
	address, err := mail.ParseAddress(email)
	return err == nil && address.Address == email
}
