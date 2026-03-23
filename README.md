# InversorAR

Plataforma web para analizar y comparar instrumentos de renta fija del mercado argentino. Pensada para inversores de todos los niveles, con foco en claridad, precisión financiera y experiencia de uso profesional.

---

## ¿Qué hace esta app?

- **Listado de instrumentos** — bonos soberanos, letras del Tesoro y obligaciones negociables que cotizan en BYMA
- **Análisis individual** — precio de mercado, TIR (YTM), precio limpio/sucio, interés corrido, duration modificada y paridad
- **Gráfico de flujos de pago** — visualización de cupones y amortizaciones hasta el vencimiento, con valor presente de cada flujo
- **Comparador** — análisis side-by-side de hasta 5 instrumentos con tabla comparativa y curva de rendimientos
- **Calendario de pagos** — próximos cupones y amortizaciones de todos los instrumentos activos, agrupados por mes
- **Panel de administración** — carga manual de instrumentos con soporte para todos los tipos de flujo del mercado argentino

---

## Tipos de instrumentos soportados

| Estructura | Ejemplos |
|---|---|
| Bullet | Mayoría de Globales/Bonares en USD, ONs corporativas |
| Amortizable | AL30, GD35 y similares |
| Cero cupón | LECER, bonos CER cortos |
| Capitalizable | LECAP, BONCAP, algunos Bonte |
| CER | TX26, TX28, TZX27/28 |
| Dólar-linked | TZV26 y similares |

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 + TypeScript strict + Tailwind CSS |
| Gráficos | Chart.js + vue-chartjs |
| State | Pinia |
| Backend | Node.js + Fastify |
| ORM | Drizzle ORM |
| Base de datos | SQLite |
| Validación | Zod (compartido entre FE y BE) |
| Monorepo | pnpm workspaces |

---

## Estructura del proyecto

```
packages/
├── shared/          # Tipos TypeScript y schemas Zod compartidos entre FE y BE
├── backend/         # API REST (Fastify + Drizzle + SQLite)
│   └── src/
│       ├── modules/
│       │   ├── instruments/     # CRUD de instrumentos
│       │   ├── bonds/           # Calculador financiero + endpoint de análisis
│       │   ├── byma/            # Cliente BYMA (mock ahora, oficial en Fase 2)
│       │   ├── compare/         # Comparador multi-instrumento
│       │   ├── calendar/        # Calendario de pagos
│       │   ├── fx/              # Tipo de cambio ARS/USD
│       │   ├── flow-generator/  # Generador de flujos de pago por tipo
│       │   └── admin/           # Panel de administración (protegido por token)
│       └── db/                  # Schema Drizzle + migraciones + seed
└── frontend/        # App Vue 3
    └── src/
        ├── views/           # HomeView, InstrumentView, CompareView, CalendarView, AdminView
        ├── components/      # Componentes reutilizables (charts, instruments, compare, ui)
        ├── stores/          # Pinia stores (theme, currency)
        ├── composables/     # useFormat (fechas, números, porcentajes)
        └── services/        # API client (backend + admin)
```

---

## Requisitos

- Node.js >= 20
- pnpm >= 9

---

## Instalación

```bash
git clone https://github.com/zetaele/investor-app.git
cd investor-app
pnpm install
```

---

## Configuración

```bash
cp packages/backend/.env.example packages/backend/.env
```

Editá el archivo `.env` con tus valores:

```
DATABASE_URL=./data/app.db
BYMA_API_BASE_URL=https://api.byma.com.ar
BYMA_API_KEY=tu_clave_byma
ADMIN_TOKEN=token_secreto_para_el_admin
CORS_ORIGIN=http://localhost:5173
```

---

## Desarrollo

```bash
# Levanta backend (puerto 3001) y frontend (puerto 5173) en paralelo
pnpm dev

# Solo backend
pnpm --filter backend dev

# Solo frontend
pnpm --filter frontend dev
```

---

## Base de datos

```bash
# Aplicar migraciones
pnpm --filter backend db:migrate

# Cargar datos iniciales de ejemplo
pnpm --filter backend db:seed

# Explorador visual (Drizzle Studio)
pnpm --filter backend db:studio
```

---

## Panel de administración

El panel de admin está disponible en `http://localhost:5173/admin`. Requiere el token configurado en `ADMIN_TOKEN`.

Desde el admin podés:
- Cargar nuevos instrumentos con su estructura de flujo
- Previsualizar los flujos de pago antes de confirmar
- Desactivar instrumentos vencidos o incorrectos

---

## Fuente de datos

En la **Fase 1** los precios de mercado provienen de un cliente mock con valores aproximados hardcodeados. La arquitectura está preparada para reemplazarlo por el cliente oficial de BYMA sin tocar ningún otro módulo — solo cambia una línea en `app.ts`.

---

## Roadmap

- [ ] Integración con API oficial de BYMA (precios en tiempo real)
- [ ] Autenticación de usuarios
- [ ] Modelo de suscripción (planes Free / Pro / Advanced)
- [ ] Simulador de precio manual (¿qué TIR obtengo si compro a X precio?)
- [ ] Responsive mobile
- [ ] Calendario de feriados para ajuste de fechas de cupón
- [ ] Soporte para bonos en pesos con ajuste CER en tiempo real (INDEC API)

---

## Licencia

Propietaria. Todos los derechos reservados.
