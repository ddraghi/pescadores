# Pendientes

Lo que falta para que esto sea un sistema en producción y no una maqueta funcionando en
una máquina. Ordenado por lo que **frena**, no por lo que cuesta.

Última revisión: 19/8/2026, al cerrar la etapa 8.

---

## 1. Lo que bloquea la puesta en marcha

Nada de esto se puede saltear. Sin resolverlo, el sistema no puede atender gente.

### 1.1 El nodo del predio no está escrito

Es el pendiente más grande y el único que necesita **hardware sobre la mesa**: un Sonoff,
un lector ZKTeco y una PC haciendo de portería. El modelo de cada aparato ya está
elegido —ver el cuadro de más abajo—, así que lo que falta es comprarlos y escribir el
nodo contra ellos.

Hoy `SIMULAR_DISPOSITIVOS=true` hace que las órdenes se den por aplicadas, para poder
probar las pantallas. **Antes de producción hay que apagarlo**, y cuando se apague las
pantallas van a quedar esperando a alguien que todavía no existe.

El contrato que ese nodo tiene que cumplir (también está en `CLAUDE.md`):

- Leer `AccionDispositivo` con `aplicadaEn` nulo, ejecutar por red local y completarla.
- Reportar el estado de cada `Dispositivo` (`estado` + `estadoEn`). Es lo único que hace
  que el testigo deje de decir «sin dato».
- Bajarse `HorarioDispositivo` y **dispararlos él**. El servidor nunca dispara.
- Conexión **siempre saliente**: por el CGNAT de Starlink nadie puede entrar al predio.
- Cola local en SQLite para cobrar y abrir sin enlace, y sincronizar después en lote.

**El hardware ya está elegido** (definición del cliente, 20/8/2026):

| Dónde | Aparato | Por qué |
|---|---|---|
| Porterías | **Sonoff MINI-D** | Contacto seco con NA y NC. Las cerraduras eléctricas trabajan NA y las trabas magnéticas NC: el mismo aparato sirve para las dos sin que la plataforma tenga que saber cuál es. Y los aparatos de apertura son de 12 V, que no es lo que conmuta un interruptor de línea. |
| Luces, contactores de bombas, riego | **Sonoff BASIC-R4** | Alcanza con conmutar la línea. |

Dos cosas que se desprenden de esa elección:

- **El pulso se configura en el aparato, no acá.** La orden que manda la plataforma
  sigue siendo absoluta; cuánto dura la apertura lo resuelve el interruptor. Falta
  decidir cómo se muestra un aparato de pulso en el croquis, porque un testigo de
  encendido/apagado no es lo que corresponde a una puerta que vuelve sola.
- **El contacto seco dice cómo está el relé, no cómo está la puerta.** Si hace falta
  saber si la hoja quedó abierta, eso es un sensor aparte y hoy no está previsto en
  ningún lado.

Sobre el firmware: antes de comprar el lote hay que flashear **una** unidad de cada
modelo y confirmar que se puede. Con firmware original hay que bajar la `deviceKey` de
la nube de eWeLink una vez, con internet, y guardarla en el nodo; con Tasmota o ESPHome
no hay nube en ningún momento, que es lo que conviene con bombas y riego.

### 1.2 Huella y QR: falta el agente

El modelo ya guarda la credencial y `resolverAcceso()` ya decide. Falta el pedazo que
lee: el agente ZKTeco portado de netgym y el lector de QR. Va adentro del nodo de 1.1.

### 1.3 Servidor, dominio y base

El cliente todavía no dijo **qué hosting tiene contratado**. Hasta saberlo no se puede
elegir dónde va Postgres ni medir la latencia real desde cada predio. Lo que sí está
decidido: región São Paulo, y el proyecto se cuelga de <https://pescadores.ar> con un
botón arriba a la derecha que todavía no se hizo.

### 1.4 El padrón real

Hoy hay socios de prueba. El importador de CSV está hecho y probado, pero nadie confirmó
**de qué sistema se exporta** el padrón actual. Sin ese archivo no se puede arrancar.

### 1.5 Valores de cuota

Los que están cargados en `scripts/tarifario-inicial.ts` están **inventados** y marcados
como tales en el propio archivo. El tarifario de servicios sí es el real del club.

Ojo con esto, porque **quién paga cuota no está en el código**: sale del tarifario. Una
categoría sin precio cargado no genera cuota. Así se excluye a los vitalicios.

---

## 2. Lo que el cliente tiene que definir

Está construido alrededor de estos huecos, pero no se pueden llenar solos.

| Tema | Qué falta saber |
|---|---|
| **Maestranza** | Qué hace, además de operar dispositivos y fichar. Es el rol más flaco de los once. |
| **Concesionarios** | Qué alcance tienen. Hoy entran y no ven casi nada. |
| **Facturación ARCA** | Si hay que emitir electrónico. El modelo ya le dejó lugar en `Cobro.comprobante`. |
| **Débito automático** | Si va, y con qué banco o pasarela. |
| **Rutinas de gimnasio** | Se portan de netgym o no. Están en el menú del profesor, apagadas en etapa 9. |
| **Punto de venta** | El buffet y la proveeduría, si se manejan acá. Etapa 9. |

---

## 3. Deuda conocida

Cosas que funcionan pero no están terminadas.

- **Mercado Pago desde el panel del socio.** El cobro por mostrador está; pagar la cuota
  desde el celular, no. Cuando se haga, respetar `claveUnica`: sobre Starlink un
  reintento no puede cobrar dos veces.
- **Foto de la Sede H. Yrigoyen.** Hay una casita genérica en su lugar, como se acordó.
- **PWA y service worker.** El socio todavía no puede ver su credencial sin señal, que es
  justamente cuando la necesita: en la tranquera del Nihuil.
- **Avisos.** Se muestran en el panel, pero nadie los manda por push ni por correo.
- **Croquis.** Se suben y se ubican dispositivos encima, pero no hay forma de reemplazar
  la imagen conservando las posiciones. Hoy hay que volver a ubicar todo.
- **Arqueo de caja.** Guarda el detalle en JSON pero no imprime nada. El tesorero lo mira
  en pantalla.
- **Cesantía automática.** La regla del art. 28 está escrita y probada, pero **nadie la
  corre sola**: falta la tarea programada que emplaza a los diez días. Hoy Tesorería ve
  la nómina de morosos y actúa a mano.

---

## 4. Antes de tocar producción

Repaso corto, para no olvidarse de nada obvio.

- [ ] `SIMULAR_DISPOSITIVOS=false`.
- [ ] Cambiar **todas** las contraseñas de la semilla. Hoy son `pescadores`.
- [ ] `SESION_SECRETO` nuevo y largo, fuera del repositorio.
- [ ] Verificar que `.env` sigue ignorado y que no se coló ningún secreto en la historia.
- [ ] Volcado y restauración de Postgres probados de punta a punta: el cliente se queda
      con el proyecto y tiene que poder mudarlo.
- [ ] Los 65 pantallas contra datos reales, no de prueba.

---

## 5. Lo que está listo

Para no volver a mirarlo. Etapas 0 a 8, con la 6 hecha sólo del lado de la plataforma.

Identidad y permisos · estructura del club y designaciones · padrón con el estatuto
adentro · tesorería, tarifario y cuotas · la puerta (accesos, apto médico, cobro por
mostrador) · dispositivos y croquis · panel del socio por predio · profesores con grupos
y asistencia · barrio de viviendas del Nihuil · fichaje del personal.

`npm run probar` corre las cinco suites y no necesita base. `npm run probar:rutas`
verifica que cada ítem de menú encendido tenga su pantalla; ya evitó varios 404.
