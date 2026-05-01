# InversorAR

Plataforma web para analizar y comparar instrumentos de renta fija del mercado argentino. Pensada para inversores que necesitan métricas financieras precisas, precios de mercado en tiempo real y una interfaz clara para tomar decisiones informadas.

---

## ¿Qué hace esta app?

- **Listado de instrumentos** — bonos soberanos, letras del Tesoro y obligaciones negociables que cotizan en BYMA, con precios en tiempo real
- **Análisis individual** — TIR (convención TIREA), precio limpio/sucio, interés corrido, duration modificada, paridad, TNA y current yield
- **Gráfico de flujos de pago** — visualización apilada de cupones y amortizaciones hasta el vencimiento
- **Simulador bidireccional** — ingresá un precio para obtener la TIR, o una TIR para obtener el precio teórico
- **Curvas de rendimiento** — TIR vs. duration modificada agrupadas por categoría de instrumento
- **Comparador** — tabla comparativa de métricas side-by-side para hasta 5 instrumentos
- **Calendario de pagos** — próximos cupones y amortizaciones de todos los instrumentos activos, agrupados por mes
- **Cotización del dólar** — tipos oficial, blue, MEP y CCL vía dolarapi.com
- **Seguimiento de cartera** — registrá posiciones por valor nominal con análisis integrado
- **Panel de administración** — gestioná instrumentos y flujos de pago sin necesidad de un cliente de base de datos

---

## Tipos de instrumentos soportados

| Estructura    | Ejemplos                                             |
|---------------|------------------------------------------------------|
| Bullet        | Globales / Bonares (USD), mayoría de ONs corporativas |
| Amortizable   | AL30, GD35, DICP, PARP y similares                   |
| Cero cupón    | LECER, bonos CER cortos                              |
| Capitalizable | LECAP, BONCAP, algunos Bonte                         |
| CER           | TX26, TX28, TZXD6/M7 y similares                    |
| Dólar-linked  | TZV26 y similares                                    |
| TAMAR         | Bonos y letras tasa flotante                         |
| Dual          | Bonos duales (pata CAP + pata TAMAR)                 |

---

## Stack tecnológico

| Capa       | Tecnología                                         |
|------------|----------------------------------------------------|
| Frontend   | Vue 3 · TypeScript (strict) · Vite                 |
| State      | Pinia                                              |
| Gráficos   | Chart.js + vue-chartjs                             |
| Backend    | Node.js · Fastify                                  |
| ORM        | Drizzle ORM                                        |
| Base datos | SQLite                                             |
| Validación | Zod (compartido entre frontend y backend)          |
| Auth       | Google OAuth 2.0 + sesiones con cookie HttpOnly    |
| Monorepo   | pnpm workspaces                                    |

---

## Estructura del proyecto

```
packages/
├── shared/               # Tipos TypeScript y schemas Zod compartidos
├── backend/
│   └── src/
│       ├── modules/
│       │   ├── instruments/      # CRUD e repositorio de instrumentos
│       │   ├── bonds/            # Calculador financiero + endpoint de análisis
│       │   ├── byma/             # Precios: cliente live, fallback mock, caché SQLite
│       │   ├── fx/               # Tipos de cambio ARS/USD con caché
│       │   ├── compare/          # Comparación multi-instrumento
│       │   ├── calendar/         # Calendario de pagos próximos
│       │   ├── portfolio/        # Seguimiento de cartera
│       │   ├── flow-generator/   # Generador de flujos por tipo de instrumento
│       │   ├── admin/            # API del panel de administración (token-protected)
│       │   └── auth/             # Google OAuth + gestión de sesiones
│       └── db/                   # Schema Drizzle, migraciones, seed
└── frontend/
    └── src/
        ├── views/                # Un componente por ruta
        ├── components/           # UI reutilizable: charts, cards, tabla comparativa
        ├── stores/               # Pinia: auth, currency, portfolio, theme
        ├── composables/          # useFormat (números, fechas, rendimientos)
        └── services/             # Cliente de API tipado
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

Copiá el archivo de entorno del backend y completá tus valores:

```bash
cp packages/backend/.env.example packages/backend/.env
```

Variables de entorno principales:

```env
DATABASE_URL=./data/app.db
SESSION_SECRET=tu_session_secret
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/callback
ADMIN_TOKEN=tu_token_admin
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

# Cargar datos iniciales
pnpm --filter backend db:seed

# Explorador visual (Drizzle Studio)
pnpm --filter backend db:studio
```

---

## Notas de arquitectura

### Pipeline de precios

Los precios de mercado se obtienen a través de una cadena de tres capas:

```
FallbackBymaClient
  ├── primario:  Data912Client   (feed en vivo de BYMA)
  └── fallback:  MockBymaClient  (precios estáticos para instrumentos ilíquidos)
        └── PriceCacheService    (caché SQLite, TTL de 5 minutos)
```

Si un ticker no aparece en el feed en vivo (`BymaInstrumentNotFoundError`), el fallback sirve un precio de referencia estático. Esto mantiene instrumentos líquidos e ilíquidos en la misma superficie de API sin lógica especial en el dominio.

### Cálculo de TIR

La TIR se resuelve con Newton-Raphson (tolerancia `1e-7`, converge en ~10 iteraciones). La implementación sigue la **convención TIREA argentina**: el rendimiento se resuelve contra el **precio limpio** (cotizado), no el sucio — igual que el estándar de BYMA, CNV y las principales plataformas de brokers.

### Bonos CER

Los flujos de bonos ajustables por CER (TX26, TX28, DICP, etc.) se guardan en unidades nominales de VN para facilitar el mantenimiento del seed. En tiempo de análisis el servicio aplica un `cerScale = VT_actual / nominalFace` para convertirlos a ARS actuales antes de ejecutar el solver, garantizando unidades consistentes en todos los tipos de bono.

### Tipos compartidos

El paquete `shared` es la fuente de verdad para todos los contratos de datos (`InstrumentAnalysis`, `Cashflow`, `FxRates`, etc.). Frontend y backend importan del mismo módulo, por lo que una incompatibilidad entre la respuesta de la API y el consumo en la UI es un error de compilación, no de runtime.

---

## Panel de administración

Disponible en `http://localhost:5173/admin`. Requiere el `ADMIN_TOKEN` configurado en el `.env` del backend.

Desde el admin podés:
- Crear instrumentos y definir su estructura de flujos de pago
- Previsualizar los flujos generados antes de guardar
- Editar o desactivar instrumentos existentes

---

## Autenticación

Los usuarios se autentican vía Google OAuth 2.0. Al completar el flujo, se crea una sesión server-side cuyo UUID se envía como cookie `HttpOnly` — sin tokens en `localStorage`. Las sesiones se validan en cada request protegido mediante un preHandler hook de Fastify.

Se soportan dos planes: `TRIAL` (con vencimiento configurable) y `PRO`.

---

## Licencia

Propietaria. Todos los derechos reservados.
