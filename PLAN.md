# Plan de implementación — Plataforma Club de Pescadores

Cada etapa termina en un estado **usable y demostrable**. Si se corta el trabajo al
final de cualquier etapa, lo hecho sirve igual y lo que sigue no obliga a rehacerlo.
El orden no es caprichoso: cada etapa habilita a la siguiente.

Estimación en sesiones: orientativa, para dosificar el gasto.

---

## Etapa 0 — Cimientos ✅
**~1 sesión · HECHA**

Repositorio, Next.js 15 + TypeScript + Tailwind, sistema de diseño con la paleta del
club, esquema completo de base en Prisma/PostgreSQL, semilla con los cinco predios
reales, y este plan.

**Queda funcionando:** `npm run dev` levanta, la base migra y se siembra.

---

## Etapa 1 — Identidad y permisos ✅
**~1 sesión · HECHA**

- Login único que resuelve el rol y redirige al panel que corresponde
- Sesión con cookie firmada (`jose`) + middleware que **verifica la firma** en Edge
- Doce paneles, uno por rol, cada uno exigiendo su capacidad
- Barra lateral por rol con el menú completo: lo construido enlaza, lo pendiente se
  muestra apagado con su número de etapa
- Cambio de rol para quien acumula más de uno
- Tema claro y oscuro

**Queda funcionando:** entrás con cualquier rol y ves lo tuyo, y sólo lo tuyo.

---

## Etapa 2 — Estructura del club · Secretario
**~1-2 sesiones**

ABM de predios, alojamientos, espacios (canchas y quinchos), accesos (portería y
puntos de control) y actividades. Más el ABM del staff con sus roles y predios.

**Queda funcionando:** el club entero queda cargado y configurable sin tocar código.

---

## Etapa 3 — Padrón de socios · Secretario
**~2 sesiones**

ABM de socios, seis categorías, grupos familiares, importador CSV, y el ciclo de vida
estatutario: admisión, licencia, emplazamiento a las tres cuotas, cesantía, reingreso.

**Queda funcionando:** el padrón real cargado y administrable.

---

## Etapa 4 — Dinero · Tesorero
**~2-3 sesiones**

Tarifario multidimensional (concepto × predio × condición × vigencia), cuotas,
cobros, cajas con arqueo por medio de pago, egresos, y el sub-rol Cobrador con su
cartera y su rendición.

**Queda funcionando:** se cobra, se rinde y se arquea. Es la etapa más grande.

---

## Etapa 5 — La puerta · Portero, Control de paso y Médico
**~2 sesiones**

La función única de decisión de acceso, la pantalla de portería con cobro, la pantalla
de punto de control, y la cola y los aptos del médico.

**Queda funcionando:** la cadena completa — se cobra la revisación, el médico autoriza,
el control de la pileta lee y abre.

---

## Etapa 6 — Dispositivos y modo desconectado
**~2 sesiones · requiere hardware a mano**

Agente local del predio: lector de huella ZKTeco, relay USB y Sonoff **por red local**,
caché de decisión y cola de escritura para operar sin depender del enlace.

**Queda funcionando:** una portería real abre la barrera, con Starlink caído incluido.

---

## Etapa 7 — Socios y reservas
**~2-3 sesiones**

Aplicación del socio como PWA: credencial QR que anda sin señal, cuota e historial,
pago por Mercado Pago, reservas de canchas, quinchos y alojamiento. Panel del Jefe de
predio con calendario, disponibilidad y reservas prioritarias.

**Queda funcionando:** los socios usan la aplicación desde el celular.

---

## Etapa 8 — Lo que quedó para el final
**~2-3 sesiones**

Profesores con grupos y rutinas, barrio de viviendas de fin de semana, Maestranza y
Concesionarios (ambos pendientes de definición funcional).

---

## Cómo no gastar de más

1. **Una etapa por sesión.** Empezar una sesión nueva en cada etapa: el contexto arranca
   limpio y no se paga por arrastrar lo anterior.
2. **`CLAUDE.md` es la memoria del proyecto.** Está escrito para que una sesión nueva
   entienda las convenciones sin releer el código. Mantenerlo al día es lo que más
   ahorra.
3. **No volver a netgym.** Todo lo que había que sacar de ahí ya está acá. Releerlo
   cuesta caro y no aporta.
4. **Decidir antes de pedir.** Las preguntas abiertas de este plan (facturación ARCA,
   valores de cuota, funciones de Maestranza) conviene traerlas resueltas.
