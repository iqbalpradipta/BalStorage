package controllers

import (
	"net/http"

	"balStorage/backend/helpers"
	"balStorage/backend/model"
	"balStorage/backend/services"

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

	if input.Email == "" || input.Password == "" || input.Name == "" {
		return helpers.JSON(ctx, http.StatusBadRequest, false, "name, email, and password are required", nil)
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

	if input.Email == "" || input.Password == "" {
		return helpers.JSON(ctx, http.StatusBadRequest, false, "email and password are required", nil)
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
