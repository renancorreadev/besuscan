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
	spinnerActive bool
	spinnerDone   chan bool
}

// New cria uma nova instância do logger ultra-moderno
func New() *Logger {
	log := logrus.New()

	// Configurar formatter customizado com cores ultra-modernas
	log.SetFormatter(&ModernFormatter{})
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

	return &Logger{
		Logger:      log,
		spinnerDone: make(chan bool),
	}
}

// ModernFormatter formata logs com estilo ultra-moderno e animado
type ModernFormatter struct{}

func (f *ModernFormatter) Format(entry *logrus.Entry) ([]byte, error) {
	var prefix, icon string

	switch entry.Level {
	case logrus.DebugLevel:
		icon = "🔍"
		prefix = color.HiBlackString("[DEBUG]")
	case logrus.InfoLevel:
		icon = "ℹ️ "
		prefix = color.HiBlueString("[INFO] ")
	case logrus.WarnLevel:
		icon = "⚠️ "
		prefix = color.HiYellowString("[WARN] ")
	case logrus.ErrorLevel:
		icon = "❌"
		prefix = color.HiRedString("[ERROR]")
	case logrus.FatalLevel:
		icon = "💀"
		prefix = color.RedString("[FATAL]")
	default:
		icon = "📝"
		prefix = color.WhiteString("[LOG]  ")
	}

	// Timestamp com estilo moderno
	timestamp := color.New(color.FgHiBlack, color.Bold).Sprintf("⏰ %s", entry.Time.Format("15:04:05"))

	// Aplicar cor baseada no nível com gradiente visual
	var coloredMessage string
	switch entry.Level {
	case logrus.DebugLevel:
		coloredMessage = color.New(color.FgHiBlack).Sprint(entry.Message)
	case logrus.InfoLevel:
		coloredMessage = color.New(color.FgHiWhite, color.Bold).Sprint(entry.Message)
	case logrus.WarnLevel:
		coloredMessage = color.New(color.FgYellow, color.Bold).Sprint(entry.Message)
	case logrus.ErrorLevel:
		coloredMessage = color.New(color.FgRed, color.Bold).Sprint(entry.Message)
	case logrus.FatalLevel:
		coloredMessage = color.New(color.FgHiRed, color.Bold, color.Underline).Sprint(entry.Message)
	default:
		coloredMessage = entry.Message
	}

	// Adicionar campos extras com formatação ultra-moderna
	fields := ""
	if len(entry.Data) > 0 {
		for key, value := range entry.Data {
			fields += " " + color.New(color.FgHiGreen, color.Bold).Sprint("▶ "+key) +
				color.New(color.FgHiBlack).Sprint("=") +
				color.New(color.FgHiCyan, color.Italic).Sprintf("'%v'", value)
		}
	}

	return []byte(fmt.Sprintf("%s %s %s %s%s\n", timestamp, icon, prefix, coloredMessage, fields)), nil
}

// Success exibe mensagem de sucesso com animação
func (l *Logger) Success(msg string, fields ...interface{}) {
	icon := "✅"
	prefix := color.New(color.FgHiGreen, color.Bold).Sprint("[SUCCESS]")
	message := color.New(color.FgGreen, color.Bold).Sprint(msg)
	timestamp := color.New(color.FgHiBlack, color.Bold).Sprintf("⏰ %s", time.Now().Format("15:04:05"))

	// Animação de sucesso
	fmt.Print("\r")
	for i := 0; i < 3; i++ {
		fmt.Printf("🎉 ")
		time.Sleep(100 * time.Millisecond)
	}
	fmt.Print("\r")

	if len(fields) > 0 {
		fieldsStr := ""
		parsedFields := parseFields(fields...)
		for key, value := range parsedFields {
			fieldsStr += " " + color.New(color.FgHiGreen, color.Bold).Sprint("▶ "+key) +
				color.New(color.FgHiBlack).Sprint("=") +
				color.New(color.FgHiCyan, color.Italic).Sprintf("'%v'", value)
		}
		fmt.Printf("%s %s %s %s%s\n", timestamp, icon, prefix, message, fieldsStr)
	} else {
		fmt.Printf("%s %s %s %s\n", timestamp, icon, prefix, message)
	}
}

