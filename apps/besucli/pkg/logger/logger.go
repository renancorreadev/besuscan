package logger

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/fatih/color"
	"github.com/sirupsen/logrus"
)

type Logger struct {
	*logrus.Logger
}

// New cria uma nova instância do logger profissional
func New() *Logger {
	log := logrus.New()

	// Configurar formatter customizado com cores profissionais
	log.SetFormatter(&ProfessionalFormatter{})
	log.SetOutput(os.Stdout)

	// Definir nível baseado na variável de ambiente
	level := strings.ToLower(os.Getenv("LOG_LEVEL"))
	switch level {
	case "debug":
		log.SetLevel(logrus.DebugLevel)
	case "warn":
		log.SetLevel(logrus.WarnLevel)
	case "error":
		log.SetLevel(logrus.ErrorLevel)
	default:
		log.SetLevel(logrus.InfoLevel)
	}

	return &Logger{Logger: log}
}

// ProfessionalFormatter formata logs com cores e estilo profissional
type ProfessionalFormatter struct{}

func (f *ProfessionalFormatter) Format(entry *logrus.Entry) ([]byte, error) {
	var prefix string

	switch entry.Level {
	case logrus.DebugLevel:
		prefix = color.HiBlackString("[DEBUG]")
	case logrus.InfoLevel:
		prefix = color.HiBlueString("[INFO] ")
	case logrus.WarnLevel:
		prefix = color.HiYellowString("[WARN] ")
	case logrus.ErrorLevel:
		prefix = color.HiRedString("[ERROR]")
	case logrus.FatalLevel:
		prefix = color.RedString("[FATAL]")
	default:
		prefix = color.WhiteString("[LOG]  ")
	}

	// Timestamp
	timestamp := color.HiBlackString(entry.Time.Format("15:04:05"))

	// Aplicar cor baseada no nível
	var coloredMessage string
	switch entry.Level {
	case logrus.DebugLevel:
		coloredMessage = color.HiBlackString(entry.Message)
	case logrus.InfoLevel:
		coloredMessage = color.WhiteString(entry.Message)
	case logrus.WarnLevel:
		coloredMessage = color.YellowString(entry.Message)
	case logrus.ErrorLevel:
		coloredMessage = color.RedString(entry.Message)
	case logrus.FatalLevel:
		coloredMessage = color.HiRedString(entry.Message)
	default:
		coloredMessage = entry.Message
	}

	// Adicionar campos extras se existirem com formatação melhorada
	fields := ""
	if len(entry.Data) > 0 {
		for key, value := range entry.Data {
			fields += " " + color.HiGreenString(key) + color.HiBlackString("=") + color.HiCyanString("%v", value)
		}
	}

	return []byte(fmt.Sprintf("%s %s %s%s\n", timestamp, prefix, coloredMessage, fields)), nil
}

// Success exibe mensagem de sucesso com estilo profissional
func (l *Logger) Success(msg string, fields ...interface{}) {
	prefix := color.HiGreenString("[SUCCESS]")
	message := color.GreenString(msg)
	timestamp := color.HiBlackString(time.Now().Format("15:04:05"))

	if len(fields) > 0 {
		fieldsStr := ""
		parsedFields := parseFields(fields...)
		for key, value := range parsedFields {
			fieldsStr += " " + color.HiGreenString(key) + color.HiBlackString("=") + color.HiCyanString("%v", value)
		}
		fmt.Printf("%s %s %s%s\n", timestamp, prefix, message, fieldsStr)
	} else {
		fmt.Printf("%s %s %s\n", timestamp, prefix, message)
	}
}

// Progress exibe mensagem de progresso
func (l *Logger) Progress(msg string, fields ...interface{}) {
	prefix := color.HiMagentaString("[PROGRESS]")
	message := color.MagentaString(msg)
	timestamp := color.HiBlackString(time.Now().Format("15:04:05"))

	if len(fields) > 0 {
		fieldsStr := ""
		parsedFields := parseFields(fields...)
		for key, value := range parsedFields {
			fieldsStr += " " + color.HiGreenString(key) + color.HiBlackString("=") + color.HiCyanString("%v", value)
		}
		fmt.Printf("%s %s %s%s\n", timestamp, prefix, message, fieldsStr)
	} else {
		fmt.Printf("%s %s %s\n", timestamp, prefix, message)
	}
}

// Warning exibe mensagem de aviso
func (l *Logger) Warning(msg string, fields ...interface{}) {
	if len(fields) > 0 {
		l.WithFields(parseFields(fields...)).Warn(msg)
	} else {
		l.Warn(msg)
	}
}

// Banner exibe banner profissional
func (l *Logger) Banner(title string) {
	banner := color.HiCyanString(`
┌──────────────────────────────────────────────────────────────────────────────┐
│  🚀 %-70s │
└──────────────────────────────────────────────────────────────────────────────┘`, title)
	fmt.Println(banner)
}

// Section exibe seção com separador
func (l *Logger) Section(title string) {
	separator := color.HiBlackString("─────────────────────────────────────────────────────────────────────────────")
	titleColored := color.HiCyanString("▶ %s", title)
	fmt.Printf("%s\n%s\n", separator, titleColored)
}

// Print exibe mensagem simples sem prefixo
func (l *Logger) Print(msg string) {
	fmt.Println(msg)
}

// PrintColored exibe mensagem colorida sem prefixo
func (l *Logger) PrintColored(msg string, colorFunc func(string) string) {
	fmt.Println(colorFunc(msg))
}

// parseFields converte slice de interfaces em logrus.Fields
func parseFields(fields ...interface{}) logrus.Fields {
	result := make(logrus.Fields)
	for i := 0; i < len(fields)-1; i += 2 {
		if key, ok := fields[i].(string); ok {
			result[key] = fields[i+1]
		}
	}
	return result
}
