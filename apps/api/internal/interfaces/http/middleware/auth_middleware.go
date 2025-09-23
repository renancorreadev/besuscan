package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"explorer-api/internal/app/services"
)

type AuthMiddleware struct {
	authService *services.AuthService
}

func NewAuthMiddleware(authService *services.AuthService) *AuthMiddleware {
	return &AuthMiddleware{
		authService: authService,
	}
}

// RequireAuth middleware que exige autenticação
func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := m.ExtractToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Token de acesso requerido",
				"message": "Você precisa estar logado para acessar este recurso",
			})
			c.Abort()
			return
		}

		user, err := m.authService.ValidateToken(c.Request.Context(), token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Token inválido",
				"message": "Sua sessão expirou ou é inválida. Faça login novamente.",
			})
			c.Abort()
			return
		}

		// Adicionar usuário ao contexto
		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("is_admin", user.IsAdmin)

		c.Next()
	}
}

// RequireAdmin middleware que exige privilégios de administrador
func (m *AuthMiddleware) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Primeiro verificar se está autenticado
		token := m.ExtractToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Token de acesso requerido",
				"message": "Você precisa estar logado para acessar este recurso",
			})
			c.Abort()
			return
		}

		user, err := m.authService.ValidateToken(c.Request.Context(), token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Token inválido",
				"message": "Sua sessão expirou ou é inválida. Faça login novamente.",
			})
			c.Abort()
			return
		}

		// Verificar se é admin
		if !user.IsAdmin {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Acesso negado",
				"message": "Você precisa de privilégios de administrador para acessar este recurso",
			})
			c.Abort()
			return
		}

		// Adicionar usuário ao contexto
		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("is_admin", user.IsAdmin)

		c.Next()
	}
}

// OptionalAuth middleware que opcionalmente autentica (não bloqueia se não autenticado)
func (m *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := m.ExtractToken(c)
		if token != "" {
			user, err := m.authService.ValidateToken(c.Request.Context(), token)
			if err == nil {
				// Usuário autenticado válido
				c.Set("user", user)
				c.Set("user_id", user.ID)
				c.Set("is_admin", user.IsAdmin)
			}
			// Se token inválido, continua sem autenticação
		}

		c.Next()
	}
}

// ExtractToken extrai o token do header Authorization
func (m *AuthMiddleware) ExtractToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	// Verificar se começa com "Bearer "
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return ""
	}

	// Extrair token (remover "Bearer " do início)
	token := strings.TrimPrefix(authHeader, "Bearer ")
	return strings.TrimSpace(token)
}

// GetCurrentUser retorna o usuário atual do contexto
func GetCurrentUser(c *gin.Context) interface{} {
	user, exists := c.Get("user")
	if !exists {
		return nil
	}
	return user
}

// GetCurrentUserID retorna o ID do usuário atual do contexto
func GetCurrentUserID(c *gin.Context) int {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0
	}
	return userID.(int)
}

// IsAdmin verifica se o usuário atual é admin
func IsAdmin(c *gin.Context) bool {
	isAdmin, exists := c.Get("is_admin")
	if !exists {
		return false
	}
	return isAdmin.(bool)
}
