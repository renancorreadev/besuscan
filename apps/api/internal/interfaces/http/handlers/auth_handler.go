package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"explorer-api/internal/app/services"
	"explorer-api/internal/domain/entities"
	"explorer-api/internal/interfaces/http/middleware"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Login autentica um usuário
// @Summary Login de usuário
// @Description Autentica um usuário e retorna um token JWT
// @Tags auth
// @Accept json
// @Produce json
// @Param login body entities.LoginRequest true "Credenciais de login"
// @Success 200 {object} entities.LoginResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req entities.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Dados inválidos",
			"message": "Username e senha são obrigatórios",
		})
		return
	}

	response, err := h.authService.Login(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Falha na autenticação",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
		"message": "Login realizado com sucesso",
	})
}

// Register cria um novo usuário
// @Summary Registro de usuário
// @Description Cria um novo usuário no sistema
// @Tags auth
// @Accept json
// @Produce json
// @Param register body entities.RegisterRequest true "Dados de registro"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Router /api/auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req entities.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Dados inválidos",
			"message": "Todos os campos são obrigatórios e devem ser válidos",
		})
		return
	}

	user, err := h.authService.Register(c.Request.Context(), &req)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "username já existe" || err.Error() == "email já existe" {
			status = http.StatusConflict
		}

		c.JSON(status, gin.H{
			"error":   "Falha no registro",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    user,
		"message": "Usuário criado com sucesso",
	})
}

// Logout invalida o token do usuário
// @Summary Logout de usuário
// @Description Invalida o token JWT do usuário
// @Tags auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	authMiddleware := middleware.NewAuthMiddleware(h.authService)
	token := authMiddleware.ExtractToken(c)
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Token não fornecido",
			"message": "Token de autenticação é obrigatório",
		})
		return
	}

	err := h.authService.Logout(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro no logout",
			"message": "Erro interno do servidor",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logout realizado com sucesso",
	})
}

// Me retorna informações do usuário atual
// @Summary Informações do usuário atual
// @Description Retorna as informações do usuário autenticado
// @Tags auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /api/auth/me [get]
func (h *AuthHandler) Me(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Não autenticado",
			"message": "Usuário não encontrado no contexto",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
		"message": "Informações do usuário",
	})
}

// ChangePassword altera a senha do usuário
// @Summary Alterar senha
// @Description Altera a senha do usuário autenticado
// @Tags auth
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param changePassword body entities.ChangePasswordRequest true "Dados para alteração de senha"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/auth/change-password [post]
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Não autenticado",
			"message": "Usuário não encontrado no contexto",
		})
		return
	}

	var req entities.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Dados inválidos",
			"message": "Senha atual e nova senha são obrigatórias",
		})
		return
	}

	err := h.authService.ChangePassword(c.Request.Context(), userID, &req)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "usuário não encontrado" {
			status = http.StatusUnauthorized
		}

		c.JSON(status, gin.H{
			"error":   "Falha ao alterar senha",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Senha alterada com sucesso",
	})
}

// RefreshToken renova o token do usuário
// @Summary Renovar token
// @Description Renova o token JWT do usuário autenticado
// @Tags auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /api/auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "Não autenticado",
			"message": "Usuário não encontrado no contexto",
		})
		return
	}

	// Fazer logout do token atual
	authMiddleware := middleware.NewAuthMiddleware(h.authService)
	token := authMiddleware.ExtractToken(c)
	if token != "" {
		h.authService.Logout(c.Request.Context(), token)
	}

	// Gerar novo token
	userEntity := user.(*entities.User)
	loginReq := &entities.LoginRequest{
		Username: userEntity.Username,
		Password: "", // Não precisamos da senha aqui, já estamos autenticados
	}

	// Para refresh, vamos simular um login sem verificar senha
	// (isso é seguro porque já validamos o token anterior)
	response, err := h.authService.Login(c.Request.Context(), loginReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Erro ao renovar token",
			"message": "Erro interno do servidor",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
		"message": "Token renovado com sucesso",
	})
}
