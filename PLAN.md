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

## Etapa 2 — Estructura del club · Secretario ✅
**~1 sesión · HECHA**

- **Predios**: alta, edición y baja, con la marca de enlace satelital
- **Instalaciones**: alojamientos (por noche) y espacios (canchas por hora, quinchos
  por bloque), en solapas separadas porque se reservan distinto
- **Accesos**: porterías y puntos de control, con su interruptor. El sistema **rechaza**
  configurar un Sonoff por la nube en un predio satelital
- **Actividades**: con su forma de cobro y los predios donde se dicta
- **Designaciones**: una sola pantalla que se adapta a quién mira — el Administrador
  designa Secretario y Tesorero, el Secretario al personal, el Tesorero a sus cobradores

**Queda funcionando:** el club entero se carga y configura sin tocar código, y la
cadena de designación del estatuto se puede ejercer, no sólo mirar.

Nada se borra: se da de baja. Un predio tiene años de ingresos y cobros colgando.

---

## Etapa 3 — Padrón de socios · Secretario ✅
**~1 sesión · HECHA**

- **Padrón** con búsqueda por nombre, DNI o número de socio, filtros por categoría y
  estado, y paginado de a 25 (el padrón del club llega a los cinco dígitos)
- **Seis categorías** del estatuto y **siete estados**, cada uno con su artículo a la vista
- **Grupos familiares**: crear uno nuevo, sumarse a uno existente, marcar al titular
- **Ciclo de vida** con las transiciones permitidas. Del expulsado no se vuelve (art. 29)
- **Actos estatutarios** en su propia tabla, con fecha, motivo y quién los registró
- **Detección automática** de lo que el estatuto obliga a resolver: cadetes que
  cumplieron 18, activos con 30 años de antigüedad, permisos de transeúnte vencidos
- **Importador CSV** tolerante con el archivo que salga del sistema actual, que informa
  fila por fila qué entró y qué no
- Consulta de sólo lectura para el Administrador

**Queda funcionando:** el padrón real cargado y administrable.

El acceso del socio a la plataforma es opcional: un cadete chico figura en el padrón
pero no necesita usuario.

---

## Etapa 4 — Dinero · Tesorero ✅
**~1 sesión · HECHA**

- **Tarifario** cruzando concepto × predio × condición × vigencia. Para aumentar se
  carga un precio nuevo con su fecha; el viejo queda y sigue explicando los cobros
  anteriores. Cargado con los precios reales del tarifario vigente del club
- **Cuotas**: generación mensual, condonación, y recálculo de morosidad según el art. 28
  —tres cuotas impagas emplazan—. Detecta pero no declara cesante a nadie: eso es de la
  comisión
- **Morosos**: la pantalla propia que exige el art. 46 inc. e, con cobro y asignación de
  cobrador
- **Cobros** con clave de idempotencia, para que un reintento sobre Starlink no cobre dos
  veces
- **Cajas y arqueos**: el turno se abre, acumula y se cierra declarando cuánto hay de
  cada medio. Lo declarado y lo registrado se guardan juntos; la diferencia es el dato
- **Egresos**, planilla simple
- **Cobrador** con su cartera y su rendición; **portero** con su caja y sus movimientos

**Queda funcionando:** se cobra, se rinde y se arquea.

Quién paga cuota no está en el código: sale del tarifario. Si una categoría no tiene
precio cargado, no se le genera cuota — así es como los vitalicios quedan afuera.

---

## Etapa 5 — La puerta · Portero, Control de paso y Médico ✅
**~1 sesión · HECHA**

- **Una sola función decide los ingresos** (`src/lib/acceso.ts`), probada regla por
  regla contra el estatuto. La consultan la portería y los puntos de control, y mañana
  la huella y el QR
- **Pantalla de puesto** compartida, pensada para pantalla táctil con cola de gente
  atrás: buscar, ver el cartel a media pantalla, cobrar y abrir
- **El punto de control no ve plata en ninguna parte**: es la misma pantalla con el
  cobro apagado
- **Mostrador de portería** para los conceptos sueltos del tarifario — quinchos, bajada
  de lancha, derecho de pileta, revisación
- **Enfermería**: cola de espera, emisión de aptos con vigencia, historial y vencimientos
- **Registros de ingreso** para el punto de control y para el Jefe de predio

**Queda funcionando la cadena completa:** la portería cobra la revisación → el socio
aparece en la cola del médico → el médico emite el apto → el control de la pileta lo
verifica y abre.

Todos los intentos se registran, también los rechazos: saber quién llegó sin apto o con
el permiso vencido es justamente el dato que el club necesita.

---

## Etapa 6 — Dispositivos y croquis ✅ (la mitad de plataforma)
**~1 sesión · HECHA lo que se puede hacer sin aparatos**

- **Registro único de dispositivos**: interruptores Sonoff de un canal, con su predio,
  su identificador de eWeLink, para qué son y dónde están. Los accesos ahora apuntan
  acá en vez de guardar su propia configuración
- **Filtros por propósito** para que las vistas no se mezclen
- **Testigo de tres estados**: encendido, apagado y **sin dato**. Si la última lectura
  quedó vieja se pone gris y no se deja tocar — con una bomba, operar a ciegas es peor
  que no operar
- **Croquis por sector**, con los dispositivos ubicados encima en coordenadas
  porcentuales, para que se vean igual en cualquier pantalla
- **Horarios** de encendido y apagado por día de la semana
- **Registro de quién accionó qué**, cuándo y desde dónde
- Tres roles operan —jefe de predio, maestranza y portero— pero sólo el jefe configura
- **Modo simulado** para poder ver todo funcionando sin un solo aparato conectado

### Lo que falta de esta etapa: el nodo del predio

El agente que corre en la PC de la portería **no está escrito**, porque sin un Sonoff y
un lector sobre la mesa se escribiría a ciegas y habría que rehacerlo. Le toca:

- Reportar el estado real de cada dispositivo (es lo que apaga el modo simulado)
- Recibir las órdenes pendientes de `AccionDispositivo` y ejecutarlas por la red local
- Guardar los horarios y **dispararlos él**, para que el riego no dependa del enlace
- Lector de huella ZKTeco, caché de decisión de acceso y cola de cobros sin enlace

**Queda funcionando:** toda la administración de dispositivos, y las pantallas se pueden
probar de punta a punta en modo simulado.

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