// Progress exibe mensagem de progresso com barra animada
func (l *Logger) Progress(msg string, fields ...interface{}) {
	icon := "🚀"
	prefix := color.New(color.FgHiMagenta, color.Bold).Sprint("[PROGRESS]")
	message := color.New(color.FgMagenta, color.Bold).Sprint(msg)
	timestamp := color.New(color.FgHiBlack, color.Bold).Sprintf("⏰ %s", time.Now().Format("15:04:05"))

	if len(fields) > 0 {
		fieldsStr := ""
		parsedFields := parseFields(fields...)
		for key, value := range parsedFields {
			fieldsStr += " " + color.New(color.FgHiGreen, color.Bold).Sprint("▶ "+key) +
				color.New(color.FgHiBlack).Sprint("=") +
				color.New(color.FgHiCyan, color.Italic).Sprintf("'%v'", value)
		}
		fmt.Printf("%s %s %s %s%s\n", timestamp, icon, prefix, message, fieldsStr)
	} else {
		fmt.Printf("%s %s %s %s\n", timestamp, icon, prefix, message)
	}
}

// StartSpinner inicia um spinner animado
func (l *Logger) StartSpinner(msg string) {
	if l.spinnerActive {
		return
	}

	l.spinnerActive = true
	spinnerChars := []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}

	go func() {
		i := 0
		for {
			select {
			case <-l.spinnerDone:
				fmt.Print("\r")
				return
			default:
				fmt.Printf("\r%s %s %s",
					color.New(color.FgHiCyan, color.Bold).Sprint(spinnerChars[i%len(spinnerChars)]),
					color.New(color.FgHiBlue, color.Bold).Sprint("[LOADING]"),
					color.New(color.FgWhite).Sprint(msg))
				time.Sleep(100 * time.Millisecond)
				i++
			}
		}
	}()
}

// StopSpinner para o spinner
func (l *Logger) StopSpinner() {
	if !l.spinnerActive {
		return
	}

	l.spinnerActive = false
	l.spinnerDone <- true
	fmt.Print("\r" + strings.Repeat(" ", 80) + "\r") // Limpa a linha
}

// ProgressBar exibe uma barra de progresso animada
func (l *Logger) ProgressBar(msg string, current, total int) {
	if total == 0 {
		return
	}

	percentage := float64(current) / float64(total) * 100
	barWidth := 40
	filled := int(float64(barWidth) * float64(current) / float64(total))

	bar := ""
	for i := 0; i < barWidth; i++ {
		if i < filled {
			bar += color.New(color.FgHiGreen, color.Bold).Sprint("█")
		} else {
			bar += color.New(color.FgHiBlack).Sprint("░")
		}
	}

	fmt.Printf("\r🎯 %s [%s] %.1f%% (%d/%d)",
		color.New(color.FgHiWhite, color.Bold).Sprint(msg),
		bar,
		percentage,
		current,
		total)

	if current == total {
		fmt.Println() // Nova linha quando completo
	}
}

// Warning exibe mensagem de aviso com estilo moderno
func (l *Logger) Warning(msg string, fields ...interface{}) {
	icon := "⚠️ "
	prefix := color.New(color.FgHiYellow, color.Bold).Sprint("[WARNING]")
	message := color.New(color.FgYellow, color.Bold).Sprint(msg)
	timestamp := color.New(color.FgHiBlack, color.Bold).Sprintf("⏰ %s", time.Now().Format("15:04:05"))

	if len(fields) > 0 {
		fieldsStr := ""
		parsedFields := parseFields(fields...)
		for key, value := range parsedFields {
			fieldsStr += " " + color.New(color.FgHiGreen, color.Bold).Sprint("▶ "+key) +
				color.New(color.FgHiBlack).Sprint("=") +
				color.New(color.FgHiCyan, color.Italic).Sprintf("'%v'", value)
		}
		fmt.Printf("%s %s %s %s%s\n", timestamp, icon, prefix, message, fieldsStr)
	} else {
		fmt.Printf("%s %s %s %s\n", timestamp, icon, prefix, message)
	}
}

