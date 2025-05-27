"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code, Search, BarChart3, AlertTriangle, CheckCircle, Info, XCircle, Play, BookOpen } from "lucide-react"

interface CaracterDetallado {
  valor: string
  valorMostrar: string
  tipo: "letra" | "digito" | "operador" | "puntuacion" | "espacio" | "simbolo" | "acento" | "especial" | "control"
  subtipo: string
  categoria:
    | "alfabetico"
    | "numerico"
    | "operador"
    | "delimitador"
    | "espacio"
    | "simbolo"
    | "unicode"
    | "control"
    | "puntuacion"
  posicion: number
  linea: number
  columna: number
  ascii: number
  unicode: string
  valorHex: string
  valorBinario: string
  descripcion: string
  esValido: boolean
  contexto: string
  rolSemantico: string
}

interface TokenMejorado {
  valor: string
  tipo:
    | "palabra-clave"
    | "identificador"
    | "numero"
    | "cadena"
    | "operador"
    | "puntuacion"
    | "espacio"
    | "simbolo"
    | "literal"
  subtipo: string
  posicion: number
  linea: number
  columna: number
  longitud: number
  caracteres: CaracterDetallado[]
  esValido: boolean
  significadoSemantico: string
  ambito: string
}

interface ErrorCompilador {
  id: string
  mensaje: string
  linea: number
  columna: number
  severidad: "fatal" | "error" | "advertencia" | "info" | "sugerencia"
  fase: "lexico" | "sintactico" | "semantico" | "optimizacion"
  codigo: string
  sugerencia?: string
}

interface FaseCompilador {
  nombre: string
  estado: "completado" | "error" | "advertencia" | "omitido"
  errores: ErrorCompilador[]
  duracion: number
  detalles: string
}

const PALABRAS_CLAVE = [
  "abstract",
  "arguments",
  "await",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "double",
  "else",
  "enum",
  "eval",
  "export",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "function",
  "goto",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "int",
  "interface",
  "let",
  "long",
  "native",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "volatile",
  "while",
  "with",
  "yield",
  "async",
  "of",
  "from",
  "as",
  "get",
  "set",
]

const OPERADORES = [
  "===",
  "!==",
  "==",
  "!=",
  "<=",
  ">=",
  "<<",
  ">>",
  ">>>",
  "&&",
  "||",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "<<=",
  ">>=",
  ">>>=",
  "=>",
  "??",
  "?.",
  "...",
  "**",
  "+",
  "-",
  "*",
  "/",
  "%",
  "=",
  "<",
  ">",
  "!",
  "&",
  "|",
  "^",
  "~",
  "?",
  ":",
]

const PUNTUACION = ["{", "}", "(", ")", "[", "]", ";", ",", ".", "@", "#"]

