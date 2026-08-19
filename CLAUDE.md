# Club de Pescadores San Rafael — CLAUDE.md

Plataforma de gestión de socios, predios y accesos del Club de Pescadores San Rafael
(Mendoza, fundado en 1950). Reemplaza la administración en planillas y suma control de
acceso por huella y QR en las porterías.

**Este archivo es la memoria del proyecto.** Está escrito para que una sesión nueva
entienda las convenciones sin releer el código ni volver a netgym. Mantenerlo al día.

---

## Estado

Ver `PLAN.md`. Cada etapa termina en algo usable; conviene una etapa por sesión.

**Etapas 0, 1 y 2 hechas.** Siguiente: etapa 3, padrón de socios.

Al terminar una etapa hay que subir `ETAPA_ACTUAL` en `src/lib/menus.ts`: eso enciende
solos los ítems de menú de esa etapa.

Cuentas de prueba (semilla): `admin`, `secretario`, `tesorero`, `cobrador`, `jefenihuil`,
`portero`, `control`, `maestranza`, `medico`, `profesor`, `concesion`, `socio`.
Todas con la contraseña `pescadores`.

---

## Stack

Next.js 15 (App Router, Turbopack, puerto **9010**) · React 19 · TypeScript estricto ·
PostgreSQL + Prisma · Tailwind 3 + shadcn/ui · autenticación propia (cookie firmada con
`jose` + bcrypt).

```bash
npm run dev        # desarrollo
npm run typecheck  # tsc --noEmit
npm run setup      # generate + migrate + seed (primera vez)
npm run db:seed    # resembrar
npm run db:studio  # explorar la base
```

---

## Decisiones que NO se revisan sin hablarlo

1. **Nada de Firebase.** El cliente se queda con el proyecto; Postgres se muda a
   cualquier servidor con un volcado, Firebase ata al proveedor.
2. **Cero secretos en el repositorio.** Todo por variables de entorno. Es el error que
   arrastra netgym y que acá no se repite.
3. **Los errores de tipo y de lint rompen el build.** A diferencia de netgym, que los
   ignora.
4. **Postgres también en desarrollo**, no SQLite. SQLite tiene su lugar, pero es dentro
   del nodo de portería.
5. **Identidad y ficha de socio separadas** (`Persona` / `Socio`). Una persona puede ser
   socio y ejercer un cargo; un empleado o concesionario no puede ser socio (art. 22 del
   estatuto).
6. **`src/lib/roles.ts` es la única fuente de verdad de permisos.** Nunca chequear un rol
   a mano en una pantalla: usar `puede()`, `puedeAlguno()`, `puedeDesignar()`.
7. **Cada página vuelve a exigir su capacidad** con `exigirCapacidad()`, aunque el
   middleware ya haya filtrado por ruta. El perímetro no es el control de acceso.

## Cómo está armada la sesión

`src/lib/sesion.ts` firma y verifica el token, y **no importa `next/headers` ni Prisma a
propósito**: lo usa el middleware, que corre en Edge. Todo lo que necesite leer cookies o
la base va en `src/lib/auth.ts`.

Como `jose` sí funciona en Edge, el middleware **verifica la firma**, no sólo que la
cookie exista — que es lo único que puede hacer netgym. Un token adulterado no pasa.

Las rutas de panel viven en `src/lib/rutas.ts`, en texto plano y sin importar Prisma, por
la misma razón. `roles.ts` las toma de ahí: una sola definición.

---

## El dominio sale del estatuto, no de la intuición

Los documentos oficiales están en <https://pescadores.ar>. Lo que ya está incorporado:

- **Seis categorías de socio** (art. 11): activo, cadete, vitalicio, transeúnte,
  honorario, presidente honorario. El transeúnte tiene permiso **con vencimiento**.
- **Licencia** (art. 25): no paga cuota, pero para usar las instalaciones **se lo trata
  como no socio**.
- **Cesantía** (art. 28): tres cuotas consecutivas impagas → emplazamiento a diez días →
  cesante. Es una regla programable, no una decisión discrecional.
- **El Secretario tiene a cargo el personal** (art. 43 inc. d): por eso designa a casi
  todos los roles.
- **El Tesorero debe informar la nómina de morosos** (art. 46 inc. e): es una pantalla
  propia, no un filtro escondido.
- **Barrio de fin de semana del Nihuil**: prestar la vivienda a terceros exige permiso
  con nombres declarados y **máximo 15 días**; sin eso la portería no los deja pasar
  (arts. 9 y 10 del reglamento).

---

## Los cinco predios

Son **ABM**: se agregan y se quitan sin tocar código. Nada puede quedar cableado a uno.

| Predio | Enlace | Notas |
|---|---|---|
| Sede H. Yrigoyen 3524 | terrestre | pileta, tenis, pádel, gimnasio, quinchos |
| Campo de Deportes (Rawson y Alsina) | terrestre | fútbol, hockey, rugby, pileta |
| El Nihuil | **Starlink** | camping, bungalows, cabañas, barrio de fin de semana |
| Camping Valle Grande | **Starlink** | camping |
| Lago Valle Grande | **Starlink** | camping, bajada de lanchas |