// Error exibe mensagem de erro com estilo dramático
func (l *Logger) Error(msg string, fields ...interface{}) {
	icon := "💥"
	prefix := color.New(color.FgHiRed, color.Bold, color.Underline).Sprint("[ERROR]")
	message := color.New(color.FgRed, color.Bold).Sprint(msg)
	timestamp := color.New(color.FgHiBlack, color.Bold).Sprintf("⏰ %s", time.Now().Format("15:04:05"))

	// Efeito de "shake" visual
	fmt.Print("❌ ")
	time.Sleep(50 * time.Millisecond)
	fmt.Print("\r")

	if len(fields) > 0 {
		fieldsStr := ""
		parsedFields := parseFields(fields...)
		for key, value := range parsedFields {
			fieldsStr += " " + color.New(color.FgHiRed, color.Bold).Sprint("▶ "+key) +
				color.New(color.FgHiBlack).Sprint("=") +
				color.New(color.FgHiYellow, color.Italic).Sprintf("'%v'", value)
		}
		fmt.Printf("%s %s %s %s%s\n", timestamp, icon, prefix, message, fieldsStr)
	} else {
		fmt.Printf("%s %s %s %s\n", timestamp, icon, prefix, message)
	}
}

// Banner exibe banner ultra-moderno com gradiente
func (l *Logger) Banner(title string) {
	// Animação de entrada
	for i := 0; i < 3; i++ {
		fmt.Print("✨ ")
		time.Sleep(100 * time.Millisecond)
	}
	fmt.Print("\r")

	banner := color.New(color.FgHiCyan, color.Bold).Sprintf(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  🚀 %-70s ║
║                                                                              ║
║  ⚡ Powered by BeSu CLI - Next Generation Blockchain Tools ⚡               ║
╚══════════════════════════════════════════════════════════════════════════════╝`, title)
	fmt.Println(banner)

	// Linha de separação animada
	separator := ""
	for i := 0; i < 80; i++ {
		separator += color.New(color.FgHiMagenta).Sprint("═")
		fmt.Printf("\r%s", separator)
		time.Sleep(10 * time.Millisecond)
	}
	fmt.Println()
}

// Section exibe seção com animação moderna
func (l *Logger) Section(title string) {
	// Animação de transição
	fmt.Print("\n")
	for i := 0; i < 5; i++ {
		fmt.Printf("%s ", color.New(color.FgHiCyan).Sprint("▶"))
		time.Sleep(50 * time.Millisecond)
	}
	fmt.Print("\r")

	separator := color.New(color.FgHiBlack, color.Bold).Sprint("═══════════════════════════════════════════════════════════════════════════")
	titleColored := color.New(color.FgHiCyan, color.Bold).Sprintf("🎯 %s", title)

	fmt.Printf("%s\n%s\n", separator, titleColored)

	// Sub-separador
	subSeparator := ""
	for i := 0; i < len(title)+4; i++ {
		subSeparator += color.New(color.FgHiMagenta).Sprint("─")
	}
	fmt.Printf("%s\n", subSeparator)
}

// Step exibe um passo do processo com numeração
func (l *Logger) Step(step int, total int, msg string, fields ...interface{}) {
	icon := "📋"
	stepInfo := color.New(color.FgHiBlue, color.Bold).Sprintf("[STEP %d/%d]", step, total)
	message := color.New(color.FgWhite, color.Bold).Sprint(msg)
	timestamp := color.New(color.FgHiBlack, color.Bold).Sprintf("⏰ %s", time.Now().Format("15:04:05"))

	if len(fields) > 0 {
		fieldsStr := ""
		parsedFields := parseFields(fields...)
		for key, value := range parsedFields {
			fieldsStr += " " + color.New(color.FgHiGreen, color.Bold).Sprint("▶ "+key) +
				color.New(color.FgHiBlack).Sprint("=") +
				color.New(color.FgHiCyan, color.Italic).Sprintf("'%v'", value)
		}
		fmt.Printf("%s %s %s %s%s\n", timestamp, icon, stepInfo, message, fieldsStr)
	} else {
		fmt.Printf("%s %s %s %s\n", timestamp, icon, stepInfo, message)
	}
}

// Celebrate exibe uma celebração animada
func (l *Logger) Celebrate(msg string) {
	fmt.Printf("\n%s\n\n",
		color.New(color.FgHiGreen, color.Bold).Sprintf("✅ %s", msg))
}

// Info exibe informação com estilo moderno
func (l *Logger) Info(msg string, fields ...interface{}) {
	icon := "💡"
	prefix := color.New(color.FgHiBlue, color.Bold).Sprint("[INFO]")
	message := color.New(color.FgWhite).Sprint(msg)
	timestamp := color.New(color.FgHiBlack, color.Bold).Sprintf("⏰ %s", time.Now().Format("15:04:05"))

	if len(fields) > 0 {
		fieldsStr := ""
		parsedFields := parseFields(fields...)
		for key, value := range parsedFields {
			fieldsStr += " " + color.New(color.FgHiGreen, color.Bold).Sprint("▶ "+key) +
				color.New(color.FgHiBlack).Sprint("=") +
				color.New(color.FgHiCyan, color.Italic).Sprintf("'%v'", value)
		}
		fmt.Printf("%s %s %s %s%s\n", timestamp, icon, prefix, message, fieldsStr)
	} else {
		fmt.Printf("%s %s %s %s\n", timestamp, icon, prefix, message)
	}
}

// Print exibe mensagem simples sem prefixo
func (l *Logger) Print(msg string) {
	fmt.Println(msg)
}

// PrintColored exibe mensagem colorida sem prefixo
func (l *Logger) PrintColored(msg string, colorFunc func(string) string) {
	fmt.Println(colorFunc(msg))
}

// Table exibe dados em formato de tabela moderna
func (l *Logger) Table(headers []string, rows [][]string) {
	if len(headers) == 0 || len(rows) == 0 {
		return
	}

	// Calcular larguras das colunas
	colWidths := make([]int, len(headers))
	for i, header := range headers {
		colWidths[i] = len(header)
	}

	for _, row := range rows {
		for i, cell := range row {
			if i < len(colWidths) && len(cell) > colWidths[i] {
				colWidths[i] = len(cell)
			}
		}
	}

	// Cabeçalho
	fmt.Print("┌")
	for i, width := range colWidths {
		fmt.Print(strings.Repeat("─", width+2))
		if i < len(colWidths)-1 {
			fmt.Print("┬")
		}
	}
	fmt.Println("┐")

	// Headers
	fmt.Print("│")
	for i, header := range headers {
		fmt.Printf(" %s%s │",
			color.New(color.FgHiCyan, color.Bold).Sprint(header),
			strings.Repeat(" ", colWidths[i]-len(header)))
	}
	fmt.Println()

	// Separador
	fmt.Print("├")
	for i, width := range colWidths {
		fmt.Print(strings.Repeat("─", width+2))
		if i < len(colWidths)-1 {
			fmt.Print("┼")
		}
	}
	fmt.Println("┤")

	// Linhas
	for _, row := range rows {
		fmt.Print("│")
		for i, cell := range row {
			if i < len(colWidths) {
				fmt.Printf(" %s%s │",
					color.New(color.FgWhite).Sprint(cell),
					strings.Repeat(" ", colWidths[i]-len(cell)))
			}
		}
		fmt.Println()
	}

	// Rodapé
	fmt.Print("└")
	for i, width := range colWidths {
		fmt.Print(strings.Repeat("─", width+2))
		if i < len(colWidths)-1 {
			fmt.Print("┴")
		}
	}
	fmt.Println("┘")
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