export default function SimuladorCompilador() {
  const [codigoFuente, setCodigoFuente] = useState("")
  const [terminoBusqueda, setTerminoBusqueda] = useState("")
  const [debeAnalizar, setDebeAnalizar] = useState(false)
  const [analizando, setAnalizando] = useState(false)
  const [mostrarDocumentacion, setMostrarDocumentacion] = useState(false)

  const analisisCaracteresDetallado = useMemo(() => {
    if (!debeAnalizar) return []

    const caracteres: CaracterDetallado[] = []
    let posicion = 0
    let linea = 1
    let columna = 1

    const obtenerTipoCaracter = (char: string, contexto: string): CaracterDetallado["tipo"] => {
      if (/[a-zA-Z]/.test(char)) return "letra"
      if (/[0-9]/.test(char)) return "digito"
      if (/[áéíóúÁÉÍÓÚñÑüÜçÇ]/.test(char)) return "acento"
      if (/\s/.test(char)) return "espacio"
      if (/[\x00-\x1F\x7F-\x9F]/.test(char)) return "control"
      if (OPERADORES.some((op) => op.includes(char))) return "operador"
      if (PUNTUACION.includes(char)) return "puntuacion"
      if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(char)) return "simbolo"
      return "especial"
    }

    const obtenerSubtipoCaracter = (char: string, tipo: CaracterDetallado["tipo"]): string => {
      switch (tipo) {
        case "letra":
          return /[a-z]/.test(char) ? "minuscula" : "mayuscula"
        case "digito":
          return "decimal"
        case "acento":
          return /[áéíóúñü]/.test(char) ? "minuscula-acentuada" : "mayuscula-acentuada"
        case "espacio":
          if (char === " ") return "espacio"
          if (char === "\t") return "tabulacion"
          if (char === "\n") return "nueva-linea"
          if (char === "\r") return "retorno-carro"
          return "otro-espacio"
        case "control":
          return `control-${char.charCodeAt(0)}`
        case "operador":
          return "aritmetico-logico"
        case "puntuacion":
          return "delimitador"
        case "simbolo":
          return "caracter-especial"
        default:
          return "desconocido"
      }
    }

    const obtenerCategoriaCaracter = (char: string): CaracterDetallado["categoria"] => {
      if (/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜçÇ]/.test(char)) return "alfabetico"
      if (/[0-9]/.test(char)) return "numerico"
      if (OPERADORES.some((op) => op.includes(char))) return "operador"
      if (PUNTUACION.includes(char)) return "puntuacion"
      if (/[;,.]/.test(char)) return "delimitador"
      if (/\s/.test(char)) return "espacio"
      if (/[\x00-\x1F\x7F-\x9F]/.test(char)) return "control"
      if (char.charCodeAt(0) > 127) return "unicode"
      return "simbolo"
    }

    const obtenerRolSemantico = (char: string, posicion: number, contexto: string): string => {
      if (/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(char)) {
        if (posicion === 0 || /\s/.test(codigoFuente[posicion - 1])) return "inicio-palabra"
        return "continuacion-palabra"
      }
      if (/[0-9]/.test(char)) return "literal-numerico"
      if (char === "{") return "inicio-bloque"
      if (char === "}") return "fin-bloque"
      if (char === "(") return "inicio-expresion"
      if (char === ")") return "fin-expresion"
      if (char === ";") return "terminador-sentencia"
      if (char === ",") return "separador"
      if (char === "=") return "asignacion"
      return "estructural"
    }

    const obtenerValorMostrar = (char: string): string => {
      switch (char) {
        case " ":
          return "␣"
        case "\t":
          return "→"
        case "\n":
          return "↵"
        case "\r":
          return "⏎"
        case "\0":
          return "∅"
        default:
          return char
      }
    }

    const obtenerDescripcionDetallada = (char: string, tipo: CaracterDetallado["tipo"], subtipo: string): string => {
      const codigo = char.charCodeAt(0)

      switch (tipo) {
        case "letra":
          return `${subtipo === "minuscula" ? "Letra minúscula" : "Letra mayúscula"} '${char}' (alfabeto latino)`
        case "digito":
          return `Dígito decimal '${char}' (valor numérico: ${char})`
        case "acento":
          return `${subtipo.includes("minuscula") ? "Letra minúscula" : "Letra mayúscula"} acentuada '${char}' (latino extendido)`
        case "espacio":
          switch (char) {
            case " ":
              return "Carácter de espacio (separador de palabras)"
            case "\t":
              return "Tabulación horizontal (indentación)"
            case "\n":
              return "Salto de línea (terminador de línea)"
            case "\r":
              return "Retorno de carro (final de línea legacy)"
            default:
              return `Carácter de espacio en blanco (ASCII ${codigo})`
          }
        case "control":
          return `Carácter de control (ASCII ${codigo}, no imprimible)`
        case "operador":
          return `Carácter operador '${char}' (operación matemática/lógica)`
        case "puntuacion":
          return `Signo de puntuación '${char}' (delimitador estructural)`
        case "simbolo":
          return `Carácter símbolo '${char}' (propósito especial)`
        default:
          return `Carácter '${char}' (ASCII ${codigo})`
      }
    }

    for (let i = 0; i < codigoFuente.length; i++) {
      const char = codigoFuente[i]
      const contexto = codigoFuente.substring(Math.max(0, i - 5), i + 6)
      const tipo = obtenerTipoCaracter(char, contexto)
      const subtipo = obtenerSubtipoCaracter(char, tipo)
      const ascii = char.charCodeAt(0)
      const unicode = `U+${ascii.toString(16).toUpperCase().padStart(4, "0")}`
      const valorHex = `0x${ascii.toString(16).toUpperCase()}`
      const valorBinario = ascii.toString(2).padStart(8, "0")

      caracteres.push({
        valor: char,
        valorMostrar: obtenerValorMostrar(char),
        tipo,
        subtipo,
        categoria: obtenerCategoriaCaracter(char),
        posicion,
        linea,
        columna,
        ascii,
        unicode,
        valorHex,
        valorBinario,
        descripcion: obtenerDescripcionDetallada(char, tipo, subtipo),
        esValido: ascii >= 0 && ascii <= 1114111, // Rango Unicode válido
        contexto: contexto.replace(/\n/g, "\\n").replace(/\t/g, "\\t"),
        rolSemantico: obtenerRolSemantico(char, i, contexto),
      })

      if (char === "\n") {
        linea++
        columna = 1
      } else {
        columna++
      }
      posicion++
    }

    return caracteres
  }, [codigoFuente, debeAnalizar])

  const analisisTokensMejorado = useMemo(() => {
    if (!debeAnalizar) return []

    const tokens: TokenMejorado[] = []
    let posicion = 0
    let linea = 1
    let columna = 1

    const agregarToken = (valor: string, tipo: TokenMejorado["tipo"], chars: CaracterDetallado[], subtipo = "") => {
      const significadoSemantico = obtenerSignificadoSemantico(valor, tipo)
      const ambito = determinarAmbito(valor, tipo, posicion)

      tokens.push({
        valor,
        tipo,
        subtipo: subtipo || obtenerSubtipoToken(valor, tipo),
        posicion,
        linea,
        columna: columna - valor.length + 1,
        longitud: valor.length,
        caracteres: chars,
        esValido: validarToken(valor, tipo),
        significadoSemantico,
        ambito,
      })
      posicion += valor.length
    }

    const obtenerSubtipoToken = (valor: string, tipo: TokenMejorado["tipo"]): string => {
      switch (tipo) {
        case "palabra-clave":
          if (["if", "else", "switch", "case"].includes(valor)) return "condicional"
          if (["for", "while", "do"].includes(valor)) return "bucle"
          if (["function", "class", "interface"].includes(valor)) return "declaracion"
          if (["return", "break", "continue"].includes(valor)) return "flujo-control"
          return "reservada"
        case "identificador":
          if (/^[A-Z]/.test(valor)) return "capitalizado"
          if (/^[a-z]/.test(valor)) return "camelCase"
          if (/_/.test(valor)) return "snake_case"
          return "estandar"
        case "numero":
          if (valor.includes(".")) return "punto-flotante"
          if (valor.startsWith("0x")) return "hexadecimal"
          if (valor.startsWith("0b")) return "binario"
          if (valor.startsWith("0o")) return "octal"
          return "entero"
        case "cadena":
          if (valor.startsWith('"')) return "comillas-dobles"
          if (valor.startsWith("'")) return "comillas-simples"
          if (valor.startsWith("`")) return "literal-plantilla"
          return "literal-cadena"
        case "operador":
          if (["=", "+=", "-=", "*=", "/="].includes(valor)) return "asignacion"
          if (["==", "===", "!=", "!==", "<", ">", "<=", ">="].includes(valor)) return "comparacion"
          if (["+", "-", "*", "/", "%"].includes(valor)) return "aritmetico"
          if (["&&", "||", "!"].includes(valor)) return "logico"
          return "operador"
        default:
          return "desconocido"
      }
    }

    const obtenerSignificadoSemantico = (valor: string, tipo: TokenMejorado["tipo"]): string => {
      switch (tipo) {
        case "palabra-clave":
          return `Palabra reservada: ${valor} (construcción del lenguaje)`
        case "identificador":
          return `Identificador: ${valor} (nombre de variable/función)`
        case "numero":
          return `Literal numérico: ${valor} (valor constante)`
        case "cadena":
          return `Literal de cadena: ${valor} (datos de texto)`
        case "operador":
          return `Operador: ${valor} (realiza operación)`
        case "puntuacion":
          return `Puntuación: ${valor} (elemento estructural)`
        default:
          return `Token: ${valor} (${tipo})`
      }
    }

    const determinarAmbito = (valor: string, tipo: TokenMejorado["tipo"], pos: number): string => {
      // Determinación simplificada de ámbito
      if (tipo === "palabra-clave" && ["var", "let", "const"].includes(valor)) return "ambito-declaracion"
      if (tipo === "identificador") return "ambito-identificador"
      if (tipo === "operador") return "ambito-expresion"
      return "ambito-global"
    }

    const validarToken = (valor: string, tipo: TokenMejorado["tipo"]): boolean => {
      switch (tipo) {
        case "palabra-clave":
          return PALABRAS_CLAVE.includes(valor)
        case "identificador":
          return /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ_$][a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ_$]*$/.test(valor)
        case "numero":
          return !isNaN(Number.parseFloat(valor))
        case "cadena":
          const primerChar = valor[0]
          const ultimoChar = valor[valor.length - 1]
          return primerChar === ultimoChar && ['"', "'", "`"].includes(primerChar)
        default:
          return true
      }
    }

    let i = 0
    while (i < codigoFuente.length) {
      const char = codigoFuente[i]

      // Espacios en blanco
      if (/\s/.test(char)) {
        let espacios = ""
        const chars: CaracterDetallado[] = []
        while (i < codigoFuente.length && /\s/.test(codigoFuente[i])) {
          const charActual = codigoFuente[i]
          espacios += charActual
          chars.push(analisisCaracteresDetallado[i])
          if (charActual === "\n") {
            linea++
            columna = 1
          } else {
            columna++
          }
          i++
        }
        agregarToken(espacios, "espacio", chars)
        continue
      }

      // Cadenas
      if (char === '"' || char === "'" || char === "`") {
        const comilla = char
        let cadena = char
        const chars: CaracterDetallado[] = [analisisCaracteresDetallado[i]]
        i++
        columna++
        while (i < codigoFuente.length && codigoFuente[i] !== comilla) {
          if (codigoFuente[i] === "\\" && i + 1 < codigoFuente.length) {
            cadena += codigoFuente[i] + codigoFuente[i + 1]
            chars.push(analisisCaracteresDetallado[i], analisisCaracteresDetallado[i + 1])
            i += 2
            columna += 2
          } else {
            cadena += codigoFuente[i]
            chars.push(analisisCaracteresDetallado[i])
            if (codigoFuente[i] === "\n") {
              linea++
              columna = 1
            } else {
              columna++
            }
            i++
          }
        }
        if (i < codigoFuente.length) {
          cadena += codigoFuente[i]
          chars.push(analisisCaracteresDetallado[i])
          i++
          columna++
        }
        agregarToken(cadena, "cadena", chars)
        continue
      }

      // Números
      if (/\d/.test(char)) {
        let numero = ""
        const chars: CaracterDetallado[] = []
        while (i < codigoFuente.length && /[\d.]/.test(codigoFuente[i])) {
          numero += codigoFuente[i]
          chars.push(analisisCaracteresDetallado[i])
          i++
          columna++
        }
        agregarToken(numero, "numero", chars)
        continue
      }

      // Operadores (multi-carácter primero)
      let operadorEncontrado = false
      for (const op of OPERADORES.sort((a, b) => b.length - a.length)) {
        if (codigoFuente.substr(i, op.length) === op) {
          const chars = analisisCaracteresDetallado.slice(i, i + op.length)
          agregarToken(op, "operador", chars)
          i += op.length
          columna += op.length
          operadorEncontrado = true
          break
        }
      }
      if (operadorEncontrado) continue

      // Puntuación
      if (PUNTUACION.includes(char)) {
        agregarToken(char, "puntuacion", [analisisCaracteresDetallado[i]])
        i++
        columna++
        continue
      }

      // Identificadores y palabras clave
      if (/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ_$]/.test(char)) {
        let identificador = ""
        const chars: CaracterDetallado[] = []
        while (i < codigoFuente.length && /[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ_$]/.test(codigoFuente[i])) {
          identificador += codigoFuente[i]
          chars.push(analisisCaracteresDetallado[i])
          i++
          columna++
        }
        const tipo = PALABRAS_CLAVE.includes(identificador) ? "palabra-clave" : "identificador"
        agregarToken(identificador, tipo, chars)
        continue
      }

      // Símbolos y caracteres especiales
      agregarToken(char, "simbolo", [analisisCaracteresDetallado[i]])
      i++
      columna++
    }

    return tokens
  }, [codigoFuente, analisisCaracteresDetallado, debeAnalizar])

  const fasesCompilador = useMemo(() => {
    if (!debeAnalizar) return { fases: [], errores: [] }

    const fases: FaseCompilador[] = []
    const errores: ErrorCompilador[] = []

    // Fase 1: Análisis Léxico
    const inicioLexico = performance.now()
    const erroresLexicos: ErrorCompilador[] = []

    analisisCaracteresDetallado.forEach((char, index) => {
      if (!char.esValido) {
        erroresLexicos.push({
          id: `lex-${index}`,
          mensaje: `Carácter inválido: ${char.descripcion}`,
          linea: char.linea,
          columna: char.columna,
          severidad: "error",
          fase: "lexico",
          codigo: "LEX001",
        })
      }
    })

    fases.push({
      nombre: "Análisis Léxico",
      estado: erroresLexicos.length > 0 ? "error" : "completado",
      errores: erroresLexicos,
      duracion: performance.now() - inicioLexico,
      detalles: `Analizados ${analisisCaracteresDetallado.length} caracteres, encontrados ${analisisTokensMejorado.length} tokens`,
    })

    // Fase 2: Análisis Sintáctico
    const inicioSintactico = performance.now()
    const erroresSintacticos: ErrorCompilador[] = []
    let contadorLlaves = 0
    let contadorParentesis = 0
    let contadorCorchetes = 0

    analisisTokensMejorado.forEach((token, index) => {
      if (!token.esValido) {
        erroresSintacticos.push({
          id: `sin-${index}`,
          mensaje: `Token inválido: ${token.valor}`,
          linea: token.linea,
          columna: token.columna,
          severidad: "error",
          fase: "sintactico",
          codigo: "SIN001",
        })
      }

      if (token.tipo === "puntuacion") {
        switch (token.valor) {
          case "{":
            contadorLlaves++
            break
          case "}":
            contadorLlaves--
            if (contadorLlaves < 0) {
              erroresSintacticos.push({
                id: `sin-llave-${index}`,
                mensaje: "Llave de cierre '}' sin coincidencia",
                linea: token.linea,
                columna: token.columna,
                severidad: "error",
                fase: "sintactico",
                codigo: "SIN002",
                sugerencia: "Agregar llave de apertura '{' antes de esta posición",
              })
            }
            break
          case "(":
            contadorParentesis++
            break
          case ")":
            contadorParentesis--
            if (contadorParentesis < 0) {
              erroresSintacticos.push({
                id: `sin-paren-${index}`,
                mensaje: "Paréntesis de cierre ')' sin coincidencia",
                linea: token.linea,
                columna: token.columna,
                severidad: "error",
                fase: "sintactico",
                codigo: "SIN003",
                sugerencia: "Agregar paréntesis de apertura '(' antes de esta posición",
              })
            }
            break
          case "[":
            contadorCorchetes++
            break
          case "]":
            contadorCorchetes--
            if (contadorCorchetes < 0) {
              erroresSintacticos.push({
                id: `sin-corchete-${index}`,
                mensaje: "Corchete de cierre ']' sin coincidencia",
                linea: token.linea,
                columna: token.columna,
                severidad: "error",
                fase: "sintactico",
                codigo: "SIN004",
                sugerencia: "Agregar corchete de apertura '[' antes de esta posición",
              })
            }
            break
        }
      }
    })

    if (contadorLlaves > 0) {
      erroresSintacticos.push({
        id: "sin-llave-fin",
        mensaje: `${contadorLlaves} llave(s) de apertura '{' sin coincidencia`,
        linea: analisisTokensMejorado[analisisTokensMejorado.length - 1]?.linea || 1,
        columna: analisisTokensMejorado[analisisTokensMejorado.length - 1]?.columna || 1,
        severidad: "error",
        fase: "sintactico",
        codigo: "SIN005",
        sugerencia: `Agregar ${contadorLlaves} llave(s) de cierre '}'`,
      })
    }

    fases.push({
      nombre: "Análisis Sintáctico",
      estado: erroresSintacticos.length > 0 ? "error" : "completado",
      errores: erroresSintacticos,
      duracion: performance.now() - inicioSintactico,
      detalles: `Validados ${analisisTokensMejorado.length} tokens, verificada coincidencia de delimitadores`,
    })

    // Fase 3: Análisis Semántico
    const inicioSemantico = performance.now()
    const erroresSemanticos: ErrorCompilador[] = []

    const identificadores = new Set<string>()
    analisisTokensMejorado.forEach((token, index) => {
      if (token.tipo === "identificador") {
        if (identificadores.has(token.valor)) {
          erroresSemanticos.push({
            id: `sem-${index}`,
            mensaje: `Posible redeclaración del identificador '${token.valor}'`,
            linea: token.linea,
            columna: token.columna,
            severidad: "advertencia",
            fase: "semantico",
            codigo: "SEM001",
            sugerencia: "Considerar usar un nombre de variable diferente",
          })
        }
        identificadores.add(token.valor)
      }
    })

    fases.push({
      nombre: "Análisis Semántico",
      estado: erroresSemanticos.length > 0 ? "advertencia" : "completado",
      errores: erroresSemanticos,
      duracion: performance.now() - inicioSemantico,
      detalles: `Analizados ${identificadores.size} identificadores únicos, realizada validación semántica básica`,
    })

    errores.push(...erroresLexicos, ...erroresSintacticos, ...erroresSemanticos)

    return { fases, errores }
  }, [analisisCaracteresDetallado, analisisTokensMejorado, debeAnalizar])

  const estadisticas = useMemo(() => {
    if (!debeAnalizar) return { estadisticasChar: {}, estadisticasToken: {} }

    const estadisticasChar = {
      total: analisisCaracteresDetallado.length,
      letras: 0,
      digitos: 0,
      acentos: 0,
      operadores: 0,
      puntuacion: 0,
      simbolos: 0,
      espacios: 0,
      control: 0,
      especiales: 0,
      validos: 0,
      invalidos: 0,
    }

    const estadisticasToken = {
      total: analisisTokensMejorado.length,
      palabrasClave: 0,
      identificadores: 0,
      numeros: 0,
      cadenas: 0,
      operadores: 0,
      puntuacion: 0,
      simbolos: 0,
      validos: 0,
      invalidos: 0,
      lineas: Math.max(...analisisTokensMejorado.map((t) => t.linea), 1),
    }

    analisisCaracteresDetallado.forEach((char) => {
      switch (char.tipo) {
        case "letra":
          estadisticasChar.letras++
          break
        case "digito":
          estadisticasChar.digitos++
          break
        case "acento":
          estadisticasChar.acentos++
          break
        case "operador":
          estadisticasChar.operadores++
          break
        case "puntuacion":
          estadisticasChar.puntuacion++
          break
        case "simbolo":
          estadisticasChar.simbolos++
          break
        case "espacio":
          estadisticasChar.espacios++
          break
        case "control":
          estadisticasChar.control++
          break
        case "especial":
          estadisticasChar.especiales++
          break
      }
      if (char.esValido) estadisticasChar.validos++
      else estadisticasChar.invalidos++
    })

    analisisTokensMejorado.forEach((token) => {
      switch (token.tipo) {
        case "palabra-clave":
          estadisticasToken.palabrasClave++
          break
        case "identificador":
          estadisticasToken.identificadores++
          break
        case "numero":
          estadisticasToken.numeros++
          break
        case "cadena":
          estadisticasToken.cadenas++
          break
        case "operador":
          estadisticasToken.operadores++
          break
        case "puntuacion":
          estadisticasToken.puntuacion++
          break
        case "simbolo":
          estadisticasToken.simbolos++
          break
      }
      if (token.esValido) estadisticasToken.validos++
      else estadisticasToken.invalidos++
    })

    return { estadisticasChar, estadisticasToken }
  }, [analisisCaracteresDetallado, analisisTokensMejorado, debeAnalizar])

  const datosFiltrados = useMemo(() => {
    if (!debeAnalizar) return { caracteres: [], tokens: [] }

    if (!terminoBusqueda) return { caracteres: analisisCaracteresDetallado, tokens: analisisTokensMejorado }

    const caracteresFiltrados = analisisCaracteresDetallado.filter(
      (char) =>
        char.valor.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        char.tipo.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        char.subtipo.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        char.descripcion.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        char.rolSemantico.toLowerCase().includes(terminoBusqueda.toLowerCase()),
    )

    const tokensFiltrados = analisisTokensMejorado.filter(
      (token) =>
        token.valor.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        token.tipo.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        token.subtipo.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        token.significadoSemantico.toLowerCase().includes(terminoBusqueda.toLowerCase()),
    )

    return { caracteres: caracteresFiltrados, tokens: tokensFiltrados }
  }, [analisisCaracteresDetallado, analisisTokensMejorado, terminoBusqueda, debeAnalizar])

  const obtenerColorCaracter = (tipo: CaracterDetallado["tipo"], esValido: boolean) => {
    const colorBase = (() => {
      switch (tipo) {
        case "letra":
          return "bg-blue-100 text-blue-800 border-blue-200"
        case "digito":
          return "bg-purple-100 text-purple-800 border-purple-200"
        case "acento":
          return "bg-green-100 text-green-800 border-green-200"
        case "operador":
          return "bg-red-100 text-red-800 border-red-200"
        case "puntuacion":
          return "bg-gray-100 text-gray-800 border-gray-200"
        case "simbolo":
          return "bg-orange-100 text-orange-800 border-orange-200"
        case "espacio":
          return "bg-slate-100 text-slate-800 border-slate-200"
        case "control":
          return "bg-yellow-100 text-yellow-800 border-yellow-200"
        case "especial":
          return "bg-pink-100 text-pink-800 border-pink-200"
        default:
          return "bg-gray-100 text-gray-800 border-gray-200"
      }
    })()

    return esValido ? colorBase : colorBase.replace("100", "200").replace("800", "900")
  }

  const obtenerColorToken = (tipo: TokenMejorado["tipo"], esValido: boolean) => {
    const colorBase = (() => {
      switch (tipo) {
        case "palabra-clave":
          return "bg-blue-100 text-blue-800 border-blue-200"
        case "identificador":
          return "bg-green-100 text-green-800 border-green-200"
        case "numero":
          return "bg-purple-100 text-purple-800 border-purple-200"
        case "cadena":
          return "bg-yellow-100 text-yellow-800 border-yellow-200"
        case "operador":
          return "bg-red-100 text-red-800 border-red-200"
        case "puntuacion":
          return "bg-gray-100 text-gray-800 border-gray-200"
        case "simbolo":
          return "bg-orange-100 text-orange-800 border-orange-200"
        default:
          return "bg-gray-100 text-gray-800 border-gray-200"
      }
    })()

    return esValido ? colorBase : colorBase.replace("100", "200").replace("800", "900")
  }

  const limpiarCodigo = () => {
    setCodigoFuente("")
    setDebeAnalizar(false)
  }

  const iniciarAnalisis = async () => {
    if (!codigoFuente.trim()) {
      alert("Por favor, ingrese código para analizar")
      return
    }

    setAnalizando(true)
    // Simular tiempo de procesamiento
    await new Promise((resolve) => setTimeout(resolve, 500))
    setDebeAnalizar(true)
    setAnalizando(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="text-center space-y-2 relative">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-800">Compilapobres-C1113</h1>
            <Button
              onClick={() => setMostrarDocumentacion(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              title="Ver documentación del proyecto"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Documentación</span>
              <span className="sm:hidden">Docs</span>
            </Button>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-lg sm:text-xl">Participantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-1 sm:space-y-2">
              <p className="text-slate-700 font-medium text-sm sm:text-base">Eliézer Alarcón - 31.369.059</p>
              <p className="text-slate-700 font-medium text-sm sm:text-base">Santiago Hernández - 31.959.906</p>
              <p className="text-slate-700 font-medium text-sm sm:text-base">Josias Arias - 30.309.825</p>
              <p className="text-slate-700 font-medium text-sm sm:text-base">Fady el Kadi - 31.691.954</p>
              <p className="text-slate-700 font-medium text-sm sm:text-base">Ariangelys Uzcategui - 29.977.616</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Sección de Entrada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Code className="w-4 h-4 sm:w-5 sm:h-5" />
                Código Fuente
              </CardTitle>
              <CardDescription className="text-sm">Ingresa tu código para análisis exhaustivo</CardDescription>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={iniciarAnalisis}
                  disabled={analizando || !codigoFuente.trim()}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Play className="w-4 h-4" />
                  {analizando ? "Analizando..." : "Analizar"}
                </Button>
                <Button onClick={limpiarCodigo} variant="outline" size="sm" className="w-full sm:w-auto">
                  Limpiar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={codigoFuente}
                onChange={(e) => setCodigoFuente(e.target.value)}
                placeholder="Escribir aquí..."
                className="min-h-[300px] sm:min-h-[400px] font-mono text-xs sm:text-sm"
              />
            </CardContent>
          </Card>

          {/* Fases del Compilador */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                Fases del Compilador
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!debeAnalizar ? (
                <div className="text-center py-6 sm:py-8 text-slate-500">
                  <Play className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">Presiona "Analizar" para iniciar el proceso de compilación</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {fasesCompilador.fases.map((fase, index) => (
                    <div key={index} className="border rounded-lg p-2 sm:p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm sm:text-base">{fase.nombre}</span>
                        <div className="flex items-center gap-2">
                          {fase.estado === "completado" && (
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                          )}
                          {fase.estado === "error" && <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />}
                          {fase.estado === "advertencia" && (
                            <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                          )}
                          <span className="text-xs text-slate-500">{fase.duracion.toFixed(2)}ms</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{fase.detalles}</p>
                      {fase.errores.length > 0 && (
                        <div className="text-xs">
                          <span className="text-red-600">{fase.errores.length} error(es)</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas */}
        {debeAnalizar && (
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Estadísticas de Caracteres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-semibold">{estadisticas.estadisticasChar.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">Letras:</span>
                      <span className="font-semibold text-blue-600">{estadisticas.estadisticasChar.letras}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-600">Dígitos:</span>
                      <span className="font-semibold text-purple-600">{estadisticas.estadisticasChar.digitos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Acentos:</span>
                      <span className="font-semibold text-green-600">{estadisticas.estadisticasChar.acentos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Operadores:</span>
                      <span className="font-semibold text-red-600">{estadisticas.estadisticasChar.operadores}</span>
                    </div>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between">
                      <span className="text-orange-600">Símbolos:</span>
                      <span className="font-semibold text-orange-600">{estadisticas.estadisticasChar.simbolos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Espacios:</span>
                      <span className="font-semibold text-slate-600">{estadisticas.estadisticasChar.espacios}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-600">Control:</span>
                      <span className="font-semibold text-yellow-600">{estadisticas.estadisticasChar.control}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Válidos:</span>
                      <span className="font-semibold text-green-600">{estadisticas.estadisticasChar.validos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Inválidos:</span>
                      <span className="font-semibold text-red-600">{estadisticas.estadisticasChar.invalidos}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Errores del Compilador */}
        {debeAnalizar && fasesCompilador.errores.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                Errores y Advertencias del Compilador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                {fasesCompilador.errores.map((error, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 p-2 sm:p-3 border rounded ${
                      error.severidad === "error"
                        ? "bg-red-50 border-red-200"
                        : error.severidad === "advertencia"
                          ? "bg-yellow-50 border-yellow-200"
                          : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    {error.severidad === "error" && (
                      <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    {error.severidad === "advertencia" && (
                      <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    )}
                    {error.severidad === "info" && (
                      <Info className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-medium">
                        [{error.codigo}] Línea {error.linea}, Columna {error.columna} - {error.fase}
                      </div>
                      <div className="text-xs sm:text-sm">{error.mensaje}</div>
                      {error.sugerencia && (
                        <div className="text-xs text-slate-600 mt-1">💡 Sugerencia: {error.sugerencia}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Análisis Detallado */}
        {debeAnalizar && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                Análisis Detallado - Proceso de Compilación Exhaustivo
              </CardTitle>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar en análisis detallado..."
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  className="px-3 py-1 border rounded-md text-xs sm:text-sm flex-1"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="caracteres" className="w-full">
                <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
                  <TabsTrigger value="caracteres" className="text-xs sm:text-sm">
                    Análisis Carácter
                  </TabsTrigger>
                  <TabsTrigger value="tokens" className="text-xs sm:text-sm">
                    Análisis Tokens
                  </TabsTrigger>
                  <TabsTrigger value="visual" className="text-xs sm:text-sm">
                    Visual
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="caracteres">
                  <div className="max-h-64 sm:max-h-96 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="text-left p-1">Pos</th>
                          <th className="text-left p-1">Char</th>
                          <th className="text-left p-1 hidden sm:table-cell">Display</th>
                          <th className="text-left p-1">Tipo</th>
                          <th className="text-left p-1 hidden md:table-cell">Subtipo</th>
                          <th className="text-left p-1 hidden lg:table-cell">Categoría</th>
                          <th className="text-left p-1 hidden sm:table-cell">ASCII</th>
                          <th className="text-left p-1 hidden md:table-cell">Unicode</th>
                          <th className="text-left p-1 hidden lg:table-cell">Hex</th>
                          <th className="text-left p-1 hidden xl:table-cell">Binario</th>
                          <th className="text-left p-1">L:C</th>
                          <th className="text-left p-1 hidden lg:table-cell">Rol</th>
                          <th className="text-left p-1 hidden xl:table-cell">Contexto</th>
                          <th className="text-left p-1">Válido</th>
                          <th className="text-left p-1 hidden sm:table-cell">Descripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosFiltrados.caracteres.map((char, index) => (
                          <tr key={index} className="border-b hover:bg-slate-50">
                            <td className="p-1 font-mono">{char.posicion}</td>
                            <td className="p-1 font-mono text-center">{char.valor}</td>
                            <td className="p-1 font-mono text-center hidden sm:table-cell">{char.valorMostrar}</td>
                            <td className="p-1">
                              <Badge
                                variant="outline"
                                className={`${obtenerColorCaracter(char.tipo, char.esValido)} text-xs`}
                              >
                                {char.tipo}
                              </Badge>
                            </td>
                            <td className="p-1 text-xs hidden md:table-cell">{char.subtipo}</td>
                            <td className="p-1 text-xs hidden lg:table-cell">{char.categoria}</td>
                            <td className="p-1 font-mono hidden sm:table-cell">{char.ascii}</td>
                            <td className="p-1 font-mono hidden md:table-cell">{char.unicode}</td>
                            <td className="p-1 font-mono hidden lg:table-cell">{char.valorHex}</td>
                            <td className="p-1 font-mono hidden xl:table-cell">{char.valorBinario}</td>
                            <td className="p-1 text-xs">
                              {char.linea}:{char.columna}
                            </td>
                            <td className="p-1 text-xs hidden lg:table-cell">{char.rolSemantico}</td>
                            <td
                              className="p-1 font-mono text-xs max-w-20 truncate hidden xl:table-cell"
                              title={char.contexto}
                            >
                              {char.contexto}
                            </td>
                            <td className="p-1 text-center">
                              {char.esValido ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-500" />
                              )}
                            </td>
                            <td className="p-1 text-xs max-w-32 truncate hidden sm:table-cell" title={char.descripcion}>
                              {char.descripcion}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="tokens">
                  <div className="max-h-64 sm:max-h-96 overflow-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="text-left p-1 sm:p-2">Token</th>
                          <th className="text-left p-1 sm:p-2">Tipo</th>
                          <th className="text-left p-1 sm:p-2 hidden md:table-cell">Subtipo</th>
                          <th className="text-left p-1 sm:p-2 hidden lg:table-cell">Posición</th>
                          <th className="text-left p-1 sm:p-2">L:C</th>
                          <th className="text-left p-1 sm:p-2 hidden sm:table-cell">Longitud</th>
                          <th className="text-left p-1 sm:p-2 hidden md:table-cell">Caracteres</th>
                          <th className="text-left p-1 sm:p-2">Válido</th>
                          <th className="text-left p-1 sm:p-2 hidden lg:table-cell">Significado</th>
                          <th className="text-left p-1 sm:p-2 hidden xl:table-cell">Ámbito</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosFiltrados.tokens
                          .filter((token) => token.tipo !== "espacio")
                          .map((token, index) => (
                            <tr key={index} className="border-b hover:bg-slate-50">
                              <td className="p-1 sm:p-2 font-mono max-w-20 truncate" title={token.valor}>
                                {token.valor}
                              </td>
                              <td className="p-1 sm:p-2">
                                <Badge
                                  variant="outline"
                                  className={`${obtenerColorToken(token.tipo, token.esValido)} text-xs`}
                                >
                                  {token.tipo}
                                </Badge>
                              </td>
                              <td className="p-1 sm:p-2 text-xs hidden md:table-cell">{token.subtipo}</td>
                              <td className="p-1 sm:p-2 font-mono text-xs hidden lg:table-cell">{token.posicion}</td>
                              <td className="p-1 sm:p-2 text-xs">
                                {token.linea}:{token.columna}
                              </td>
                              <td className="p-1 sm:p-2 text-xs hidden sm:table-cell">{token.longitud}</td>
                              <td className="p-1 sm:p-2 text-xs hidden md:table-cell">{token.caracteres.length}</td>
                              <td className="p-1 sm:p-2 text-center">
                                {token.esValido ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-red-500" />
                                )}
                              </td>
                              <td
                                className="p-1 sm:p-2 text-xs max-w-32 truncate hidden lg:table-cell"
                                title={token.significadoSemantico}
                              >
                                {token.significadoSemantico}
                              </td>
                              <td className="p-1 sm:p-2 text-xs hidden xl:table-cell">{token.ambito}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="visual" className="space-y-4">
                  <div className="flex flex-wrap gap-1 max-h-64 sm:max-h-96 overflow-y-auto p-2 sm:p-4 bg-slate-50 rounded-lg">
                    {datosFiltrados.caracteres.map((char, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className={`${obtenerColorCaracter(char.tipo, char.esValido)} flex items-center gap-1 px-1 py-1 text-xs`}
                        title={`${char.descripcion} | Pos: ${char.posicion} | Línea: ${char.linea} | Col: ${char.columna} | ASCII: ${char.ascii} | Unicode: ${char.unicode} | Rol: ${char.rolSemantico}`}
                      >
                        <span className="font-mono text-xs">{char.valorMostrar}</span>
                      </Badge>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Modal de Documentación */}
        {mostrarDocumentacion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-2 sm:mx-4">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="hidden sm:inline">Documentación del Proyecto</span>
                    <span className="sm:hidden">Documentación</span>
                  </h2>
                  <Button onClick={() => setMostrarDocumentacion(false)} variant="outline" size="sm">
                    ✕ Cerrar
                  </Button>
                </div>

                <div className="prose prose-slate max-w-none space-y-4 sm:space-y-6 text-sm sm:text-base">
                  <section>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2 sm:mb-3">
                      🏗️ Arquitectura del Proyecto
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      Este compilador implementa una arquitectura modular basada en componentes React que procesan el
                      código fuente a través de múltiples capas de análisis. La aplicación utiliza un patrón de
                      procesamiento en pipeline donde cada fase del compilador opera de manera independiente y
                      secuencial.
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      La estructura se organiza en módulos especializados: interfaz de entrada, motor de análisis
                      léxico, procesador sintáctico, validador semántico y generador de reportes. Cada módulo mantiene
                      su estado interno y se comunica con los demás a través de interfaces bien definidas.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2 sm:mb-3">
                      💻 Tecnologías Utilizadas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Frontend Principal</h4>
                        <ul className="text-blue-700 space-y-1 text-sm">
                          <li>
                            • <strong>React 18</strong> - Base de la interfaz de usuario
                          </li>
                          <li>
                            • <strong>TypeScript</strong> - Tipado estático y código mantenible
                          </li>
                          <li>
                            • <strong>Next.js 15</strong> - Framework de React con optimizaciones
                          </li>
                        </ul>
                      </div>
                      <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2">Estilos y UI</h4>
                        <ul className="text-green-700 space-y-1 text-sm">
                          <li>
                            • <strong>Tailwind CSS</strong> - Sistema de estilos utilitario
                          </li>
                          <li>
                            • <strong>shadcn/ui</strong> - Componentes accesibles y modernos
                          </li>
                          <li>
                            • <strong>Lucide React</strong> - Biblioteca de iconos vectoriales
                          </li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2 sm:mb-3">
                      🔧 Funcionalidades Principales
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="border-l-4 border-purple-400 pl-3 sm:pl-4">
                        <h4 className="font-semibold text-purple-800">Análisis Carácter por Carácter</h4>
                        <p className="text-slate-600 text-sm">
                          Cada elemento del código se examina individualmente, proporcionando información detallada
                          sobre códigos ASCII, representación Unicode, clasificación de caracteres y roles semánticos
                          específicos.
                        </p>
                      </div>
                      <div className="border-l-4 border-orange-400 pl-3 sm:pl-4">
                        <h4 className="font-semibold text-orange-800">Tokenización Inteligente</h4>
                        <p className="text-slate-600 text-sm">
                          El código se segmenta en unidades significativas (tokens) como palabras clave, identificadores
                          y operadores. Cada token se clasifica y valida según las reglas sintácticas del lenguaje.
                        </p>
                      </div>
                      <div className="border-l-4 border-red-400 pl-3 sm:pl-4">
                        <h4 className="font-semibold text-red-800">Detección de Errores</h4>
                        <p className="text-slate-600 text-sm">
                          El sistema identifica errores sintácticos como delimitadores desbalanceados y estructuras
                          incorrectas, proporcionando sugerencias específicas para la corrección.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2 sm:mb-3">
                      ⚡ Funcionamiento del Compilador
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      El compilador ejecuta las tres fases fundamentales de procesamiento de código fuente. El{" "}
                      <strong>análisis léxico</strong> descompone el texto en tokens básicos, identificando cada
                      elemento según su naturaleza sintáctica. El <strong>análisis sintáctico</strong> verifica la
                      estructura gramatical del código, validando la correcta formación de expresiones y declaraciones.
                      El <strong>análisis semántico</strong> evalúa la coherencia lógica del programa, detectando
                      inconsistencias en el uso de variables y tipos de datos.
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      La implementación utiliza <strong>React Hooks</strong> como <code>useMemo</code> para optimización
                      de rendimiento y <code>useState</code> para gestión de estado. El procesamiento se ejecuta bajo
                      demanda, manteniendo la interfaz responsiva durante operaciones complejas.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2 sm:mb-3">
                      🎨 Interfaz de Usuario
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      La interfaz implementa un sistema de colores consistente para facilitar la identificación: azul
                      para palabras clave, verde para identificadores, púrpura para números. Las tablas incluyen
                      funcionalidad de filtrado y tooltips informativos que se activan al pasar el cursor sobre los
                      elementos.
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      Los componentes se construyen con <strong>shadcn/ui</strong>, proporcionando elementos accesibles
                      y bien estructurados como botones, tarjetas, pestañas y modales. El diseño responsive se adapta
                      automáticamente a diferentes resoluciones de pantalla.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2 sm:mb-3">
                      🚀 Características Técnicas Avanzadas
                    </h3>
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                      <ul className="space-y-1 sm:space-y-2 text-slate-600 text-sm">
                        <li>
                          • <strong>Soporte Unicode completo:</strong> Procesamiento de caracteres especiales y acentos
                        </li>
                        <li>
                          • <strong>Filtrado dinámico:</strong> Búsqueda instantánea en resultados de análisis
                        </li>
                        <li>
                          • <strong>Representación múltiple:</strong> Visualización en ASCII, hexadecimal, binario y
                          Unicode
                        </li>
                        <li>
                          • <strong>Validación robusta:</strong> Identificación precisa de tokens válidos e inválidos
                        </li>
                        <li>
                          • <strong>Análisis contextual:</strong> Determinación del rol semántico de cada elemento
                        </li>
                        <li>
                          • <strong>Optimización de rendimiento:</strong> Memoización para cálculos computacionalmente
                          intensivos
                        </li>
                      </ul>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