En el tarifario del club aparecen con otro nombre: «CENTRO DEPORTIVO» es el Campo de
Deportes y «PILETA (ACSR)» es la Sede.

---

## Arquitectura

**Núcleo en la nube** (Next.js + Postgres, región São Paulo) como fuente de verdad, y
**un nodo local por portería** que identifica, decide, cobra y abre sin depender del
enlace, sincronizando después.

Lo que manda sobre el diseño es **Starlink** en los tres predios remotos:

- El satélite cambia cada ~15 s y en cada handover hay un pico de latencia. En la
  tranquera importa más la consistencia que el promedio: por eso el nodo local.
- Lluvia y obstrucciones provocan microcortes de segundos a minutos.
- **CGNAT: nunca se puede entrar desde afuera** a la PC de una portería. Toda conexión
  sale del predio. Ninguna parte del sistema puede asumir que va a poder llamarla.

Consecuencias prácticas:

- **El interruptor del molinete se controla por red local** (`relay_usb` o `sonoff_lan`),
  nunca por la nube de eWeLink: con la PC y el Sonoff detrás del mismo Starlink, una
  orden por la nube sube y baja por satélite dos veces.
- **Sincronización en lotes, no charlada.** Starlink mueve bloques bien y sufre con
  muchos viajes cortos seguidos.
- **Todo cobro lleva `claveUnica`** (idempotencia): un reintento sobre un enlace
  inestable no puede cobrar dos veces.
- **Mercado Pago no funciona sin enlace.** Timeouts largos y salida clara a efectivo,
  para no dejar al portero trabado.

---

## Cómo se escribe una pantalla de administración

El patrón está en `src/app/(panel)/secretaria/predios/`. Copiarlo:

1. `page.tsx` es un componente de servidor: exige la capacidad, consulta con Prisma y
   pasa datos planos al cliente.
2. `cliente.tsx` tiene la tabla y los formularios, usando `DialogoFormulario` (se cierra
   solo al guardar, muestra el error adentro sin perder lo tipeado) y `BotonAccion`.
3. La lógica va en `src/lib/acciones/`, con `'use server'`. **Toda acción empieza
   exigiendo su capacidad**: la pantalla no es el control de acceso.
4. Las acciones devuelven `{ ok }` o `{ ok: false, error }` — nunca lanzan al formulario.
   `traducirError()` convierte los errores de Prisma en algo que una persona entiende.

Los controles de formulario (`Selector`, `Casilla`) usan los elementos nativos del
navegador en vez de Radix: mucho menos código y responden mejor al dedo en las pantallas
táctiles de las porterías.

## Convenciones

- **Todo en español**, incluidos los nombres del código: `Socio`, `Predio`, `cobrar()`.
  Es el idioma del negocio y de quien va a mantener esto.
- **Fechas** con `date-fns` y locale `es`.
- **Dinero** con `Decimal(12,2)` en la base y `pesos()` de `@/lib/utils` en pantalla.
- **Nunca borrar** socios ni personal: cambiar el estado. El padrón es histórico.
- **Todo lo que pertenece a un predio lleva `predioId`** y se filtra por el alcance del
  rol. Los roles `predio` sólo ven lo suyo.
- **Rechazos de acceso: siempre se registran.** Saber quién llegó sin apto o con la cuota
  vencida es justamente el dato que el club necesita.

---

## Diseño

Paleta del logotipo real, muestreada del archivo: rojo **#ED3237**, negro, blanco.

- **El color de acción es el negro** (blanco en tema oscuro), no el rojo. Así el rojo
  conserva peso donde importa.
- **Texto en rojo: siempre `.text-marca`**, nunca `text-accent`. El rojo puro sobre
  blanco da 3,9:1 y no llega al mínimo para texto chico.
- **Carteles de acceso** (`.cartel-ok`, `.cartel-alerta`, `.cartel-no`): señalética a
  pantalla completa, se leen a varios metros. La fuente de cada uno es la que mejor
  contrasta: blanco sobre rojo, negro sobre amarillo, negro sobre verde.
- Tipografías **Hanken Grotesk** y **Geist Mono**, las mismas que netgym.

---

## Qué se portó de netgym y qué no

netgym (`../netgym/CODIGO/NetGymV2`) es el sistema de gimnasios del mismo autor. **No
hace falta volver a leerlo**: lo que servía ya está acá.

Se porta: lenguaje visual, componentes de shadcn, agente de huella ZKTeco, control de
relay USB y Sonoff, lector de QR, Mercado Pago, PWA, calendario de reservas, rutinas.

No se porta: Firestore y su sincronización con localStorage, Firebase Auth, Genkit/IA
(descartada), la lógica multi-gimnasio, el rodeo por la nube para abrir el molinete.

---

## Pendiente de definición

Funciones de Maestranza · alcance de los Concesionarios · facturación electrónica ARCA
(el modelo de cobros ya le deja lugar en `Cobro.comprobante`) · valores de cuota por
categoría · débito automático · de qué sistema se exporta el padrón · qué servidor tiene
contratado el cliente.
